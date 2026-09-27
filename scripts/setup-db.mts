// Creates Better Auth's tables and the app's tables where they don't exist yet; safe to re-run.
// Schema changes need the direct connection, not the pooled one. Run with `pnpm setup-db`.
import { neon } from "@neondatabase/serverless";
import { APP_SCHEMA, AUTH_SCHEMA } from "../lib/db/schema.ts";

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) {
  console.error("DATABASE_URL_UNPOOLED is not set. Run `vercel env pull .env.local --yes` first.");
  process.exit(1);
}

const sql = neon(url);
const statements = [...AUTH_SCHEMA, ...APP_SCHEMA];

console.log(`Setting up ${new URL(url).host}`);
for (const statement of statements) {
  await sql.query(statement);
}
console.log(`Schema is up to date (${statements.length} statements).`);
