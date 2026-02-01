import {
  TextractClient,
  AnalyzeExpenseCommand,
  ExpenseDocument,
  ExpenseField,
} from '@aws-sdk/client-textract';
import { ParsedReceiptData } from '@/types/receipt';

const textractClient = new TextractClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

function getFieldValue(field: ExpenseField): string | null {
  const value = field.ValueDetection?.Text || null;
  if (!value) return null;

  return value
    // Replace newlines with spaces (multi-line text like store names)
    .replace(/\n/g, ' ')
    // Collapse multiple spaces into one
    .replace(/\s+/g, ' ')
    // Fix spaces around decimal points: "10. 58" → "10.58"
    .replace(/\s*\.\s*/g, '.')
    .trim();
}

/**
 * Normalize currency values to a consistent format: $X.XX
 * Handles various formats: "$ 2.86", "CAD$ 60.00", "60.00", "60", etc.
 */
function normalizeCurrency(value: string | null): string | null {
  if (!value) return null;

  // Remove currency codes/symbols and extra spaces (CAD, USD, $, etc.)
  const cleaned = value
    .replace(/[A-Z]{2,3}\s*\$?/gi, '') // Remove currency codes like CAD, USD, CAD$
    .replace(/\$/g, '')                 // Remove standalone $ symbols
    .replace(/\s+/g, '')                // Remove all whitespace
    .trim();

  // Extract numeric value (handles formats like "60.00", "60", ".50")
  const numericMatch = cleaned.match(/^-?(\d+\.?\d*|\.\d+)$/);
  if (!numericMatch) return value; // Return original if no valid number found

  const numericValue = parseFloat(cleaned);
  if (isNaN(numericValue)) return value;

  // Format as $X.XX
  return `$${numericValue.toFixed(2)}`;
}

/**
 * Parse a currency string (e.g., "$10.50") to a number
 * Returns null if parsing fails
 */
function parseCurrencyToNumber(value: string | null): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[$,]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Normalize date values to yyyy/mm/dd format
 * Handles various formats: "01/15/2025", "15-01-2025", "January 15, 2025", "26/01/31", etc.
 */
function normalizeDate(value: string | null): string | null {
  if (!value) return null;

  const cleaned = value.trim();

  // Try: YY/MM/DD format (e.g., "26/01/31" → "2026/01/31")
  const yymmdd = cleaned.match(/^(\d{2})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (yymmdd) {
    const [, yy, m, d] = yymmdd;
    const year = parseInt(yy) < 50 ? `20${yy}` : `19${yy}`; // 00-49 = 2000s, 50-99 = 1900s
    const month = m.padStart(2, '0');
    const day = d.padStart(2, '0');
    if (parseInt(month) <= 12 && parseInt(day) <= 31) {
      return `${year}/${month}/${day}`;
    }
  }

  // Try: YYYY-MM-DD or YYYY/MM/DD (ISO format)
  const iso = cleaned.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    const month = m.padStart(2, '0');
    const day = d.padStart(2, '0');
    return `${y}/${month}/${day}`;
  }

  // Try common formats manually: DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    const day = d.padStart(2, '0');
    const month = m.padStart(2, '0');
    // Validate month and day are reasonable
    if (parseInt(month) <= 12 && parseInt(day) <= 31) {
      return `${y}/${month}/${day}`;
    }
  }

  // Try to parse the date using JavaScript's Date parser (for formats like "January 15, 2025")
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  // Return original if we can't parse it
  return value;
}

function findFieldByType(
  fields: ExpenseField[] | undefined,
  types: string[]
): string | null {
  if (!fields) return null;

  for (const type of types) {
    const field = fields.find(
      (f) => f.Type?.Text?.toUpperCase() === type.toUpperCase()
    );
    if (field) {
      return getFieldValue(field);
    }
  }
  return null;
}

function findFieldByLabel(
  fields: ExpenseField[] | undefined,
  labels: string[],
  excludeTypes: string[] = []
): string | null {
  if (!fields) return null;

  for (const label of labels) {
    const field = fields.find(
      (f) => {
        const matchesLabel = f.LabelDetection?.Text?.toUpperCase().includes(label.toUpperCase());
        const fieldType = f.Type?.Text?.toUpperCase() || '';
        const isExcluded = excludeTypes.some(t => fieldType.includes(t.toUpperCase()));
        return matchesLabel && !isExcluded;
      }
    );
    if (field) {
      return getFieldValue(field);
    }
  }
  return null;
}

export function parseExpenseDocument(document: ExpenseDocument): ParsedReceiptData {
  const summaryFields = document.SummaryFields;

  // Debug: log all detected fields and their types
  console.log('Textract Summary Fields:', summaryFields?.map(f => ({
    type: f.Type?.Text,
    label: f.LabelDetection?.Text,
    value: f.ValueDetection?.Text,
  })));

  const subtotal = findFieldByType(summaryFields, ['SUBTOTAL', 'SUB_TOTAL']);
  // Types to exclude when searching for GST amount (these are tax registration IDs, not amounts)
  const taxIdTypes = ['TAX_PAYER_ID', 'VENDOR_GST_NUMBER', 'GST_NUMBER', 'TAX_ID'];
  const gst = findFieldByType(summaryFields, ['TAX'])
    || findFieldByLabel(summaryFields, ['GST', 'TAX'], taxIdTypes);
  const total = findFieldByType(summaryFields, ['TOTAL', 'AMOUNT_DUE', 'GRAND_TOTAL']);
  const invoiceNumber = findFieldByLabel(summaryFields, ['Invoice Number', 'Ref. #', 'Ref #', 'Reference'])
    || findFieldByType(summaryFields, ['INVOICE_RECEIPT_ID', 'INVOICE_NUMBER', 'RECEIPT_ID']);
  const vendor = findFieldByType(summaryFields, ['VENDOR_NAME', 'VENDOR', 'NAME']);
  const receiptDate = findFieldByType(summaryFields, ['INVOICE_RECEIPT_DATE', 'DATE', 'TRANSACTION_DATE']);

  // Calculate subtotal if not provided but total and tax are available
  const normalizedTotal = normalizeCurrency(total);
  const normalizedGst = normalizeCurrency(gst);
  let normalizedSubtotal = normalizeCurrency(subtotal);

  if (!normalizedSubtotal && normalizedTotal) {
    if (normalizedGst) {
      // Calculate subtotal = total - tax
      const totalNum = parseCurrencyToNumber(normalizedTotal);
      const gstNum = parseCurrencyToNumber(normalizedGst);
      if (totalNum !== null && gstNum !== null) {
        const calculatedSubtotal = totalNum - gstNum;
        normalizedSubtotal = `$${calculatedSubtotal.toFixed(2)}`;
      }
    } else {
      // No tax, so subtotal equals total
      normalizedSubtotal = normalizedTotal;
    }
  }

  return {
    subtotal: normalizedSubtotal,
    gst: normalizedGst || '$0.00',
    total: normalizedTotal,
    invoiceNumber,
    vendor,
    receiptDate: normalizeDate(receiptDate),
  };
}

export async function analyzeReceipt(imageBytes: Uint8Array): Promise<ParsedReceiptData> {
  const command = new AnalyzeExpenseCommand({
    Document: {
      Bytes: imageBytes,
    },
  });

  const response = await textractClient.send(command);

  if (!response.ExpenseDocuments || response.ExpenseDocuments.length === 0) {
    return {
      subtotal: null,
      gst: null,
      total: null,
      invoiceNumber: null,
      vendor: null,
      receiptDate: null,
    };
  }

  return parseExpenseDocument(response.ExpenseDocuments[0]);
}
