import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseMiddlewareClient } from "@/lib/supabaseClient";
import { normalizeNextPath } from "@/lib/auth-redirect";

const protectedPrefixes = [
  "/create",
  "/inbox",
  "/me",
  "/chat",
  "/saved",
  "/review",
  "/wanted/create",
  "/admin",
  "/api/posting",
  "/api/reactions",
  "/api/messages",
];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isAuthPage(pathname: string) {
  return pathname === "/login" || pathname === "/signup";
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtected = isProtectedPath(pathname);
  const onAuthPage = isAuthPage(pathname);

  const { supabase, getResponse } = await createSupabaseMiddlewareClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const response = getResponse();

  const redirectWithCookies = (url: URL) => {
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  };

  if (!user && isProtected) {
    if (pathname.startsWith("/api/")) {
      const unauthorized = NextResponse.json({ error: "Nie ste prihlásený." }, { status: 401 });
      for (const cookie of response.cookies.getAll()) unauthorized.cookies.set(cookie);
      return unauthorized;
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);

    return redirectWithCookies(loginUrl);
  }

  if (user && onAuthPage) {
    const destination = normalizeNextPath(request.nextUrl.searchParams.get("next"), "/me");
    return redirectWithCookies(new URL(destination, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
