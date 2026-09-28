import type { Block, ExpenseDocument, ExpenseField } from "@aws-sdk/client-textract";
import { parseAmountCents } from "@/lib/money";
import type { ReceiptDetails } from "@/types/receipt";

const VENDOR_TYPES = ["VENDOR_NAME", "VENDOR", "NAME"];
const DATE_TYPES = ["INVOICE_RECEIPT_DATE", "DATE", "TRANSACTION_DATE"];
const INVOICE_TYPES = ["INVOICE_RECEIPT_ID", "INVOICE_NUMBER", "RECEIPT_ID"];
const INVOICE_LABELS = ["Invoice Number", "Ref. #", "Ref #", "Reference"];
// The invoice number is a unique ID for finding the paper receipt again, usually six digits: a supplier's invoice
// number, or else the card slip's approval, authorization or reference number, in that order. A label starts a word,
// short or in full, so "PREFERRED" and "REFUND" aren't a "REF".
const SIX_DIGIT_ID_LABELS = [/\bINVOICE/i, /\bAPPROVAL/i, /\bAUTH(ORI[SZ]ATION)?\b/i, /\bREF(ERENCE)?\b/i];
const SIX_DIGITS = /^\d{6}$/;
// Six digits right after a label on its printed line, and not part of a longer number: "AUTH # 865464", "Ref. #: 448816".
const THEN_SIX_DIGITS = /^\W{0,4}(\d{6})(?=\s|$)/;
const INVOICE_LABEL = ["Invoice"];
const SUBTOTAL_TYPES = ["SUBTOTAL", "SUB_TOTAL"];
const GST_TYPES = ["TAX"];
const GST_LABELS = ["GST", "TAX"];
// Fields that hold a tax registration number rather than an amount, even when labelled "GST".
const TAX_ID_TYPES = ["TAX_PAYER_ID", "VENDOR_GST_NUMBER", "GST_NUMBER", "TAX_ID"];
const TOTAL_TYPES = ["TOTAL", "AMOUNT_DUE", "GRAND_TOTAL"];

/** How one vendor prints its receipts, where the general rules would read them differently. */
interface VendorRule {
  /** Matches the vendor's name as Textract reads it. */
  vendor: RegExp;
  /** Whether its all-number dates are printed month first, as 07/20/26 is 20 July 2026. */
  isMonthFirst: boolean;
}

// Vendors whose receipts come in often and print all-number dates in an order the general rules can't tell apart.
const VENDOR_RULES: VendorRule[] = [
  { vendor: /walmart/i, isMonthFirst: true },
  { vendor: /safeway/i, isMonthFirst: true },
];

/**
 * The details a scan pre-fills from Textract's AnalyzeExpense result. Anything the receipt doesn't show, or that
 * can't be read, stays null for the user to fill in: nothing is assumed. The one thing worked out is a receipt that
 * shows neither a subtotal nor GST, mentions no sales tax, and whose line items add up to its total: nothing else was
 * charged, so its subtotal is the total and its GST is 0. Had a GST line been missed, the items wouldn't add up to the
 * total, and prices that include GST, or a GST line read as an item, mention the tax.
 */
export function readReceipt(document: ExpenseDocument, scannedOn: Date = new Date()): ReceiptDetails {
  const fields = document.SummaryFields ?? [];
  const vendor = valueOfType(fields, VENDOR_TYPES);
  const rule = VENDOR_RULES.find((candidate) => vendor !== null && candidate.vendor.test(vendor));
  const subtotalCents = parseAmountCents(valueOfType(fields, SUBTOTAL_TYPES));
  const gstCents = parseAmountCents(valueOfType(fields, GST_TYPES) ?? valueOfLabel(fields, GST_LABELS, TAX_ID_TYPES));
  const totalCents = parseAmountCents(valueOfType(fields, TOTAL_TYPES));
  const isOnlyLineItems =
    subtotalCents === null &&
    gstCents === null &&
    totalCents !== null &&
    !mentionsSalesTax(document) &&
    lineItemsCents(document) === totalCents;

  return {
    vendor,
    receipt_date: parseReceiptDate(valueOfType(fields, DATE_TYPES), scannedOn, rule?.isMonthFirst ?? false),
    invoice_number:
      sixDigitIdInFields(fields) ??
      valueOfLabel(fields, INVOICE_LABEL) ??
      sixDigitIdInLines(document.Blocks ?? []) ??
      valueOfLabel(fields, INVOICE_LABELS) ??
      valueOfType(fields, INVOICE_TYPES),
    subtotal_cents: isOnlyLineItems ? totalCents : subtotalCents,
    gst_cents: isOnlyLineItems ? 0 : gstCents,
    total_cents: totalCents,
  };
}

const SALES_TAX = /\b(GST|HST|PST|QST|tax(es)?)\b/i;
// A business number, as in "GST # 81234-5678 RT0001": the line registers the vendor for GST, and says nothing of a charge.
const BUSINESS_NUMBER = /\d{5}[\s-]?\d{4}/;

/** Whether any line Textract read mentions a sales tax, other than the vendor's GST registration number. */
function mentionsSalesTax(document: ExpenseDocument): boolean {
  return (document.Blocks ?? []).some(
    (block) =>
      block.BlockType === "LINE" && SALES_TAX.test(block.Text ?? "") && !BUSINESS_NUMBER.test(block.Text ?? ""),
  );
}

/** What the line items' printed amounts add up to, or null when there are none or one can't be read. */
function lineItemsCents(document: ExpenseDocument): number | null {
  const items = (document.LineItemGroups ?? []).flatMap((group) => group.LineItems ?? []);
  const amounts = items.map((item) => parseAmountCents(valueOfType(item.LineItemExpenseFields ?? [], ["PRICE"])));
  if (amounts.length === 0 || amounts.includes(null)) return null;
  return amounts.reduce<number>((sum, cents) => sum + (cents ?? 0), 0);
}

/** The first labelled field of six digits whose label names an ID, in the order of SIX_DIGIT_ID_LABELS. */
function sixDigitIdInFields(fields: ExpenseField[]): string | null {
  for (const label of SIX_DIGIT_ID_LABELS) {
    const field = fields.find((f) => label.test(f.LabelDetection?.Text ?? "") && SIX_DIGITS.test(cleanValue(f) ?? ""));
    if (field) return cleanValue(field);
  }
  return null;
}

/**
 * The same, from the printed lines, as "AUTH # 865464": Textract doesn't always return a card slip's number as a
 * field. Tried after a field labelled "Invoice", so a reference printed elsewhere doesn't replace a supplier's invoice.
 */
function sixDigitIdInLines(blocks: Block[]): string | null {
  const lines = blocks.filter((block) => block.BlockType === "LINE").map((block) => block.Text ?? "");
  for (const label of SIX_DIGIT_ID_LABELS) {
    for (const line of lines) {
      const match = label.exec(line);
      const digits = match && THEN_SIX_DIGITS.exec(line.slice(match.index + match[0].length));
      if (digits) return digits[1];
    }
  }
  return null;
}

/** The first field matching the given types, in priority order. */
function valueOfType(fields: ExpenseField[], types: string[]): string | null {
  for (const type of types) {
    const match = fields.find((f) => f.Type?.Text?.toUpperCase() === type);
    if (match) return cleanValue(match);
  }
  return null;
}

/**
 * The first field whose printed label contains one of the labels, skipping fields of the excluded types. Its value
 * must contain a digit, as invoice numbers and amounts do: a cancelled card payment's "Ref. #" reads "TRANSACTION NOT
 * COMPLETED".
 */
function valueOfLabel(fields: ExpenseField[], labels: string[], excludedTypes: string[] = []): string | null {
  for (const label of labels) {
    const match = fields.find((f) => {
      const type = f.Type?.Text?.toUpperCase() ?? "";
      return (
        f.LabelDetection?.Text?.toUpperCase().includes(label.toUpperCase()) &&
        !excludedTypes.some((excluded) => type.includes(excluded)) &&
        /\d/.test(f.ValueDetection?.Text ?? "")
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
// Month first, read only for a vendor known to print it: 07/20/26 or 07/20/2026.
const MONTH_FIRST = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})$/;
// A month name makes the order unambiguous: "Mar 28, 2026" or "28 March 2026" / "28-Mar-26".
const MONTH_NAME_THEN_DAY = /^([a-z]{3,})\.?[\s-]+(\d{1,2}),?[\s-]+(\d{4}|\d{2})$/i;
const DAY_THEN_MONTH_NAME = /^(\d{1,2})[\s-]+([a-z]{3,})\.?,?[\s-]+(\d{4}|\d{2})$/i;
// A weekday before the date or a time after it, as in "Sat, Mar 28, 2026" or "2026-03-28 14:32", is dropped.
const LEADING_WEEKDAY = /^(mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?,?\s+/i;
const TRAILING_TIME = /,?\s+\d{1,2}:\d{2}(:\d{2})?(\s*[ap]\.?m\.?)?$/i;

// Numeric dates in any other order (28/03/2026, 03/28/2026) are ambiguous, so they stay blank, unless the vendor is
// known to print them month first. So does a date after the scan, which can only be a misread.
function parseReceiptDate(value: string | null, scannedOn: Date, isMonthFirst: boolean): string | null {
  if (!value) return null;
  const text = value.trim().replace(LEADING_WEEKDAY, "").replace(TRAILING_TIME, "");
  const date = isMonthFirst ? readMonthFirstDate(text, scannedOn) : readDate(text, scannedOn);
  return date !== null && date <= scanDate(scannedOn) ? date : null;
}

// Month first when that makes a date, as 07/20/26; otherwise read as any other vendor's, as 26/07/20 year first is.
function readMonthFirstDate(text: string, scannedOn: Date): string | null {
  const monthFirst = MONTH_FIRST.exec(text);
  if (monthFirst) {
    const [, month, day, year] = monthFirst;
    const date =
      year.length === 4 ? toIsoDate(Number(year), Number(month), Number(day)) : recentDate(year, month, day, scannedOn);
    if (date !== null) return date;
  }
  return readDate(text, scannedOn);
}

function readDate(text: string, scannedOn: Date): string | null {
  const yearFirst = YEAR_FIRST.exec(text);
  if (yearFirst) {
    const [, year, month, day] = yearFirst;
    if (year.length === 4) return toIsoDate(Number(year), Number(month), Number(day));
    // A two-digit year first could also be a day: 25/09/26 reads as 26 September 2025 or 25 September 2026. It's
    // read only when it's this year or last year and the date doesn't read just as well day first.
    const dayFirst = day.length === 2 ? recentDate(day, month, year, scannedOn) : null;
    return dayFirst === null ? recentDate(year, month, day, scannedOn) : null;
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

// A date with a two-digit year that exists, falls in the scan's year or the year before, and isn't after the scan.
function recentDate(year: string, month: string, day: string, scannedOn: Date): string | null {
  const yearNumber = fullYear(year);
  const date = toIsoDate(yearNumber, Number(month), Number(day));
  return date !== null && isRecentYear(yearNumber, scannedOn) && date <= scanDate(scannedOn) ? date : null;
}

function isRecentYear(year: number, scannedOn: Date): boolean {
  const scanYear = scannedOn.getFullYear();
  return year === scanYear || year === scanYear - 1;
}

// The day of the scan as YYYY-MM-DD, in UTC, which runs ahead of Canadian time.
function scanDate(scannedOn: Date): string {
  return scannedOn.toISOString().slice(0, 10);
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
