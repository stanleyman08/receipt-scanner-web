import { Pool } from "@neondatabase/serverless";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30;
const ONE_DAY_IN_SECONDS = 60 * 60 * 24;
// The sign-in page is public and the password is shared, so attempts are limited per IP address.
const SIGN_IN_ATTEMPTS_PER_MINUTE = 5;
const LOCAL_URL = "http://localhost:3000";

// The URL this deployment is reached at: the production domain, this preview's branch URL, or localhost.
function baseUrl(): string {
  const host =
    process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : (process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL);
  return host ? `https://${host}` : LOCAL_URL;
}

// Only this deployment's own URLs may call the auth endpoints; no wildcard covers other projects' previews.
function trustedOrigins(): string[] {
  const hosts = [
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_URL,
  ].filter((host): host is string => Boolean(host));
  return hosts.length > 0 ? hosts.map((host) => `https://${host}`) : [LOCAL_URL];
}

export function createAuth({ allowSignUp = false }: { allowSignUp?: boolean } = {}) {
  return betterAuth({
    appName: "Receipt Scanner",
    baseURL: baseUrl(),
    // Better Auth needs a pool with transactions; the app's own queries use the HTTP driver (lib/db/sql.ts).
    database: new Pool({ connectionString: process.env.DATABASE_URL }),
    emailAndPassword: { enabled: true, disableSignUp: !allowSignUp },
    session: { expiresIn: THIRTY_DAYS_IN_SECONDS, updateAge: ONE_DAY_IN_SECONDS },
    rateLimit: {
      // Kept in the database so the limit holds across Vercel's instances.
      storage: "database",
      customRules: { "/sign-in/email": { window: 60, max: SIGN_IN_ATTEMPTS_PER_MINUTE } },
    },
    trustedOrigins: trustedOrigins(),
    plugins: [nextCookies()],
  });
}

// The app's instance. Sign-up is off: the one shared account comes from scripts/create-account.ts.
export const auth = createAuth();
