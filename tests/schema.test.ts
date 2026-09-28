import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import { SETUP_STATEMENTS } from "@/lib/db/schema";

// The statements `pnpm setup-db` runs on Neon, in the same order and in one transaction, run against an in-process
// Postgres instead.
async function setUpDatabase(pg: PGlite) {
  await pg.transaction(async (tx) => {
    for (const statement of SETUP_STATEMENTS) await tx.exec(statement);
  });
}

// New and older databases must end up with the same shape, so later schema changes work on both.
async function hasPerCompanyUniqueConstraint(pg: PGlite) {
  const { rows } = await pg.query(
    "SELECT 1 FROM pg_constraint WHERE conname = 'buckets_company_year_month_category_key' AND contype = 'u'",
  );
  return rows.length === 1;
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
    expect(await hasPerCompanyUniqueConstraint(pg)).toBe(true);
  });

  it("brings a database set up before companies up to date, filing its buckets under Carino", async () => {
    const pg = new PGlite();
    // The buckets table as setup created it before companies, with one bucket in it.
    await pg.exec(`CREATE TABLE buckets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      year integer NOT NULL CHECK (year BETWEEN 1900 AND 2100),
      month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
      category text NOT NULL CHECK (category IN ('Food', 'Supply', 'Other A')),
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (year, month, category)
    )`);
    await pg.exec("INSERT INTO buckets (year, month, category) VALUES (2026, 3, 'Food')");

    await setUpDatabase(pg);
    await setUpDatabase(pg);

    const { rows } = await pg.query<{ company: string }>("SELECT company FROM buckets");
    expect(rows).toEqual([{ company: "Carino" }]);
    // The same month and category can now exist at the other company, and buckets are unique per company.
    await pg.exec("INSERT INTO buckets (company, year, month, category) VALUES ('Peko Peko', 2026, 3, 'Food')");
    await pg.exec(`INSERT INTO buckets (company, year, month, category) VALUES ('Carino', 2026, 3, 'Food')
      ON CONFLICT (company, year, month, category) DO NOTHING`);
    const { rows: counted } = await pg.query<{ count: number }>("SELECT count(*)::int AS count FROM buckets");
    expect(counted[0].count).toBe(2);
    expect(await hasPerCompanyUniqueConstraint(pg)).toBe(true);
  });
});
