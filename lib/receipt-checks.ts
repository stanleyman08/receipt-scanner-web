import { formatCents } from "@/lib/money";
import type { CheckAmounts, ReceiptDetails } from "@/types/receipt";

/** Something on the review screen worth a look before saving: a warning, or a note on why the amounts add up. */
export interface AmountCheck {
  tone: "warning" | "note";
  message: string;
}

// Tax worked out line by line can round a cent or two away from the total.
const TOLERANCE_CENTS = 2;
const GST_RATE = 0.05;

/**
 * The checks on a scanned receipt's amounts: that the subtotal, GST and the provincial taxes read from the scan add up
 * to the total, and that GST is no more than 5% of the subtotal. A discount only counts when it closes the gap, since
 * many receipts print one already taken off the subtotal. A blank subtotal or total is pointed out instead.
 */
export function checkReceiptAmounts(
  {
    subtotal_cents: subtotal,
    gst_cents: gst,
    total_cents: total,
  }: Pick<ReceiptDetails, "subtotal_cents" | "gst_cents" | "total_cents">,
  { otherTaxCents, discountCents }: CheckAmounts,
): AmountCheck[] {
  const checks: AmountCheck[] = [];
  if (subtotal === null) checks.push({ tone: "warning", message: "The subtotal couldn't be read." });
  if (total === null) checks.push({ tone: "warning", message: "The total couldn't be read." });
  if (subtotal === null || total === null) return checks;

  const gstCents = gst ?? 0;
  const sum = subtotal + gstCents + otherTaxCents;
  const gap = sum - total;
  if (Math.abs(gap) > TOLERANCE_CENTS) {
    if (discountCents > 0 && Math.abs(gap - discountCents) <= TOLERANCE_CENTS) {
      checks.push({ tone: "note", message: `Includes a ${formatCents(discountCents)} discount.` });
    } else {
      const parts = [`Subtotal ${formatCents(subtotal)}`, `GST ${formatCents(gstCents)}`];
      if (otherTaxCents > 0) parts.push(`PST ${formatCents(otherTaxCents)}`);
      checks.push({
        tone: "warning",
        message: `${parts.join(" + ")} = ${formatCents(sum)}, but the total is ${formatCents(total)} (${formatCents(Math.abs(gap))} off).`,
      });
    }
  }

  if (gstCents > Math.round(subtotal * GST_RATE) + TOLERANCE_CENTS) {
    checks.push({
      tone: "warning",
      message: `GST ${formatCents(gstCents)} is more than 5% of the ${formatCents(subtotal)} subtotal.`,
    });
  }
  return checks;
}
