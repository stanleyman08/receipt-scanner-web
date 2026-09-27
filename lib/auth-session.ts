import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

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
