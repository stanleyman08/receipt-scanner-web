import type { ExpenseDocument, ExpenseField } from "@aws-sdk/client-textract";
import { describe, expect, it } from "vitest";
import { readReceipt } from "@/lib/receipt-reading";

// Made-up receipts shaped like Textract AnalyzeExpense output. No real receipt data: the repo is public.
function field(type: string, value: string, label?: string): ExpenseField {
  return {
    Type: { Text: type },
    ValueDetection: { Text: value },
    ...(label ? { LabelDetection: { Text: label } } : {}),
  };
}

function receipt(...fields: ExpenseField[]): ExpenseDocument {
  return { SummaryFields: fields };
}

describe("readReceipt", () => {
  it("reads the vendor, receipt date, invoice number and amounts of a typical receipt", () => {
    const fields = readReceipt(
      receipt(
        field("VENDOR_NAME", "Corner Grocery"),
        field("INVOICE_RECEIPT_DATE", "2026-03-28"),
        field("INVOICE_RECEIPT_ID", "A-1042"),
        field("SUBTOTAL", "$20.00"),
        field("TAX", "$1.00"),
        field("TOTAL", "$21.00"),
      ),
    );

    expect(fields).toEqual({
      vendor: "Corner Grocery",
      receipt_date: "2026-03-28",
      invoice_number: "A-1042",
      subtotal_cents: 2000,
      gst_cents: 100,
      total_cents: 2100,
    });
  });

  it.each([
    ["$1,234.56", 123456],
    ["CAD$ 60.00", 6000],
    ["CA$12.00", 1200],
    ["US$ 7.50", 750],
    ["CA $12.00", 1200],
    ["USD 7.5", 750],
    ["10. 58", 1058],
    ["60", 6000],
  ])("reads the amount %s as %i cents", (written, cents) => {
    expect(readReceipt(receipt(field("TOTAL", written))).total_cents).toBe(cents);
  });

  // A two-digit year is only trusted near the day of the scan, so the date tests pin that day.
  const SCANNED_ON = new Date("2026-09-27T12:00:00Z");
  function readDate(written: string) {
    return readReceipt(receipt(field("INVOICE_RECEIPT_DATE", written)), SCANNED_ON).receipt_date;
  }

  it.each([
    ["2026-03-28", "2026-03-28"],
    ["2024-11-05", "2024-11-05"],
    ["2026/03/28", "2026-03-28"],
    ["2026.03.28", "2026-03-28"],
    ["2026-3-8", "2026-03-08"],
    ["26/03/28", "2026-03-28"],
    ["25/12/31", "2025-12-31"],
    ["Mar 28, 2026", "2026-03-28"],
    ["March 28 2026", "2026-03-28"],
    ["28 Mar 2026", "2026-03-28"],
    ["28-Mar-2026", "2026-03-28"],
    ["28-Mar-26", "2026-03-28"],
    ["Mar 28, 26", "2026-03-28"],
    ["2026-03-28 14:32", "2026-03-28"],
    ["2026/03/28 2:32 PM", "2026-03-28"],
    ["Mar 28, 2026, 2:32 PM", "2026-03-28"],
    ["Sat, Mar 28, 2026", "2026-03-28"],
    ["Saturday 28 March 2026", "2026-03-28"],
  ])("reads the receipt date %s as %s", (written, date) => {
    expect(readDate(written)).toBe(date);
  });

  it.each([
    ["28/03/2026", "day first"],
    ["03/28/2026", "month first"],
    ["27/09/26", "a two-digit year that would be next year"],
    ["15/04/26", "a two-digit year from years ago"],
    ["25/09/26", "a two-digit date that could just as well be day first"],
    ["25/09/26 14:32", "the same with a time"],
    ["2026-12-01", "a date after the scan"],
    ["28-Mar-35", "a two-digit year far in the future"],
    ["2026-02-30", "a day that doesn't exist"],
    ["2026-13-01", "a month that doesn't exist"],
    ["next Tuesday", "words"],
  ])("leaves the receipt date %s blank (%s)", (written) => {
    expect(readDate(written)).toBeNull();
  });

  it("leaves the subtotal blank when the receipt doesn't show one", () => {
    const fields = readReceipt(receipt(field("TAX", "$0.50"), field("TOTAL", "$10.50")));
    expect(fields).toMatchObject({ subtotal_cents: null, gst_cents: 50, total_cents: 1050 });
  });

  it("leaves GST blank when the receipt doesn't show it", () => {
    const fields = readReceipt(receipt(field("SUBTOTAL", "$12.00"), field("TOTAL", "$12.00")));
    expect(fields).toMatchObject({ subtotal_cents: 1200, gst_cents: null, total_cents: 1200 });
  });

  it("finds GST by its label, but never takes a GST registration number as the amount", () => {
    const fields = readReceipt(
      receipt(field("VENDOR_GST_NUMBER", "812345678", "GST #"), field("OTHER", "$0.75", "GST 5%")),
    );
    expect(fields.gst_cents).toBe(75);
  });

  it("prefers an invoice number found by its label over the receipt ID type", () => {
    const fields = readReceipt(receipt(field("RECEIPT_ID", "000123"), field("OTHER", "INV-77", "Invoice Number")));
    expect(fields.invoice_number).toBe("INV-77");
  });

  it("leaves an unreadable amount blank", () => {
    expect(readReceipt(receipt(field("TOTAL", "see attached"))).total_cents).toBeNull();
  });

  it("leaves an amount too large to store blank, such as a registration number read as the total", () => {
    expect(readReceipt(receipt(field("TOTAL", "812345678.00"))).total_cents).toBeNull();
  });
});
