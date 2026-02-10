#!/usr/bin/env node
/**
 * Seed 20+ listings with photos for local development.
 * Requires test users to exist (run: npm run seed:users first).
 * Uses Picsum Photos (real photos) for listing_photos URLs.
 * Run: node scripts/seed-listings.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const TEST_USER_EMAILS = [
  "predajca@test.rootie.sk",
  "kupujuci@test.rootie.sk",
  "druhy@test.rootie.sk",
];

const REGIONS = [
  "Bratislavský kraj",
  "Trnavský kraj",
  "Trenčiansky kraj",
  "Nitriansky kraj",
  "Žilinský kraj",
  "Banskobystrický kraj",
  "Prešovský kraj",
  "Košický kraj",
];

// Picsum Photos image IDs (real photos from Unsplash) – varied for plants/nature/indoor
const PICSUM_IDS = [
  10, 14, 15, 16, 17, 18, 20, 22, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,
  35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53,
  54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70,
];

function loadEnv() {
  const candidates = [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), ".env"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      const content = readFileSync(p, "utf8");
      for (const line of content.split("\n")) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
        }
      }
      break;
    }
  }
}

loadEnv();

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set in .env.local or environment."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function photoUrl(picsumId) {
  return `https://picsum.photos/id/${picsumId}/600/600`;
}

async function getTestUserIds() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw new Error(`listUsers: ${error.message}`);
  const ids = [];
  for (const email of TEST_USER_EMAILS) {
    const user = data?.users?.find((u) => u.email === email);
    if (!user) {
      console.warn(`Test user not found: ${email}. Run: npm run seed:users`);
      continue;
    }
    ids.push(user.id);
  }
  return ids;
}

async function getPlantTaxa() {
  const { data, error } = await supabase
    .from("plant_taxa")
    .select("id, canonical_name")
    .order("popularity_score", { ascending: false })
    .limit(60);
  if (error) throw new Error(`plant_taxa: ${error.message}`);
  return data || [];
}

async function main() {
  console.log("Seeding listings and photos...\n");

  const [userIds, plants] = await Promise.all([
    getTestUserIds(),
    getPlantTaxa(),
  ]);

  if (userIds.length === 0) {
    console.error("No test users found. Run: npm run seed:users");
    process.exit(1);
  }

  if (plants.length < 20) {
    console.warn("Fewer than 20 plant_taxa; some listings will repeat plants.");
  }

  const now = new Date();
  const inOneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const listingsToInsert = [];
  const numListings = 22;
  let photoIndex = 0;

  for (let i = 0; i < numListings; i++) {
    const plant = plants[i % plants.length];
    const sellerId = userIds[i % userIds.length];
    const region = REGIONS[i % REGIONS.length];
    const isAuction = i % 3 === 0;

    if (isAuction) {
      listingsToInsert.push({
        seller_id: sellerId,
        type: "auction",
        swap_enabled: i % 4 === 0,
        category: "plant",
        plant_name: plant.canonical_name,
        plant_taxon_id: plant.id,
        condition: i % 2 === 0 ? "Výborná" : "Dobrá",
        size: ["malá", "stredná", "veľká"][i % 3],
        region,
        auction_start_price: 5 + (i % 20) * 2,
        auction_min_increment: 1,
        auction_ends_at: inOneWeek.toISOString(),
        status: "active",
      });
    } else {
      listingsToInsert.push({
        seller_id: sellerId,
        type: "fixed",
        swap_enabled: i % 5 === 0,
        category: "plant",
        plant_name: plant.canonical_name,
        plant_taxon_id: plant.id,
        condition: i % 2 === 0 ? "Výborná" : "Dobrá",
        size: ["malá", "stredná", "veľká"][i % 3],
        region,
        fixed_price: 8 + (i % 25) * 3,
        status: "active",
      });
    }
  }

  const insertedListings = [];
  for (const row of listingsToInsert) {
    const { data, error } = await supabase.from("listings").insert(row).select("id").single();
    if (error) {
      console.error("Insert listing failed:", error.message);
      continue;
    }
    insertedListings.push(data);
  }

  for (let i = 0; i < insertedListings.length; i++) {
    const listingId = insertedListings[i].id;
    const numPhotos = 1 + (i % 3);
    const photos = [];
    for (let p = 0; p < numPhotos; p++) {
      const id = PICSUM_IDS[(photoIndex + p) % PICSUM_IDS.length];
      photos.push({
        listing_id: listingId,
        url: photoUrl(id),
        position: p,
      });
    }
    photoIndex += numPhotos;
    const { error: photoErr } = await supabase.from("listing_photos").insert(photos);
    if (photoErr) console.error("Insert photos for listing failed:", photoErr.message);
  }

  console.log(`Inserted ${insertedListings.length} listings with photos.`);
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
