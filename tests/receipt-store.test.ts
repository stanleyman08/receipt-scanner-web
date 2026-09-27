import { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { APP_SCHEMA } from "@/lib/db/schema";
import type { Sql } from "@/lib/db/sql";
import {
  createBucket,
  deleteReceipt,
  listBuckets,
  listReceipts,
  saveReceipt,
  updateReceipt,
} from "@/lib/receipt-store";
import type { ReceiptDetails } from "@/types/receipt";

// The store's real SQL, run against an in-process Postgres instead of Neon.
const pg = new PGlite();
const sql: Sql = async (strings, ...values) => (await pg.sql<Record<string, unknown>>(strings, ...values)).rows;

beforeAll(async () => {
  for (const statement of APP_SCHEMA) await pg.exec(statement);
});

beforeEach(async () => {
  await pg.exec("TRUNCATE receipts, buckets");
});

describe("buckets", () => {
  it("lists buckets newest month first, then by category", async () => {
    await createBucket(sql, { year: 2025, month: 3, category: "Supply" });
    await createBucket(sql, { year: 2026, month: 1, category: "Food" });
    await createBucket(sql, { year: 2025, month: 3, category: "Food" });

    const listed = await listBuckets(sql);

    expect(listed.map(({ year, month, category }) => `${year}-${month} ${category}`)).toEqual([
      "2026-1 Food",
      "2025-3 Food",
      "2025-3 Supply",
    ]);
  });

  it("returns the existing bucket instead of creating a duplicate", async () => {
    const first = await createBucket(sql, { year: 2026, month: 1, category: "Food" });
    const again = await createBucket(sql, { year: 2026, month: 1, category: "Food" });

    expect(again.id).toBe(first.id);
    expect(await listBuckets(sql)).toHaveLength(1);
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
    const saved = await saveReceipt(sql, groceries, { year: 2025, month: 12, category: "Food" });

    const [bucket] = await listBuckets(sql);
    expect(bucket).toMatchObject({ year: 2025, month: 12, category: "Food" });
    expect(saved).toMatchObject({ ...groceries, bucket_id: bucket.id });
    expect(await listReceipts(sql)).toEqual([saved]);
  });

  it("files into an existing bucket without creating another", async () => {
    const bucket = await createBucket(sql, { year: 2025, month: 12, category: "Food" });

    const saved = await saveReceipt(sql, groceries, { year: 2025, month: 12, category: "Food" });

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

    const saved = await saveReceipt(sql, blank, { year: 2026, month: 1, category: "Supply" });

    expect(saved).toMatchObject(blank);
  });
});

describe("editing and deleting receipts", () => {
  it("corrects a receipt's details and moves it to another bucket", async () => {
    const saved = await saveReceipt(sql, groceries, { year: 2026, month: 8, category: "Food" });
    const corrected = { ...groceries, receipt_date: "2026-03-28", total_cents: 2200 };

    const updated = await updateReceipt(sql, saved.id, corrected, { year: 2026, month: 3, category: "Food" });

    const march = (await listBuckets(sql)).find((bucket) => bucket.month === 3);
    expect(updated).toMatchObject({ ...corrected, id: saved.id, bucket_id: march?.id });
  });

  it("returns nothing for a receipt that doesn't exist, and creates no bucket", async () => {
    const missingId = "00000000-0000-4000-8000-000000000000";

    const updated = await updateReceipt(sql, missingId, groceries, { year: 2026, month: 3, category: "Food" });

    expect(updated).toBeNull();
    expect(await listBuckets(sql)).toEqual([]);
  });

  it("deletes a receipt once", async () => {
    const saved = await saveReceipt(sql, groceries, { year: 2026, month: 3, category: "Food" });

    expect(await deleteReceipt(sql, saved.id)).toBe(true);
    expect(await listReceipts(sql)).toEqual([]);
    expect(await deleteReceipt(sql, saved.id)).toBe(false);
  });
});
