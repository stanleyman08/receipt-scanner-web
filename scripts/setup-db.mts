// Creates Better Auth's tables and the app's tables where they don't exist yet, then applies the schema changes that
// bring older tables up to date (see lib/db/schema.ts); safe to re-run.
// Schema changes need the direct connection, not the pooled one. Run with `pnpm setup-db`.
import { neon } from "@neondatabase/serverless";
import { SETUP_STATEMENTS } from "../lib/db/schema.ts";

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) {
  console.error("DATABASE_URL_UNPOOLED is not set. Run `vercel env pull .env.local --yes` first.");
  process.exit(1);
}

const sql = neon(url);

console.log(`Setting up ${new URL(url).host}`);
for (const statement of SETUP_STATEMENTS) {
  await sql.query(statement);
}
console.log(`Ran ${SETUP_STATEMENTS.length} statements: missing tables created, schema changes applied.`);
