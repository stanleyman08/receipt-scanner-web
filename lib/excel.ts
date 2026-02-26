import * as XLSX from 'xlsx';
import { Receipt } from '@/types/receipt';
import { Bucket, MONTH_NAMES } from '@/types/bucket';

const BUSINESS_NAME = 'Carino';

function parseMonetary(value: string | null): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[$,\s]/g, '').replace(/^-$/, '0');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function buildSheet(receipts: Receipt[], bucket: Bucket): XLSX.WorkSheet {
  const monthName = MONTH_NAMES[bucket.month - 1];
  const title = `${BUSINESS_NAME} ${monthName} ${bucket.year} - ${bucket.category}`;
  const headers = ['Date', 'Vendor', 'Invoice #', 'Subtotal', 'GST', 'Total'];

  // Build rows: title, blank, headers, data, blank, totals
  const rows: (string | number | null)[][] = [];

  // Row 0: Title (first cell only, we'll merge later)
  rows.push([title, null, null, null, null, null]);
  // Row 1: blank
  rows.push([]);
  // Row 2: headers
  rows.push(headers);

  // Data rows starting at row 3
  for (const receipt of receipts) {
    rows.push([
      receipt.receipt_date ?? '',
      receipt.vendor ?? '',
      receipt.invoice_number ?? '',
      parseMonetary(receipt.subtotal),
      parseMonetary(receipt.gst),
      parseMonetary(receipt.total),
    ]);
  }

  const dataStartRow = 3; // 0-indexed
  const dataEndRow = dataStartRow + receipts.length - 1;

  // Blank row
  rows.push([]);

  // Totals row - use SUM formula for Total column (column F = index 5)
  const totalsRowIndex = rows.length;
  const totalColLetter = 'F';
  const formula = receipts.length > 0
    ? `SUM(${totalColLetter}${dataStartRow + 1}:${totalColLetter}${dataEndRow + 1})`
    : '0';
  rows.push([null, null, null, null, null, null]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set the totals formula cell
  const totalsCellRef = `${totalColLetter}${totalsRowIndex + 1}`;
  ws[totalsCellRef] = { t: 'n', f: formula };

  // Merge title row across all columns
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];

  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // Date
    { wch: 30 }, // Vendor
    { wch: 15 }, // Invoice #
    { wch: 12 }, // Subtotal
    { wch: 10 }, // GST
    { wch: 12 }, // Total
  ];

  // Format monetary cells as currency
  for (let r = dataStartRow; r <= dataEndRow; r++) {
    for (const col of ['D', 'E', 'F']) {
      const ref = `${col}${r + 1}`;
      if (ws[ref] && ws[ref].t === 'n') {
        ws[ref].z = '$#,##0.00';
      }
    }
  }

  // Format totals cell as currency
  if (ws[totalsCellRef]) {
    ws[totalsCellRef].z = '$#,##0.00';
  }

  return ws;
}

export function downloadBucketExcel(receipts: Receipt[], bucket: Bucket): void {
  const monthName = MONTH_NAMES[bucket.month - 1];
  const sheetName = `${monthName} - ${bucket.category}`;

  const wb = XLSX.utils.book_new();
  const ws = buildSheet(receipts, bucket);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const filename = `receipts-${bucket.year}-${String(bucket.month).padStart(2, '0')}-${bucket.category}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function downloadYearExcel(
  receipts: Receipt[],
  bucketMap: Map<string, Bucket>,
  year: number
): void {
  // Group receipts by bucket
  const receiptsByBucket = new Map<string, Receipt[]>();
  for (const receipt of receipts) {
    if (!receipt.bucket_id) continue;
    const group = receiptsByBucket.get(receipt.bucket_id);
    if (group) {
      group.push(receipt);
    } else {
      receiptsByBucket.set(receipt.bucket_id, [receipt]);
    }
  }

  // Collect buckets that have receipts, sorted by month asc then category asc
  const bucketsWithReceipts = [...receiptsByBucket.keys()]
    .map((id) => bucketMap.get(id))
    .filter((b): b is Bucket => b !== undefined)
    .sort((a, b) => {
      if (a.month !== b.month) return a.month - b.month;
      return a.category.localeCompare(b.category);
    });

  const wb = XLSX.utils.book_new();

  for (const bucket of bucketsWithReceipts) {
    const bucketReceipts = receiptsByBucket.get(bucket.id) ?? [];
    const monthName = MONTH_NAMES[bucket.month - 1];
    const sheetName = `${monthName} - ${bucket.category}`;

    const ws = buildSheet(bucketReceipts, bucket);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  // If no sheets were added, create an empty one
  if (bucketsWithReceipts.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([['No receipts found']]);
    XLSX.utils.book_append_sheet(wb, ws, 'Empty');
  }

  XLSX.writeFile(wb, `Carino ${year}.xlsx`);
}
