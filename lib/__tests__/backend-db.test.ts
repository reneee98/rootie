import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

const id = (value: number) => `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const seller = id(1), buyer = id(2), rival = id(3), stranger = id(4);
const listing = id(10), auction = id(11), thread = id(20), rivalThread = id(21), offer = id(30), rivalOffer = id(31);
let db: PGlite;

async function actor(user: string | null, role = "authenticated") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? ""]);
  if (user || role !== "authenticated") await db.exec(`set local role ${role}`);
}
async function rejected(sql: string, params: unknown[] = [], message?: string) {
  await db.exec("savepoint rejected_action");
  let error: unknown;
  try { await db.query(sql, params); } catch (caught) { error = caught; }
  await db.exec("rollback to rejected_action; release rejected_action");
  expect(error).toBeDefined();
  if (message) expect((error as Error).message).toContain(message);
}
async function accept() {
  await actor(seller);
  await db.query("select public.perform_order_action($1, 'accept_price', $2)", [thread, offer]);
}
async function deliver() {
  await accept();
  await actor(buyer);
  await db.query("select public.perform_order_action($1, 'address', null, $2)", [thread, {name:"Buyer",street:"Street 1",city:"Bratislava",zip:"81101",country:"Slovensko"}]);
  await actor(seller);
  await db.query("select public.perform_order_action($1, 'shipped')", [thread]);
  await actor(buyer);
  await db.query("select public.perform_order_action($1, 'delivered')", [thread]);
}

describe("backend integrity with real Postgres migrations", () => {
  beforeAll(async () => {
    db = new PGlite();
    // Minimal Supabase platform objects; no external connection or user records.
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key, email text, phone text, phone_confirmed_at timestamptz, raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
      create schema storage; create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text);
      create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1, '/') $$;
      create publication supabase_realtime;
      grant usage on schema public, auth, storage to anon, authenticated, service_role;
      alter default privileges in schema public grant all on tables to authenticated, service_role;
      alter default privileges in schema public grant select on tables to anon;`);
    const directory = path.resolve("supabase/migrations");
    for (const filename of (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort()) {
      const sql = (await readFile(path.join(directory, filename), "utf8")).replace('create extension if not exists "uuid-ossp";', "");
      await db.exec(sql);
    }
    await db.query("insert into auth.users(id) values ($1),($2),($3),($4)", [seller,buyer,rival,stranger]);
  }, 30000);
  beforeEach(async () => {
    await db.exec("begin");
    await actor(null);
    await db.query(`insert into public.listings(id,seller_id,type,plant_name,region,fixed_price,swap_enabled)
      values ($1,$2,'fixed','Monstera','Bratislavský kraj',10,true)`, [listing,seller]);
    await db.query(`insert into public.listings(id,seller_id,type,plant_name,region,auction_start_price,auction_min_increment,auction_ends_at)
      values ($1,$2,'auction','Hoya','Bratislavský kraj',10,1,now()+interval '1 hour')`, [auction,seller]);
    await db.query(`insert into public.threads(id,context_type,listing_id,user1_id,user2_id)
      values ($1,'listing',$2,$3,$4),($5,'listing',$2,$3,$6)`, [thread,listing,seller,buyer,rivalThread,rival]);
    await db.query(`insert into public.messages(id,thread_id,sender_id,body,message_type,metadata)
      values ($1,$2,$3,'12','offer_price','{"amount_eur":12}'),($4,$5,$6,'15','offer_price','{"amount_eur":15}')`, [offer,thread,buyer,rivalOffer,rivalThread,rival]);
  });
  afterEach(async () => { await db.exec("rollback"); });
  afterAll(async () => { await db.close(); });

  it("rejects moderator escalation and falsified reputation through the direct API", async () => {
    await actor(buyer);
    await rejected("update profiles set is_moderator=true where id=$1", [buyer], "moderator");
    await db.query("update profiles set ratings_count=900,ratings_avg=5,active_listings_count=100,sold_count=500 where id=$1", [buyer]);
    const result = await db.query("select ratings_count,ratings_avg,active_listings_count,sold_count from profiles where id=$1",[buyer]);
    expect(result.rows[0]).toEqual({ratings_count:0,ratings_avg:null,active_listings_count:0,sold_count:0});
  });

  it("repairs historical profile counters and unsupported phone verification", async () => {
    await db.query("update profiles set ratings_count=900,ratings_avg=5,active_listings_count=100,sold_count=500,phone='+421900111222',phone_verified=true where id=$1", [seller]);
    const backfill = await readFile(path.resolve("supabase/migrations/20261003080000_profile_derived_stats_backfill.sql"), "utf8");
    await db.exec(backfill);
    expect((await db.query("select ratings_count,ratings_avg,active_listings_count,sold_count,phone_verified from profiles where id=$1", [seller])).rows[0])
      .toEqual({ratings_count:0,ratings_avg:null,active_listings_count:2,sold_count:0,phone_verified:false});
  });

  it("runs the cloud smoke script without leaving fixture records", async () => {
    await db.query("update auth.users set email=case id when $1 then 'predajca@test.rootie.sk' when $2 then 'kupujuci@test.rootie.sk' end where id in ($1,$2)", [seller,buyer]);
    const counts = "select (select count(*)::int from listings) as listings,(select count(*)::int from orders) as orders,(select count(*)::int from threads) as threads,(select count(*)::int from messages) as messages,(select count(*)::int from bids) as bids,(select count(*)::int from reviews) as reviews";
    const before = (await db.query(counts)).rows;
    const smoke = await db.exec(await readFile(path.resolve("scripts/verify-cloud-integrity.sql"), "utf8"));
    expect(smoke.at(-1)?.rows[0]).toEqual({cloud_smoke:{orders:true,idempotent_retries:true,shipping_and_review:true,bids:true,auction_finalization:true,fixtures_rolled_back:true}});
    expect((await db.query(counts)).rows).toEqual(before);
  });

  it("keeps private phones out of public queries and returns only explicit opt-in", async () => {
    await db.query("update profiles set phone='+421900111222',phone_verified=true where id=$1", [seller]);
    await actor(null,"anon");
    await rejected("select phone from profiles where id=$1",[seller],"permission denied");
    expect((await db.query("select get_profile_phone($1) as phone",[seller])).rows[0]).toEqual({phone:null});
    await actor(seller);
    expect((await db.query("select get_my_profile_phone() as data")).rows[0]).toMatchObject({data:{phone:"+421900111222"}});
  });

  it("derives verification from auth and clears it after a phone change", async () => {
    await db.query("update auth.users set phone='421900111222',phone_confirmed_at=now() where id=$1",[buyer]);
    await actor(buyer);
    await db.query("select sync_phone_verified_from_auth()");
    expect((await db.query("select phone_verified from profiles where id=$1",[buyer])).rows[0]).toEqual({phone_verified:true});
    await db.query("update profiles set phone='+421900333444',phone_verified=true where id=$1",[buyer]);
    expect((await db.query("select phone_verified from profiles where id=$1",[buyer])).rows[0]).toEqual({phone_verified:false});
  });

  it("checks the start price, own bids and current minimum through direct inserts", async () => {
    await actor(buyer);
    await rejected("insert into bids(listing_id,bidder_id,amount) values ($1,$2,9)",[auction,buyer],"Minimum bid");
    await db.query("insert into bids(listing_id,bidder_id,amount) values ($1,$2,10)",[auction,buyer]);
    await actor(rival);
    await rejected("insert into bids(listing_id,bidder_id,amount) values ($1,$2,10.50)",[auction,rival],"Minimum bid");
    await actor(seller);
    await rejected("insert into bids(listing_id,bidder_id,amount) values ($1,$2,99)",[auction,seller],"own auction");
  });

  it("rejects bids after expiry and blocks banned users", async () => {
    await db.query("update listings set auction_ends_at=now()-interval '1 second' where id=$1",[auction]);
    await actor(buyer);
    await rejected("insert into bids(listing_id,bidder_id,amount) values ($1,$2,10)",[auction,buyer],"not active");
  });

  it("makes recipient blocks effective even though block rows are private", async () => {
    await actor(seller);
    await db.query("insert into blocks(blocker_id,blocked_id) values($1,$2)",[seller,buyer]);
    await actor(buyer);
    expect((await db.query("select * from blocks")).rows).toEqual([]);
    await rejected("insert into messages(thread_id,sender_id,body) values($1,$2,'hello')",[thread,buyer],"blocked");
  });

  it("rejects hijacking a thread or attaching a listing to unrelated participants", async () => {
    await actor(buyer);
    await rejected("update threads set user2_id=$1 where id=$2",[stranger,thread],"participants cannot change");
    await rejected("insert into threads(context_type,listing_id,user1_id,user2_id) values('listing',$1,$2,$3)",[listing,buyer,stranger],"seller must be");
  });

  it("enforces one conversation per unordered context pair", async () => {
    await rejected("insert into threads(context_type,listing_id,user1_id,user2_id) values('listing',$1,$2,$3)",[listing,buyer,seller],"duplicate key");
  });

  it("atomically reserves a listing and emits its accepted state", async () => {
    await accept();
    expect((await db.query("select status,accepted_price_eur from orders where thread_id=$1",[thread])).rows[0]).toEqual({status:"price_accepted",accepted_price_eur:"12.00"});
    expect((await db.query("select status from listings where id=$1",[listing])).rows[0]).toEqual({status:"reserved"});
    expect((await db.query("select metadata->>'order_status' as status from messages where message_type='order_status'")).rows).toEqual([{status:"price_accepted"}]);
  });

  it("rejects a second accepted buyer for the same listing", async () => {
    await accept();
    await rejected("select perform_order_action($1,'accept_price',$2)",[rivalThread,rivalOffer]);
    expect((await db.query("select count(*)::int as count from orders")).rows[0]).toEqual({count:1});
  });

  it("rolls back the order and listing when its status message fails", async () => {
    await db.exec(`create function reject_status_for_test() returns trigger language plpgsql as $$ begin
      if new.message_type='order_status' then raise exception 'simulated message failure'; end if; return new; end $$;
      create trigger reject_status_for_test before insert on messages for each row execute function reject_status_for_test();`);
    await actor(seller);
    await rejected("select perform_order_action($1,'accept_price',$2)",[thread,offer],"simulated message failure");
    expect((await db.query("select count(*)::int as count from orders")).rows[0]).toEqual({count:0});
    expect((await db.query("select status from listings where id=$1",[listing])).rows[0]).toEqual({status:"active"});
  });

  it("protects price, address and shipment fields from the wrong participant", async () => {
    await accept();
    await actor(buyer);
    await rejected("update orders set status='address_provided',shipping_address='{}',accepted_price_eur=1 where thread_id=$1",[thread],"permission denied");
    await actor(seller);
    await rejected("update orders set shipping_address='{}' where thread_id=$1",[thread],"permission denied");
  });

  it("validates shipping address inside the RPC and prevents premature delivery", async () => {
    await accept();
    await actor(buyer);
    await rejected("select perform_order_action($1,'address',null,$2)",[thread,{name:"",street:5,city:"City",zip:"81101",country:"SK"}],"povinné");
    await rejected("select perform_order_action($1,'delivered')",[thread],"po odoslaní");
  });

  it("permits a delivered buyer review and updates truthful seller stats", async () => {
    await deliver();
    await db.query("insert into reviews(reviewer_id,seller_id,listing_id,thread_id,rating,body) values($1,$2,$3,$4,5,'Great')",[buyer,seller,listing,thread]);
    expect((await db.query("select ratings_count,ratings_avg,sold_count from profiles where id=$1",[seller])).rows[0]).toEqual({ratings_count:1,ratings_avg:"5.00",sold_count:1});
    await rejected("update orders set status='cancelled' where thread_id=$1",[thread],"permission denied");
  });

  it("prevents direct API review eligibility bypass", async () => {
    await actor(buyer);
    await rejected("insert into reviews(reviewer_id,seller_id,listing_id,thread_id,rating) values($1,$2,$3,$4,5)",[buyer,seller,listing,thread],"delivered");
  });

  it("finalizes auctions into an accessible order exactly once", async () => {
    await actor(buyer);
    await db.query("insert into bids(listing_id,bidder_id,amount) values($1,$2,10)",[auction,buyer]);
    await actor(null);
    await db.query("update listings set auction_ends_at=now()-interval '1 second' where id=$1",[auction]);
    await actor(null,"service_role");
    expect((await db.query("select finalize_ended_auctions() as result")).rows[0]).toEqual({result:{finalized:1,expired:0}});
    expect((await db.query("select finalize_ended_auctions() as result")).rows[0]).toEqual({result:{finalized:0,expired:0}});
    await actor(buyer);
    expect((await db.query("select status from listings where id=$1",[auction])).rows[0]).toEqual({status:"reserved"});
    expect((await db.query("select status,accepted_price_eur from orders where listing_id=$1",[auction])).rows[0]).toEqual({status:"price_accepted",accepted_price_eur:"10.00"});
  });

  it("denies unauthenticated and regular-user auction finalization", async () => {
    await actor(buyer);
    await rejected("select finalize_ended_auctions()",[],"permission denied");
    await actor(null,"anon");
    await rejected("select finalize_ended_auctions()",[],"permission denied");
  });

  it("lets only the buyer recipient accept a real seller counteroffer", async () => {
    await actor(seller);
    const counterId = id(32);
    await db.query("insert into messages(id,thread_id,sender_id,body,message_type,metadata) values($1,$2,$3,'14','offer_price',$4)",
      [counterId,thread,seller,{amount_eur:14,counter_to_message_id:offer}]);
    await rejected("select perform_order_action($1,'accept_price',$2)",[thread,counterId],"kupujúci");
    await actor(buyer);
    await db.query("select perform_order_action($1,'accept_price',$2)",[thread,counterId]);
    expect((await db.query("select accepted_price_eur from orders where thread_id=$1",[thread])).rows[0]).toEqual({accepted_price_eur:"14.00"});
  });

  it("does not duplicate state messages on retries", async () => {
    await accept();
    await db.query("select perform_order_action($1,'accept_price',$2)",[thread,offer]);
    expect((await db.query("select count(*)::int as count from messages where message_type='order_status'")).rows[0]).toEqual({count:1});
    await actor(buyer);
    await db.query("select perform_order_action($1,'address',null,$2)",[thread,{name:"Buyer",street:"Street 1",city:"Bratislava",zip:"81101",country:"SK"}]);
    await actor(seller);
    await db.query("select perform_order_action($1,'shipped')",[thread]);
    await actor(buyer);
    await db.query("select perform_order_action($1,'delivered')",[thread]);
    await db.query("select perform_order_action($1,'delivered')",[thread]);
    expect((await db.query("select count(*)::int as count from messages where metadata->>'order_status'='delivered'")).rows[0]).toEqual({count:1});
  });

  it("does not reopen a reserved listing through another negotiating order", async () => {
    await accept();
    await actor(null);
    await rejected("insert into orders(thread_id,listing_id,buyer_id,seller_id,status) values($1,$2,$3,$4,'negotiating')",
      [rivalThread,listing,rival,seller],"available");
    expect((await db.query("select status from listings where id=$1",[listing])).rows[0]).toEqual({status:"reserved"});
  });

  it("keeps a shipped then cancelled listing reserved on repeated updates", async () => {
    await accept();
    await actor(buyer);
    await db.query("select perform_order_action($1,'address',null,$2)",[thread,{name:"Buyer",street:"Street 1",city:"Bratislava",zip:"81101",country:"SK"}]);
    await actor(seller);
    await db.query("select perform_order_action($1,'shipped')",[thread]);
    await actor(null);
    await db.query("update orders set status='cancelled' where thread_id=$1",[thread]);
    await db.query("update orders set status='cancelled' where thread_id=$1",[thread]);
    expect((await db.query("select status from listings where id=$1",[listing])).rows[0]).toEqual({status:"reserved"});
  });

  it("finalizes a legacy winner thread with a negotiating order", async () => {
    await actor(buyer);
    await db.query("insert into bids(listing_id,bidder_id,amount) values($1,$2,10)",[auction,buyer]);
    await actor(null);
    const legacyThread=id(22);
    await db.query("insert into threads(id,context_type,listing_id,user1_id,user2_id) values($1,'listing',$2,$3,$4)",[legacyThread,auction,seller,buyer]);
    await db.query("insert into orders(thread_id,listing_id,buyer_id,seller_id,status) values($1,$2,$3,$4,'negotiating')",[legacyThread,auction,buyer,seller]);
    await db.query("update listings set auction_ends_at=now()-interval '1 second' where id=$1",[auction]);
    await actor(null,"service_role");
    expect((await db.query("select finalize_ended_auctions() as result")).rows[0]).toEqual({result:{finalized:1,expired:0}});
    expect((await db.query("select status from orders where thread_id=$1",[legacyThread])).rows[0]).toEqual({status:"price_accepted"});
  });

  it("does not allow backdated messages to bypass the send rate limit", async () => {
    await actor(buyer);
    for (let index=0;index<29;index++) await db.query("insert into messages(thread_id,sender_id,body,created_at) values($1,$2,'Hello','1900-01-01')",[thread,buyer]);
    // The seeded first offer is also a message sent in this minute.
    await rejected("insert into messages(thread_id,sender_id,body,created_at) values($1,$2,'Too many','1900-01-01')",[thread,buyer],"Too many");
    expect((await db.query("select count(*)::int as count from messages where sender_id=$1 and created_at<'2000-01-01'",[buyer])).rows[0]).toEqual({count:0});
  });
});
