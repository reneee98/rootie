import { beforeEach, describe, expect, it, vi } from "vitest";
import { publishListing, type CreateListingInput } from "@/lib/actions/create-listing";
import { createWantedThreadWithOffer } from "@/lib/actions/wanted-thread";
import { findOrCreateThread } from "@/lib/thread-create";

const mocks = vi.hoisted(()=> ({from:vi.fn(), user:{id:"00000000-0000-4000-8000-000000000001"}}));
vi.mock("@/lib/auth",()=>({getUser:vi.fn(async()=>mocks.user),requireUser:vi.fn(async()=>mocks.user)}));
vi.mock("@/lib/supabaseClient",()=>({createSupabaseServerClient:vi.fn(async()=>({from:mocks.from}))}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));

function query(result: unknown) {
  const builder: Record<string, unknown> = {then:(resolve: (value:unknown)=>unknown)=>Promise.resolve(result).then(resolve)};
  for (const name of ["insert","delete","update","select","eq","maybeSingle","single"]) builder[name]=vi.fn(()=>builder);
  return builder;
}
const input: CreateListingInput = {
  type:"fixed",swapEnabled:false,category:"plant",plantName:"Monstera",plantTaxonId:null,condition:"",size:"",notes:"",
  region:"Bratislavský kraj",district:"",fixedPrice:10,auctionStartPrice:null,auctionMinIncrement:null,auctionEndsAt:null,
  photoUrls:[`https://test.supabase.co/storage/v1/object/public/listing-photos/${mocks.user.id}/photo.jpg`],
};
beforeEach(()=>{mocks.from.mockReset();vi.stubEnv("SUPABASE_URL","https://test.supabase.co");});

describe("publication and offer actions",()=> {
  it("returns failure and removes the incomplete listing when photo insertion fails",async()=>{
    const listing=query({data:{id:"listing-id"},error:null});
    const photos=query({error:{message:"storage metadata failed"}});
    const cleanup=query({error:null});
    mocks.from.mockReturnValueOnce(listing).mockReturnValueOnce(photos).mockReturnValueOnce(cleanup);
    const log=vi.spyOn(console,"error").mockImplementation(()=>{});
    try {
      expect((await publishListing(input)).ok).toBe(false);
      expect(cleanup.delete).toHaveBeenCalledOnce();
      expect(mocks.from.mock.calls.map(([table])=>table)).toEqual(["listings","listing_photos","listings"]);
    } finally {log.mockRestore();}
  });
  it("sends the wanted offer even when its conversation already exists",async()=>{
    const wanted=query({data:{id:"wanted-id",user_id:"other-user",status:"active"},error:null});
    const existing=query({data:{id:"existing-thread"},error:null});
    const message=query({error:null});
    mocks.from.mockReturnValueOnce(wanted).mockReturnValueOnce(existing).mockReturnValueOnce(message);
    expect(await createWantedThreadWithOffer("wanted-id","price",12.5)).toEqual({ok:true,threadId:"existing-thread"});
    expect(message.insert).toHaveBeenCalledWith(expect.objectContaining({thread_id:"existing-thread",message_type:"offer_price",metadata:{amount_eur:12.5}}));
  });
  it("reuses the winning insert when two thread creations race",async()=>{
    mocks.from.mockReturnValueOnce(query({data:null,error:null}))
      .mockReturnValueOnce(query({data:null,error:{code:"23505"}}))
      .mockReturnValueOnce(query({data:{id:"winning-thread"},error:null}));
    const supabase = {from:mocks.from} as unknown as Parameters<typeof findOrCreateThread>[0];
    expect(await findOrCreateThread(supabase,{context_type:"listing",listing_id:"listing-id",wanted_request_id:null,user1_id:"buyer",user2_id:"seller"})).toBe("winning-thread");
  });
});
