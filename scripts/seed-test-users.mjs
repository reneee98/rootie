#!/usr/bin/env node
/**
 * Seed test user accounts for local development.
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (e.g. from .env.local).
 * Run: node scripts/seed-test-users.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const TEST_USERS = [
  {
    email: "admin@test.rootie.sk",
    password: "admin1234",
    display_name: "Admin",
    region: "Bratislavský kraj",
    is_moderator: true,
  },
  {
    email: "predajca@test.rootie.sk",
    password: "test1234",
    display_name: "Test Predajca",
    region: "Bratislavský kraj",
  },
  {
    email: "kupujuci@test.rootie.sk",
    password: "test1234",
    display_name: "Test Kupujúci",
    region: "Žilinský kraj",
  },
  {
    email: "druhy@test.rootie.sk",
    password: "test1234",
    display_name: "Druhý Kupujúci",
    region: "Košický kraj",
  },
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
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set in .env.local or environment."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("Creating test users...\n");

  const created = [];

  for (const u of TEST_USERS) {
    const { data: existing } = await supabase.auth.admin.listUsers();
    const found = existing?.users?.find((x) => x.email === u.email);
    if (found) {
      console.log(`User already exists: ${u.email}`);
      created.push({ ...u, id: found.id });
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { display_name: u.display_name },
    });

    if (error) {
      console.error(`Failed to create ${u.email}:`, error.message);
      continue;
    }

    created.push({ ...u, id: data.user.id });
    console.log(`Created: ${u.email}`);
  }

  for (const u of created) {
    const updates = {
      display_name: u.display_name ?? null,
      region: u.region ?? null,
      updated_at: new Date().toISOString(),
    };
    if (u.is_moderator) {
      updates.is_moderator = true;
    }
    const { error: upErr } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", u.id);
    if (upErr) console.warn(`Profile update for ${u.email}:`, upErr.message);
  }

  console.log("\n--- Test accounts (prihlasovacie údaje) ---\n");
  for (const u of created) {
    const adminLabel = u.is_moderator ? " [ADMIN]" : "";
    console.log(`  Email:    ${u.email}${adminLabel}`);
    console.log(`  Heslo:   ${u.password}`);
    console.log(`  Meno:    ${u.display_name}`);
    console.log("");
  }
  const admin = created.find((u) => u.is_moderator);
  if (admin) {
    console.log("--- Admin (prihlasovanie do administrácie) ---\n");
    console.log(`  Email:    ${admin.email}`);
    console.log(`  Heslo:   ${admin.password}`);
    console.log(`  Admin:   ${process.env.SUPABASE_URL?.includes("localhost") ? "http://localhost:3000/me" : "/me"} → Moderácia – nahlásenia\n`);
  }
  console.log("Prihlásenie: http://localhost:3000/login");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
