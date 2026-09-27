import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import { APP_SCHEMA, AUTH_SCHEMA } from "@/lib/db/schema";

// The statements `pnpm setup-db` runs on Neon, in the same order, run against an in-process Postgres instead.
async function setUpDatabase(pg: PGlite) {
  for (const statement of [...AUTH_SCHEMA, ...APP_SCHEMA]) await pg.exec(statement);
}

describe("database setup", () => {
  it("creates Better Auth's tables and the app's tables, and is safe to run again", async () => {
    const pg = new PGlite();

    await setUpDatabase(pg);
    await setUpDatabase(pg);

    const { rows } = await pg.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public'",
    );
    expect(new Set(rows.map((row) => row.table_name))).toEqual(
      new Set(["user", "session", "account", "verification", "rateLimit", "buckets", "receipts"]),
    );
  });
});
