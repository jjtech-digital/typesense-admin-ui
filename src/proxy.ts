import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "typesense_connection";

const PUBLIC_ROUTES = ["/login"];

const BYPASS_PREFIXES = ["/api/", "/_next/", "/favicon"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const hasConnection =
    request.cookies.has(COOKIE_NAME) || !!process.env.TYPESENSE_API_KEY;

  const isPublic = PUBLIC_ROUTES.includes(pathname);

  if (!hasConnection && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasConnection && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
