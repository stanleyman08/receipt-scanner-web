import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// A quick cookie check that sends signed-out visitors to the sign-in page. It isn't the security boundary: pages,
// server actions and API routes verify the session against the database. It never redirects away from /login on
// the cookie alone, since a stale cookie would then bounce between the two pages.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Everything except the sign-in page, API routes (they check the session themselves) and static files.
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
