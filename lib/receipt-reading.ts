import type { ExpenseDocument, ExpenseField } from "@aws-sdk/client-textract";
import { parseAmountCents } from "@/lib/money";
import type { ReceiptDetails } from "@/types/receipt";

const VENDOR_TYPES = ["VENDOR_NAME", "VENDOR", "NAME"];
const DATE_TYPES = ["INVOICE_RECEIPT_DATE", "DATE", "TRANSACTION_DATE"];
const INVOICE_TYPES = ["INVOICE_RECEIPT_ID", "INVOICE_NUMBER", "RECEIPT_ID"];
const INVOICE_LABELS = ["Invoice Number", "Ref. #", "Ref #", "Reference"];
const SUBTOTAL_TYPES = ["SUBTOTAL", "SUB_TOTAL"];
const GST_TYPES = ["TAX"];
const GST_LABELS = ["GST", "TAX"];
// Fields that hold a tax registration number rather than an amount, even when labelled "GST".
const TAX_ID_TYPES = ["TAX_PAYER_ID", "VENDOR_GST_NUMBER", "GST_NUMBER", "TAX_ID"];
const TOTAL_TYPES = ["TOTAL", "AMOUNT_DUE", "GRAND_TOTAL"];

/**
 * The details a scan pre-fills from Textract's AnalyzeExpense result. Anything the receipt doesn't show, or that
 * can't be read, stays null for the user to fill in: nothing is worked out or assumed.
 */
export function readReceipt(document: ExpenseDocument): ReceiptDetails {
  const fields = document.SummaryFields ?? [];

  return {
    vendor: valueOfType(fields, VENDOR_TYPES),
    receipt_date: parseReceiptDate(valueOfType(fields, DATE_TYPES)),
    invoice_number: valueOfLabel(fields, INVOICE_LABELS) ?? valueOfType(fields, INVOICE_TYPES),
    subtotal_cents: parseAmountCents(valueOfType(fields, SUBTOTAL_TYPES)),
    gst_cents: parseAmountCents(valueOfType(fields, GST_TYPES) ?? valueOfLabel(fields, GST_LABELS, TAX_ID_TYPES)),
    total_cents: parseAmountCents(valueOfType(fields, TOTAL_TYPES)),
  };
}

/** The first field matching the given types, in priority order. */
function valueOfType(fields: ExpenseField[], types: string[]): string | null {
  for (const type of types) {
    const match = fields.find((f) => f.Type?.Text?.toUpperCase() === type);
    if (match) return cleanValue(match);
  }
  return null;
}

/** The first field whose printed label contains one of the labels, skipping fields of the excluded types. */
function valueOfLabel(fields: ExpenseField[], labels: string[], excludedTypes: string[] = []): string | null {
  for (const label of labels) {
    const match = fields.find((f) => {
      const type = f.Type?.Text?.toUpperCase() ?? "";
      return (
        f.LabelDetection?.Text?.toUpperCase().includes(label.toUpperCase()) &&
        !excludedTypes.some((excluded) => type.includes(excluded))
      );
    });
    if (match) return cleanValue(match);
  }
  return null;
}

function cleanValue(field: ExpenseField): string | null {
  const text = field.ValueDetection?.Text;
  if (!text) return null;
  return text.replace(/\s+/g, " ").trim();
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
// Two-digit years are read as this century: 26 is 2026.
const CENTURY = 2000;
// Year first, the order receipts use: 2026-03-28, 2026/3/8, 2026.03.28, or a two-digit year like 26/03/28.
const YEAR_FIRST = /^(\d{4}|\d{2})[-/.](\d{1,2})[-/.](\d{1,2})$/;
// A month name makes the order unambiguous: "Mar 28, 2026" or "28 March 2026" / "28-Mar-26".
const MONTH_NAME_THEN_DAY = /^([a-z]{3,})\.?[\s-]+(\d{1,2}),?[\s-]+(\d{4}|\d{2})$/i;
const DAY_THEN_MONTH_NAME = /^(\d{1,2})[\s-]+([a-z]{3,})\.?,?[\s-]+(\d{4}|\d{2})$/i;

// Numeric dates in any other order (28/03/2026, 03/28/2026) are ambiguous, so they stay blank.
function parseReceiptDate(value: string | null): string | null {
  if (!value) return null;
  const text = value.trim();

  const yearFirst = YEAR_FIRST.exec(text);
  if (yearFirst) {
    const [, year, month, day] = yearFirst;
    return toIsoDate(fullYear(year), Number(month), Number(day));
  }
  const monthNameThenDay = MONTH_NAME_THEN_DAY.exec(text);
  if (monthNameThenDay) {
    const [, month, day, year] = monthNameThenDay;
    return toIsoDate(fullYear(year), monthNumber(month), Number(day));
  }
  const dayThenMonthName = DAY_THEN_MONTH_NAME.exec(text);
  if (dayThenMonthName) {
    const [, day, month, year] = dayThenMonthName;
    return toIsoDate(fullYear(year), monthNumber(month), Number(day));
  }
  return null;
}

function fullYear(year: string): number {
  return year.length === 2 ? CENTURY + Number(year) : Number(year);
}

/** 1–12 for a month name or abbreviation, 0 for anything else. */
function monthNumber(name: string): number {
  return MONTHS.indexOf(name.slice(0, 3).toLowerCase()) + 1;
}

/** YYYY-MM-DD, or null for a date that doesn't exist (month 13, February 30). */
function toIsoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  const exists = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return exists ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;
}
