#!/usr/bin/env node
/**
 * Nastaví v Supabase Auth (cloud) Site URL a Redirect URL pre produkciu.
 * Vyžaduje: SUPABASE_ACCESS_TOKEN (Personal Access Token z https://supabase.com/dashboard/account/tokens)
 *
 * Použitie:
 *   SUPABASE_ACCESS_TOKEN=tvoj_token node scripts/supabase-set-redirect-url.mjs
 * alebo
 *   npx dotenv -e .env -- node scripts/supabase-set-redirect-url.mjs   (ak máš token v .env)
 */

const PROJECT_REF = "infzbcbstyxamxlotqdo";
const SITE_URL = "https://rootie.vercel.app";
const REDIRECT_URL = "https://rootie.vercel.app/auth/callback";
const API_BASE = "https://api.supabase.com/v1";

const token = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_PAT;
if (!token) {
  console.error(
    "Chýba SUPABASE_ACCESS_TOKEN. Vytvor Personal Access Token na https://supabase.com/dashboard/account/tokens"
  );
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

async function getAuthConfig() {
  const res = await fetch(`${API_BASE}/projects/${PROJECT_REF}/config/auth`, {
    headers,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GET auth config failed: ${res.status} ${t}`);
  }
  return res.json();
}

async function patchAuthConfig(body) {
  const res = await fetch(`${API_BASE}/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PATCH auth config failed: ${res.status} ${t}`);
  }
  return res.json();
}

async function main() {
  const current = await getAuthConfig();
  const existingUris = (current.uri_allow_list || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const hasRedirect = existingUris.some(
    (u) => u === REDIRECT_URL || u === "https://rootie.vercel.app/**"
  );
  if (current.site_url === SITE_URL && hasRedirect) {
    console.log("Site URL a Redirect URL sú už nastavené.");
    return;
  }

  const newUris = hasRedirect
    ? existingUris
    : [...existingUris, REDIRECT_URL];

  await patchAuthConfig({
    site_url: SITE_URL,
    uri_allow_list: newUris.join("\n"),
  });
  console.log("Nastavené:");
  console.log("  Site URL:", SITE_URL);
  console.log("  Redirect URLs:", newUris.join(", "));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
