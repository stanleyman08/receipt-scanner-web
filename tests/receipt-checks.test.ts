import { describe, expect, it } from "vitest";
import { checkReceiptAmounts } from "@/lib/receipt-checks";
import type { CheckAmounts } from "@/types/receipt";

const NOTHING_EXTRA: CheckAmounts = { otherTaxCents: 0, discountCents: 0 };

function amounts(subtotal: number | null, gst: number | null, total: number | null) {
  return { subtotal_cents: subtotal, gst_cents: gst, total_cents: total };
}

describe("checkReceiptAmounts", () => {
  it("says nothing when the subtotal and GST add up to the total", () => {
    expect(checkReceiptAmounts(amounts(2000, 100, 2100), NOTHING_EXTRA)).toEqual([]);
  });

  it("allows 2¢ for tax rounded line by line", () => {
    expect(checkReceiptAmounts(amounts(2000, 100, 2102), NOTHING_EXTRA)).toEqual([]);
  });

  it("counts the PST read from the scan", () => {
    expect(checkReceiptAmounts(amounts(7700, 369, 8516), { otherTaxCents: 447, discountCents: 0 })).toEqual([]);
  });

  it("shows the arithmetic when the amounts don't add up", () => {
    expect(checkReceiptAmounts(amounts(7700, 369, 8616), { otherTaxCents: 447, discountCents: 0 })).toEqual([
      {
        tone: "warning",
        message: "Subtotal $77.00 + GST $3.69 + PST $4.47 = $85.16, but the total is $86.16 ($1.00 off).",
      },
    ]);
  });

  it("leaves PST out of the arithmetic when the receipt has none", () => {
    expect(checkReceiptAmounts(amounts(2000, 100, 2000), NOTHING_EXTRA)).toEqual([
      { tone: "warning", message: "Subtotal $20.00 + GST $1.00 = $21.00, but the total is $20.00 ($1.00 off)." },
    ]);
  });

  it("explains a gap closed by a discount after the subtotal, rather than warning", () => {
    expect(checkReceiptAmounts(amounts(3888, 173, 3681), { otherTaxCents: 4, discountCents: 384 })).toEqual([
      { tone: "note", message: "Includes a $3.84 discount." },
    ]);
  });

  it("ignores a discount already taken off the subtotal", () => {
    expect(checkReceiptAmounts(amounts(2000, 100, 2100), { otherTaxCents: 0, discountCents: 600 })).toEqual([]);
  });

  it("warns about GST over 5% of the subtotal, as when the combined tax is read as GST", () => {
    expect(checkReceiptAmounts(amounts(7700, 816, 8516), NOTHING_EXTRA)).toEqual([
      { tone: "warning", message: "GST $8.16 is more than 5% of the $77.00 subtotal." },
    ]);
  });

  it.each([
    ["subtotal", amounts(null, 100, 2100), "The subtotal couldn't be read."],
    ["total", amounts(2000, 100, null), "The total couldn't be read."],
  ])("says when the %s is blank, and skips the sum until it's filled in", (_amount, blank, message) => {
    expect(checkReceiptAmounts(blank, NOTHING_EXTRA)).toEqual([{ tone: "warning", message }]);
  });
});
