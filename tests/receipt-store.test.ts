import { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SETUP_STATEMENTS } from "@/lib/db/schema";
import type { Sql } from "@/lib/db/sql";
import {
  createBucket,
  deleteReceipt,
  listBuckets,
  listReceipts,
  saveReceipt,
  updateReceipt,
} from "@/lib/receipt-store";
import type { BucketCategory, BucketKey } from "@/types/bucket";
import type { Company } from "@/types/company";
import type { ReceiptDetails } from "@/types/receipt";

// The store's real SQL, run against an in-process Postgres instead of Neon.
const pg = new PGlite();
const sql: Sql = async (strings, ...values) => (await pg.sql<Record<string, unknown>>(strings, ...values)).rows;

beforeAll(async () => {
  for (const statement of SETUP_STATEMENTS) await pg.exec(statement);
});

beforeEach(async () => {
  await pg.exec("TRUNCATE receipts, buckets");
});

function key(company: Company, year: number, month: number, category: BucketCategory): BucketKey {
  return { company, year, month, category };
}

describe("buckets", () => {
  it("lists buckets newest month first, then by company and category", async () => {
    await createBucket(sql, key("Carino", 2025, 3, "Supply"));
    await createBucket(sql, key("Peko Peko", 2025, 3, "Food"));
    await createBucket(sql, key("Carino", 2026, 1, "Food"));
    await createBucket(sql, key("Carino", 2025, 3, "Food"));

    const listed = await listBuckets(sql);

    expect(listed.map((b) => `${b.year}-${b.month} ${b.company} ${b.category}`)).toEqual([
      "2026-1 Carino Food",
      "2025-3 Carino Food",
      "2025-3 Carino Supply",
      "2025-3 Peko Peko Food",
    ]);
  });

  it("returns the existing bucket instead of creating a duplicate", async () => {
    const first = await createBucket(sql, key("Carino", 2026, 1, "Food"));
    const again = await createBucket(sql, key("Carino", 2026, 1, "Food"));

    expect(again.id).toBe(first.id);
    expect(await listBuckets(sql)).toHaveLength(1);
  });

  it("keeps the same month and category at the two companies as separate buckets", async () => {
    const carino = await createBucket(sql, key("Carino", 2026, 1, "Food"));
    const pekoPeko = await createBucket(sql, key("Peko Peko", 2026, 1, "Food"));

    expect(pekoPeko.id).not.toBe(carino.id);
    expect(pekoPeko).toMatchObject({ company: "Peko Peko", year: 2026, month: 1, category: "Food" });
    expect(await listBuckets(sql)).toHaveLength(2);
  });
});

const groceries: ReceiptDetails = {
  vendor: "Corner Grocery",
  receipt_date: "2025-12-30",
  invoice_number: "A-1042",
  subtotal_cents: 2000,
  gst_cents: 100,
  total_cents: 2100,
};

describe("saving receipts", () => {
  it("saves a receipt into its bucket, creating the bucket when it doesn't exist", async () => {
    const saved = await saveReceipt(sql, groceries, key("Carino", 2025, 12, "Food"));

    const [bucket] = await listBuckets(sql);
    expect(bucket).toMatchObject({ company: "Carino", year: 2025, month: 12, category: "Food" });
    expect(saved).toMatchObject({ ...groceries, bucket_id: bucket.id });
    expect(await listReceipts(sql, "Carino")).toEqual([saved]);
  });

  it("files into an existing bucket without creating another", async () => {
    const bucket = await createBucket(sql, key("Carino", 2025, 12, "Food"));

    const saved = await saveReceipt(sql, groceries, key("Carino", 2025, 12, "Food"));

    expect(saved.bucket_id).toBe(bucket.id);
    expect(await listBuckets(sql)).toHaveLength(1);
  });

  it("keeps details the scan couldn't read blank", async () => {
    const blank: ReceiptDetails = {
      vendor: null,
      receipt_date: null,
      invoice_number: null,
      subtotal_cents: null,
      gst_cents: null,
      total_cents: null,
    };

    const saved = await saveReceipt(sql, blank, key("Carino", 2026, 1, "Supply"));

    expect(saved).toMatchObject(blank);
  });

  it("lists each company's receipts on their own", async () => {
    const carinos = await saveReceipt(sql, groceries, key("Carino", 2025, 12, "Food"));
    const pekoPekos = await saveReceipt(
      sql,
      { ...groceries, vendor: "Fish Market" },
      key("Peko Peko", 2025, 12, "Food"),
    );

    expect(await listReceipts(sql, "Carino")).toEqual([carinos]);
    expect(await listReceipts(sql, "Peko Peko")).toEqual([pekoPekos]);
  });
});

describe("editing and deleting receipts", () => {
  it("corrects a receipt's details and moves it to another bucket", async () => {
    const saved = await saveReceipt(sql, groceries, key("Carino", 2026, 8, "Food"));
    const corrected = { ...groceries, receipt_date: "2026-03-28", total_cents: 2200 };

    const updated = await updateReceipt(sql, saved.id, corrected, key("Carino", 2026, 3, "Food"));

    const march = (await listBuckets(sql)).find((bucket) => bucket.month === 3);
    expect(updated).toMatchObject({ ...corrected, id: saved.id, bucket_id: march?.id });
  });

  it("moves a receipt to the other company", async () => {
    const saved = await saveReceipt(sql, groceries, key("Carino", 2026, 3, "Food"));

    const moved = await updateReceipt(sql, saved.id, groceries, key("Peko Peko", 2026, 3, "Food"));

    const pekoPekoMarch = (await listBuckets(sql)).find((bucket) => bucket.company === "Peko Peko");
    expect(moved?.bucket_id).toBe(pekoPekoMarch?.id);
    expect(await listReceipts(sql, "Carino")).toEqual([]);
    expect(await listReceipts(sql, "Peko Peko")).toEqual([moved]);
  });

  it("returns nothing for a receipt that doesn't exist, and creates no bucket", async () => {
    const missingId = "00000000-0000-4000-8000-000000000000";

    const updated = await updateReceipt(sql, missingId, groceries, key("Carino", 2026, 3, "Food"));

    expect(updated).toBeNull();
    expect(await listBuckets(sql)).toEqual([]);
  });

  it("deletes a receipt once", async () => {
    const saved = await saveReceipt(sql, groceries, key("Carino", 2026, 3, "Food"));

    expect(await deleteReceipt(sql, saved.id)).toBe(true);
    expect(await listReceipts(sql, "Carino")).toEqual([]);
    expect(await deleteReceipt(sql, saved.id)).toBe(false);
  });
});
