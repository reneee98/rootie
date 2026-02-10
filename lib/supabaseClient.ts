import {
  createBrowserClient,
  createServerClient,
} from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

let browserClient: SupabaseClient | null = null;

function getSupabaseServerEnv(): SupabaseEnv {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase server environment variables."
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

function getSupabaseBrowserEnv(): SupabaseEnv {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function createSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabaseBrowserEnv();
  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);

  return browserClient;
}

export async function createSupabaseServerClient() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const { supabaseUrl, supabaseAnonKey } = getSupabaseServerEnv();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Ignore writes from Server Components.
        }
      },
    },
  });
}

/**
 * Service role client (bypasses RLS). Use only in server-side cron/background jobs.
 * Requires SUPABASE_SERVICE_ROLE_KEY in env.
 */
export function createSupabaseServiceRoleClient(): SupabaseClient {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for service role client."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export async function createSupabaseMiddlewareClient(
  request: import("next/server").NextRequest
) {
  const { NextResponse } = await import("next/server");
  const { supabaseUrl, supabaseAnonKey } = getSupabaseServerEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  return { supabase, response };
}
