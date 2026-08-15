import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { ALL_NAV_HREFS } from "@/lib/nav-sections";

const COOKIE_NAME = "school_session";
const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me-1234567890"
);

/** Longest matching sidebar href for a pathname, e.g. "/students/123/edit" -> "/students". */
function matchHref(pathname: string): string | null {
  const candidates = ALL_NAV_HREFS.filter(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => b.length - a.length)[0];
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    return NextResponse.next();
  }

  // Public, no-login exam result lookup link (shared with parents/students).
  if (pathname.startsWith("/result/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    if (pathname === "/") return NextResponse.next();
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let payload;
  try {
    ({ payload } = await jwtVerify(token, SECRET));
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (payload.role === "admin") {
    return NextResponse.next();
  }

  // Staff accounts never manage access.
  if (pathname.startsWith("/settings")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const permissions = (payload.permissions as string[]) || [];
  const matched = matchHref(pathname);

  // Routes not tied to a sidebar function (print pages, the root redirect, etc.)
  // stay gated by login only, same as before this feature existed.
  if (!matched || permissions.includes(matched)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(permissions[0] || "/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|image/|api/health).*)"],
};
