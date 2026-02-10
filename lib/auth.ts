import type { Session, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabaseClient";

export type RootieRole = "guest" | "member" | "moderator" | "admin";

export type AuthContext = {
  userId: string | null;
  role: RootieRole;
};

export const unauthenticatedContext: AuthContext = {
  userId: null,
  role: "guest",
};

export async function getSession(): Promise<Session | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return null;
  }

  return data.session;
}

export async function getUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return data.user;
}

export async function requireUser(nextPath = "/me"): Promise<User> {
  const user = await getUser();

  if (!user) {
    const loginPath = `/login?next=${encodeURIComponent(nextPath)}`;
    redirect(loginPath);
  }

  return user;
}

/**
 * Require authenticated user and moderator flag. Redirects to nextPath if not moderator.
 */
export async function requireModerator(nextPath = "/me"): Promise<User> {
  const user = await requireUser(`/admin/reports`);
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_moderator")
    .eq("id", user.id)
    .single();

  if (!profile?.is_moderator) {
    redirect(nextPath);
  }

  return user;
}
