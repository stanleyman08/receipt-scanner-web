/** What gets reviewed and edited on a receipt. Amounts are whole cents; the receipt date is YYYY-MM-DD. */
export interface ReceiptDetails {
  vendor: string | null;
  receipt_date: string | null;
  invoice_number: string | null;
  subtotal_cents: number | null;
  gst_cents: number | null;
  total_cents: number | null;
}

/** A saved receipt: its details plus the bucket it's filed in. */
export interface Receipt extends ReceiptDetails {
  id: string;
  bucket_id: string;
  created_at: string;
}

/** Amounts a scan reads only to check that a receipt adds up; they aren't saved. Whole cents, 0 when there are none. */
export interface CheckAmounts {
  /** Provincial taxes charged besides GST: PST, and liquor tax. */
  otherTaxCents: number;
  /** Discounts, which may or may not already be taken off the subtotal. */
  discountCents: number;
}

export const NOTHING_TO_CHECK: CheckAmounts = { otherTaxCents: 0, discountCents: 0 };

/** What /api/scan-receipt returns. */
export type ScanResponse =
  | { success: true; details: ReceiptDetails; checkAmounts: CheckAmounts }
  | { success: false; error: string };

/** A receipt date as the app and the Excel export show it: 2026/03/28. */
export function formatReceiptDate(receiptDate: string): string {
  return receiptDate.replaceAll("-", "/");
}
