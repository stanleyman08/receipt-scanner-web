import type { Sql } from "@/lib/db/sql";
import type { Bucket, BucketCategory, BucketKey } from "@/types/bucket";
import type { ReceiptDetails, SavedReceipt } from "@/types/receipt";

// Reads and writes buckets and receipts. Every function takes the SQL runner, so tests can run them on PGlite.

export async function listBuckets(sql: Sql): Promise<Bucket[]> {
  const rows = await sql`
    SELECT id, year, month, category, created_at FROM buckets
    ORDER BY year DESC, month DESC, category`;
  return rows.map(toBucket);
}

// Creating a bucket that already exists returns the existing one.
export async function createBucket(sql: Sql, key: BucketKey): Promise<Bucket> {
  const [row] = await sql`
    INSERT INTO buckets (year, month, category) VALUES (${key.year}, ${key.month}, ${key.category})
    ON CONFLICT (year, month, category) DO UPDATE SET category = EXCLUDED.category
    RETURNING id, year, month, category, created_at`;
  return toBucket(row);
}

export async function listReceipts(sql: Sql): Promise<SavedReceipt[]> {
  const rows = await sql`
    SELECT id, bucket_id, vendor, receipt_date::text AS receipt_date, invoice_number,
           subtotal_cents, gst_cents, total_cents, created_at
    FROM receipts
    ORDER BY created_at DESC`;
  return rows.map(toReceipt);
}

// Files a receipt into its bucket, creating the bucket if it doesn't exist yet, in a single statement.
export async function saveReceipt(sql: Sql, details: ReceiptDetails, bucket: BucketKey): Promise<SavedReceipt> {
  const [row] = await sql`
    WITH bucket AS (
      INSERT INTO buckets (year, month, category) VALUES (${bucket.year}, ${bucket.month}, ${bucket.category})
      ON CONFLICT (year, month, category) DO UPDATE SET category = EXCLUDED.category
      RETURNING id
    )
    INSERT INTO receipts (bucket_id, vendor, receipt_date, invoice_number, subtotal_cents, gst_cents, total_cents)
    SELECT bucket.id, ${details.vendor}::text, ${details.receipt_date}::date, ${details.invoice_number}::text,
           ${details.subtotal_cents}::integer, ${details.gst_cents}::integer, ${details.total_cents}::integer
    FROM bucket
    RETURNING id, bucket_id, vendor, receipt_date::text AS receipt_date, invoice_number,
              subtotal_cents, gst_cents, total_cents, created_at`;
  return toReceipt(row);
}

// Corrects a receipt and files it into the given bucket, creating that bucket only if the receipt exists.
export async function updateReceipt(
  sql: Sql,
  id: string,
  details: ReceiptDetails,
  bucket: BucketKey,
): Promise<SavedReceipt | null> {
  const [row] = await sql`
    WITH target AS (SELECT id FROM receipts WHERE id = ${id}::uuid),
    bucket AS (
      INSERT INTO buckets (year, month, category)
      SELECT ${bucket.year}::integer, ${bucket.month}::integer, ${bucket.category}::text
      WHERE EXISTS (SELECT 1 FROM target)
      ON CONFLICT (year, month, category) DO UPDATE SET category = EXCLUDED.category
      RETURNING id
    )
    UPDATE receipts
    SET bucket_id = bucket.id,
        vendor = ${details.vendor}::text,
        receipt_date = ${details.receipt_date}::date,
        invoice_number = ${details.invoice_number}::text,
        subtotal_cents = ${details.subtotal_cents}::integer,
        gst_cents = ${details.gst_cents}::integer,
        total_cents = ${details.total_cents}::integer
    FROM bucket
    WHERE receipts.id = ${id}::uuid
    RETURNING receipts.id, receipts.bucket_id, receipts.vendor, receipts.receipt_date::text AS receipt_date,
              receipts.invoice_number, receipts.subtotal_cents, receipts.gst_cents, receipts.total_cents,
              receipts.created_at`;
  return row ? toReceipt(row) : null;
}

export async function deleteReceipt(sql: Sql, id: string): Promise<boolean> {
  const rows = await sql`DELETE FROM receipts WHERE id = ${id}::uuid RETURNING id`;
  return rows.length > 0;
}

function toReceipt(row: Record<string, unknown>): SavedReceipt {
  return {
    id: String(row.id),
    bucket_id: String(row.bucket_id),
    vendor: toText(row.vendor),
    receipt_date: toText(row.receipt_date),
    invoice_number: toText(row.invoice_number),
    subtotal_cents: toCents(row.subtotal_cents),
    gst_cents: toCents(row.gst_cents),
    total_cents: toCents(row.total_cents),
    created_at: toIsoString(row.created_at),
  };
}

function toText(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function toCents(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

function toBucket(row: Record<string, unknown>): Bucket {
  return {
    id: String(row.id),
    year: Number(row.year),
    month: Number(row.month),
    category: row.category as BucketCategory,
    created_at: toIsoString(row.created_at),
  };
}

// Both drivers return timestamps as Date objects; the app passes them around as ISO strings.
function toIsoString(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}
