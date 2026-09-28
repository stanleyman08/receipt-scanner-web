"use server";

import { z } from "zod";
import { getSession, SIGNED_OUT_MESSAGE } from "@/lib/auth-session";
import { getSql } from "@/lib/db/sql";
import { createBucket, deleteReceipt, saveReceipt, updateReceipt } from "@/lib/receipt-store";
import { BUCKET_CATEGORIES, type Bucket, type BucketKey } from "@/types/bucket";
import type { Receipt, ReceiptDetails } from "@/types/receipt";

// Errors come back as values: Next.js hides thrown messages from the browser in production.
export type ActionResult<T> = { ok: true; value: T } | { ok: false; error: string };

const INVALID_DETAILS = "Some details look wrong. Check them and try again.";
const RECEIPT_GONE = "That receipt no longer exists. Refresh the page to see the current receipts.";

// The same year range as the buckets table's check constraint (lib/db/schema.ts).
const MIN_BUCKET_YEAR = 1900;
const MAX_BUCKET_YEAR = 2100;
const MAX_VENDOR_LENGTH = 200;
const MAX_INVOICE_NUMBER_LENGTH = 100;

const bucketKeySchema = z.object({
  year: z.number().int().min(MIN_BUCKET_YEAR).max(MAX_BUCKET_YEAR),
  month: z.number().int().min(1).max(12),
  category: z.enum(BUCKET_CATEGORIES),
});
// The amount columns are Postgres integers, so anything outside that range is refused here rather than failing there.
const cents = z.int32().nullable();
const receiptDetailsSchema = z.object({
  vendor: z.string().max(MAX_VENDOR_LENGTH).nullable(),
  receipt_date: z.iso.date().nullable(),
  invoice_number: z.string().max(MAX_INVOICE_NUMBER_LENGTH).nullable(),
  subtotal_cents: cents,
  gst_cents: cents,
  total_cents: cents,
});
const receiptIdSchema = z.uuid();

async function isSignedIn(): Promise<boolean> {
  return Boolean(await getSession());
}

export async function createBucketAction(key: BucketKey): Promise<ActionResult<Bucket>> {
  if (!(await isSignedIn())) return { ok: false, error: SIGNED_OUT_MESSAGE };
  const parsed = bucketKeySchema.safeParse(key);
  if (!parsed.success) return { ok: false, error: INVALID_DETAILS };
  return { ok: true, value: await createBucket(getSql(), parsed.data) };
}

export async function saveReceiptAction(details: ReceiptDetails, bucket: BucketKey): Promise<ActionResult<Receipt>> {
  if (!(await isSignedIn())) return { ok: false, error: SIGNED_OUT_MESSAGE };
  const parsedDetails = receiptDetailsSchema.safeParse(details);
  const parsedBucket = bucketKeySchema.safeParse(bucket);
  if (!parsedDetails.success || !parsedBucket.success) return { ok: false, error: INVALID_DETAILS };
  return { ok: true, value: await saveReceipt(getSql(), parsedDetails.data, parsedBucket.data) };
}

export async function updateReceiptAction(
  id: string,
  details: ReceiptDetails,
  bucket: BucketKey,
): Promise<ActionResult<Receipt>> {
  if (!(await isSignedIn())) return { ok: false, error: SIGNED_OUT_MESSAGE };
  const parsedId = receiptIdSchema.safeParse(id);
  const parsedDetails = receiptDetailsSchema.safeParse(details);
  const parsedBucket = bucketKeySchema.safeParse(bucket);
  if (!parsedId.success || !parsedDetails.success || !parsedBucket.success) {
    return { ok: false, error: INVALID_DETAILS };
  }
  const updated = await updateReceipt(getSql(), parsedId.data, parsedDetails.data, parsedBucket.data);
  return updated ? { ok: true, value: updated } : { ok: false, error: RECEIPT_GONE };
}

export async function deleteReceiptAction(id: string): Promise<ActionResult<null>> {
  if (!(await isSignedIn())) return { ok: false, error: SIGNED_OUT_MESSAGE };
  const parsedId = receiptIdSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, error: INVALID_DETAILS };
  const deleted = await deleteReceipt(getSql(), parsedId.data);
  return deleted ? { ok: true, value: null } : { ok: false, error: RECEIPT_GONE };
}
