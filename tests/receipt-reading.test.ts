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

/**
 * A receipt with line items, each given by its printed line amount (or undefined when it has none), and the lines of
 * text Textract read on it.
 */
function receiptWithItems(prices: (string | undefined)[], lines: string[], ...fields: ExpenseField[]): ExpenseDocument {
  const lineItems = prices.map((price) => ({
    LineItemExpenseFields: [field("ITEM", "Made-up item"), ...(price === undefined ? [] : [field("PRICE", price)])],
  }));
  const blocks = lines.map((text) => ({ BlockType: "LINE" as const, Text: text }));
  return { SummaryFields: fields, LineItemGroups: [{ LineItems: lineItems }], Blocks: blocks };
}

describe("readReceipt", () => {
  it("reads Wholesale Club from its store heading when the vendor field contains the customer's company", () => {
    const fields = readReceipt(
      receipt(field("VENDOR_NAME", "Made-up Catering Ltd"), field("OTHER", "#1234", "wholesale club")),
    );
    expect(fields.vendor).toBe("Wholesale Club");
  });

  it("prefers a readable T&T vendor candidate over a misread one on a faded receipt", () => {
    const fields = readReceipt(receipt(field("VENDOR_NAME", "Made-up Store"), field("VENDOR_NAME", "T&T Supermarket")));
    expect(fields.vendor).toBe("T&T Supermarket");
  });

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
    ["84.00\nCAD$", 8400],
    ["CADS 73.50", 7350],
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
    ["03/28/2026", "2026-03-28"],
    ["07/05/26", "2026-07-05"],
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

  it.each(["Aug 18, 2026 at", "Aug 18, 2026 at 19:18", "Aug 18, 2026 at 7:18 PM"])(
    "reads a Meet Fresh date %s",
    (written) => {
      const fields = readReceipt(
        receipt(field("VENDOR_NAME", "Meet Fresh"), field("INVOICE_RECEIPT_DATE", written)),
        SCANNED_ON,
      );
      expect(fields.receipt_date).toBe("2026-08-18");
    },
  );

  it.each([
    ["28/03/2026", "day first"],
    ["27/09/26", "a two-digit year that would be next year"],
    ["15/04/26", "a two-digit year from years ago"],
    ["25/09/26", "a two-digit date that could just as well be day first"],
    ["25/09/26 14:32", "the same with a time"],
    ["2026-12-01", "a date after the scan"],
    ["12/01/2026", "a month-first date after the scan"],
    ["02/30/26", "a month-first day that doesn't exist"],
    ["28-Mar-35", "a two-digit year far in the future"],
    ["2026-02-30", "a day that doesn't exist"],
    ["2026-13-01", "a month that doesn't exist"],
    ["next Tuesday", "words"],
  ])("leaves the receipt date %s blank (%s)", (written) => {
    expect(readDate(written)).toBeNull();
  });

  it("calculates a missing subtotal by subtracting GST from the total", () => {
    const fields = readReceipt(receipt(field("TAX", "$0.50"), field("TOTAL", "$10.50")));
    expect(fields).toMatchObject({ subtotal_cents: 1000, gst_cents: 50, total_cents: 1050 });
  });

  it("calculates a gas receipt subtotal from an OCR-formatted total and included GST", () => {
    const fields = readReceipt(receipt(field("OTHER", "$3.50", "GST INCLUDED"), field("TOTAL", "73.50\nCAD$")));
    expect(fields).toMatchObject({ subtotal_cents: 7000, gst_cents: 350, total_cents: 7350 });
  });

  it("keeps a printed subtotal when the total also includes a tip", () => {
    const fields = readReceipt(receipt(field("SUBTOTAL", "$20.00"), field("TAX", "$1.00"), field("TOTAL", "$24.00")));
    expect(fields).toMatchObject({ subtotal_cents: 2000, gst_cents: 100, total_cents: 2400 });
  });

  it("calculates a missing subtotal when the printed GST is zero", () => {
    const fields = readReceipt(receipt(field("TAX", "$0.00"), field("TOTAL", "$10.50")));
    expect(fields).toMatchObject({ subtotal_cents: 1050, gst_cents: 0, total_cents: 1050 });
  });

  it.each([
    ["GST is missing", [field("TOTAL", "$10.50")]],
    ["total is missing", [field("TAX", "$0.50")]],
    ["GST is unreadable", [field("TAX", "unclear"), field("TOTAL", "$10.50")]],
    ["total is unreadable", [field("TAX", "$0.50"), field("TOTAL", "unclear")]],
    ["GST exceeds the total", [field("TAX", "$11.00"), field("TOTAL", "$10.50")]],
    ["GST is negative", [field("TAX", "-$0.50"), field("TOTAL", "$10.50")]],
  ])("leaves a missing subtotal blank when %s", (_case, fields) => {
    expect(readReceipt(receipt(...fields)).subtotal_cents).toBeNull();
  });

  it("takes the total as the subtotal, and no GST, when there's neither and the line items add up to the total", () => {
    // A GST registration number is printed on most receipts, and doesn't mean GST was charged.
    const lines = ["Made-up Supplier Ltd", "GST # 81234-5678 RT0001", "Total $425.50"];
    const fields = readReceipt(receiptWithItems(["300.00", "$125.50"], lines, field("TOTAL", "$425.50")));
    expect(fields).toMatchObject({ subtotal_cents: 42550, gst_cents: 0, total_cents: 42550 });
  });

  it("includes a starred modified price when confirming the subtotal from line items", () => {
    const fields = readReceipt(
      receiptWithItems(
        ["W *$0.00", "W $4.00", "U $8.00"],
        ["Reusable bag W *$0.00", '*Modified from: "$2.00', "Total $12.00"],
        field("VENDOR_NAME", "T&T Supermarket"),
        field("TOTAL", "$12.00"),
      ),
    );
    expect(fields).toMatchObject({ subtotal_cents: 1200, gst_cents: 0, total_cents: 1200 });
  });

  it.each([
    ["the line items don't add up to the total, as when a GST line was missed", ["300.00", "100.00"], [], "$420.00"],
    ["a line item has no amount it can read", ["300.00", undefined], [], "$300.00"],
    ["the receipt has no line items", [], [], "$0.00"],
    ["the prices include GST", ["60.00"], ["Fuel 60.00", "Prices include GST"], "$60.00"],
    ["the GST line was read as a line item", ["100.00", "5.00"], ["Item 100.00", "GST 5% 5.00"], "$105.00"],
    ["the receipt shows another sales tax", ["100.00"], ["Item 100.00", "HST incl."], "$100.00"],
  ])("leaves the subtotal and GST blank when %s", (_case, prices, lines, total) => {
    const fields = readReceipt(receiptWithItems(prices, lines, field("TOTAL", total)));
    expect(fields).toMatchObject({ subtotal_cents: null, gst_cents: null });
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

  it("takes GST from the tax breakdown rather than the combined tax, as on a Costco receipt", () => {
    const fields = readReceipt(
      receipt(
        field("VENDOR_GST_NUMBER", "#812345678RT", "GST"),
        field("SUBTOTAL", "100.00", "SUBTOTAL"),
        field("TAX", "12.00", "TAX"),
        field("OTHER", "5%", "GST"),
        field("TAX", "7.00", "(P) PST 7%"),
        field("TAX", "5.00", "(G) GST 5%"),
        field("TOTAL", "112.00", "TOTAL"),
      ),
    );
    expect(fields).toMatchObject({ subtotal_cents: 10000, gst_cents: 500, total_cents: 11200 });
  });

  it("prefers an invoice number found by its label over the receipt ID type", () => {
    const fields = readReceipt(receipt(field("RECEIPT_ID", "000123"), field("OTHER", "INV-77", "Invoice Number")));
    expect(fields.invoice_number).toBe("INV-77");
  });

  it("skips a labelled invoice number with no digits, such as a cancelled card payment's reference", () => {
    const fields = readReceipt(
      receipt(field("OTHER", "TRANSACTION NOT COMPLETED", "Ref. #:"), field("OTHER", "550123", "Ref. #:")),
    );
    expect(fields.invoice_number).toBe("550123");
  });

  describe("invoice number", () => {
    it("uses Wholesale Club's six-digit reference over its long printed invoice number", () => {
      const document = receipt(
        field("VENDOR_NAME", "Wholesale Club"),
        field("INVOICE_RECEIPT_ID", "1234567890123456", "INVOICE #:"),
      );
      document.Blocks = [{ BlockType: "LINE", Text: "Ref #: 554433" }];
      expect(readReceipt(document).invoice_number).toBe("554433");
    });

    it("uses Wholesale Club's labelled six-digit reference ahead of its approval and invoice numbers", () => {
      const fields = readReceipt(
        receipt(
          field("VENDOR_NAME", "Made-up Catering Ltd"),
          field("OTHER", "#1234", "wholesale club"),
          field("INVOICE_RECEIPT_ID", "1234567890123456", "INVOICE #:"),
          field("OTHER", "660000", "APPROVAL"),
          field("OTHER", "554433", "Ref #:"),
        ),
      );
      expect(fields).toMatchObject({ vendor: "Wholesale Club", invoice_number: "554433" });
    });

    it.each(["Ref #: 55443", "Ref #: 5544332", "No readable reference"])(
      "keeps Wholesale Club's invoice when no six-digit reference is readable (%s)",
      (line) => {
        const document = receipt(
          field("VENDOR_NAME", "Wholesale Club"),
          field("INVOICE_RECEIPT_ID", "1234567890123456", "INVOICE #:"),
        );
        document.Blocks = [{ BlockType: "LINE", Text: line }];
        expect(readReceipt(document).invoice_number).toBe("1234567890123456");
      },
    );

    it.each(["Invoice #", "Tax Invoice #", "Supplier Invoice #"])("keeps %s over a transaction number", (label) => {
      const fields = readReceipt(
        receipt(field("INVOICE_RECEIPT_ID", "INV-77", label), field("OTHER", "550123", "Trans:")),
      );
      expect(fields.invoice_number).toBe("INV-77");
    });

    it("doesn't take an invoice date as the invoice number", () => {
      const fields = readReceipt(
        receipt(field("INVOICE_RECEIPT_DATE", "2026-03-28", "Invoice Date"), field("OTHER", "550123", "Trans:")),
      );
      expect(fields.invoice_number).toBe("550123");
    });

    it("doesn't take an invoice total as the invoice number", () => {
      const fields = readReceipt(
        receipt(field("TOTAL", "$12.00", "Invoice Total"), field("INVOICE_RECEIPT_ID", "550123", "Invoice #")),
      );
      expect(fields.invoice_number).toBe("550123");
    });

    it("takes a six-digit transaction number over a short card reference", () => {
      const fields = readReceipt(
        receipt(
          field("VENDOR_NAME", "T&T Supermarket"),
          field("INVOICE_RECEIPT_ID", "550123", "Trans:"),
          field("OTHER", "321", "Ref #:"),
          field("OTHER", "01234A", "AUTH #:"),
        ),
      );
      expect(fields.invoice_number).toBe("550123");
    });

    // The invoice number is a unique ID for finding the paper receipt again: usually a six-digit number with an ID's
    // label. Other numbers of six digits, like a cashier's or a card slip's receipt number, don't count.
    it.each([
      ["an invoice number", "Invoice #", [field("OTHER", "009051", "OP#")]],
      [
        "a card approval number",
        "APPROVAL #",
        [field("INVOICE_RECEIPT_ID", "01234", "TR#"), field("OTHER", "009051", "OP#")],
      ],
      [
        "a card authorization number",
        "AUTH #",
        [field("INVOICE_RECEIPT_ID", "123", "Tran"), field("OTHER", "123000", "RCPT")],
      ],
      ["a card reference number", "Ref. #:", [field("OTHER", "A1234E", "Auth #:")]],
    ])("takes %s of six digits over other numbers", (_case, label, others) => {
      const fields = readReceipt(
        receipt(field("VENDOR_NAME", "Corner Grocery"), ...others, field("OTHER", "550123", label)),
      );
      expect(fields.invoice_number).toBe("550123");
    });

    it("finds the six-digit ID in the lines Textract read when it isn't among the labelled fields", () => {
      const document: ExpenseDocument = {
        SummaryFields: [field("INVOICE_RECEIPT_ID", "123000", "RCPT"), field("OTHER", "001234567", "REF#")],
        Blocks: ["RCPT 123000", "AUTH # 550123", "REF# 001234567"].map((text) => ({ BlockType: "LINE", Text: text })),
      };
      expect(readReceipt(document).invoice_number).toBe("550123");
    });

    it("takes an ID's label written in full", () => {
      const fields = readReceipt(
        receipt(field("OTHER", "660000", "REF#"), field("OTHER", "550123", "AUTHORIZATION #")),
      );
      expect(fields.invoice_number).toBe("550123");
    });

    it("doesn't cut a longer printed number down to six digits", () => {
      const document: ExpenseDocument = {
        SummaryFields: [field("INVOICE_RECEIPT_ID", "A-1042")],
        Blocks: [{ BlockType: "LINE", Text: "Invoice: 123456-01" }],
      };
      expect(readReceipt(document).invoice_number).toBe("A-1042");
    });

    it("keeps a supplier's labelled invoice number over a reference printed elsewhere", () => {
      const document: ExpenseDocument = {
        SummaryFields: [field("INVOICE_RECEIPT_ID", "A-1042", "Invoice #")],
        Blocks: [{ BlockType: "LINE", Text: "Customer Ref 123456" }],
      };
      expect(readReceipt(document).invoice_number).toBe("A-1042");
    });

    it("only takes an ID's label as a whole word", () => {
      const fields = readReceipt(
        receipt(
          field("OTHER", "660000", "PREFERRED"),
          field("OTHER", "770000", "REFUND"),
          field("INVOICE_RECEIPT_ID", "A-1042"),
        ),
      );
      expect(fields.invoice_number).toBe("A-1042");
    });

    it("prefers an approval number to a reference number, both of six digits", () => {
      const fields = readReceipt(receipt(field("OTHER", "660000", "REF#"), field("OTHER", "550123", "AUTH #")));
      expect(fields.invoice_number).toBe("550123");
    });
  });

  describe("month-first dates", () => {
    const SCANNED_ON = new Date("2026-09-27T12:00:00Z");

    it.each(["08/18/2026,", "08/18/2026, 16:38:51"])("reads a Fujiya date %s", (written) => {
      const fields = readReceipt(
        receipt(field("VENDOR_NAME", "Fujiya"), field("INVOICE_RECEIPT_DATE", written)),
        SCANNED_ON,
      );
      expect(fields.receipt_date).toBe("2026-08-18");
    });

    it.each([
      ["07/20/26", "2026-07-20"],
      ["07/05/26", "2026-07-05"],
      ["07/05/2026", "2026-07-05"],
      ["26/07/20", "2026-07-20"],
    ])("reads a Walmart date %s month first when it can be, as %s", (written, date) => {
      const fields = readReceipt(
        receipt(field("VENDOR_NAME", "Walmart"), field("INVOICE_RECEIPT_DATE", written)),
        SCANNED_ON,
      );
      expect(fields.receipt_date).toBe(date);
    });

    it("reads a Safeway date month first", () => {
      const fields = readReceipt(
        receipt(field("VENDOR_NAME", "Safeway Seafair"), field("INVOICE_RECEIPT_DATE", "07/05/2026")),
        SCANNED_ON,
      );
      expect(fields.receipt_date).toBe("2026-07-05");
    });

    it("reads a T&T date month first", () => {
      const fields = readReceipt(
        receipt(field("VENDOR_NAME", "T&T Supermarket"), field("INVOICE_RECEIPT_DATE", "08/18/26")),
        SCANNED_ON,
      );
      expect(fields.receipt_date).toBe("2026-08-18");
    });

    it("recognizes T&T's date format when another vendor name on the scan is misread", () => {
      const fields = readReceipt(
        receipt(
          field("VENDOR_NAME", "1&1 SUPERMARKET"),
          field("VENDOR_NAME", "T&T Supermarket"),
          field("INVOICE_RECEIPT_DATE", "08/18/26"),
        ),
        SCANNED_ON,
      );
      expect(fields.receipt_date).toBe("2026-08-18");
    });

    it("falls back to month first for another vendor", () => {
      const fields = readReceipt(
        receipt(field("VENDOR_NAME", "Corner Grocery"), field("INVOICE_RECEIPT_DATE", "07/20/26")),
        SCANNED_ON,
      );
      expect(fields.receipt_date).toBe("2026-07-20");
    });
  });

  it("leaves an unreadable amount blank", () => {
    expect(readReceipt(receipt(field("TOTAL", "see attached"))).total_cents).toBeNull();
  });

  it("leaves an amount too large to store blank, such as a registration number read as the total", () => {
    expect(readReceipt(receipt(field("TOTAL", "812345678.00"))).total_cents).toBeNull();
  });
});
