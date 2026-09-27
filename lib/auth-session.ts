import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** What server actions and route handlers tell the browser when the session is missing or has expired. */
export const SIGNED_OUT_MESSAGE = "Your session has ended. Sign in again to continue.";

/** The signed-in session, checked against the database, or null. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** For pages: the session, or a redirect to the sign-in page. */
export async function requireSessionOrRedirect() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
