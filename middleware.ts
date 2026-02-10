import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseMiddlewareClient } from "@/lib/supabaseClient";

const protectedPrefixes = [
  "/create",
  "/inbox",
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
  return pathname === "/welcome" || pathname === "/login" || pathname === "/signup";
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtected = isProtectedPath(pathname);
  const onAuthPage = isAuthPage(pathname);

  if (!isProtected && !onAuthPage) {
    return NextResponse.next();
  }

  const { supabase, response } = await createSupabaseMiddlewareClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);

    return NextResponse.redirect(loginUrl);
  }

  if (user && onAuthPage) {
    const meUrl = request.nextUrl.clone();
    meUrl.pathname = "/me";
    meUrl.search = "";

    return NextResponse.redirect(meUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/create",
    "/create/:path*",
    "/inbox",
    "/inbox/:path*",
    "/chat",
    "/chat/:path*",
    "/saved",
    "/saved/:path*",
    "/review",
    "/review/:path*",
    "/wanted/create",
    "/admin",
    "/admin/:path*",
    "/welcome",
    "/login",
    "/signup",
    "/api/posting/:path*",
    "/api/reactions/:path*",
    "/api/messages/:path*",
  ],
};
