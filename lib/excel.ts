import ExcelJS from 'exceljs';
import { Receipt } from '@/types/receipt';
import { Bucket, MONTH_NAMES } from '@/types/bucket';

const BUSINESS_NAME = 'Carino';

const thinBorder: ExcelJS.Border = { style: 'thin', color: { argb: 'FF000000' } };
const cellBorder: Partial<ExcelJS.Borders> = {
  top: thinBorder,
  left: thinBorder,
  bottom: thinBorder,
  right: thinBorder,
};

function parseMonetary(value: string | null): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[$,\s]/g, '').replace(/^-$/, '0');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function buildSheet(ws: ExcelJS.Worksheet, receipts: Receipt[], bucket: Bucket): void {
  const monthName = MONTH_NAMES[bucket.month - 1];
  const title = `${BUSINESS_NAME} ${monthName} ${bucket.year} - ${bucket.category}`;
  const headers = ['Date', 'Vendor', 'Invoice #', 'Subtotal', 'GST', 'Total'];

  // Row 1: Title (merged across all columns, bold)
  ws.mergeCells('A1:F1');
  const titleCell = ws.getCell('A1');
  titleCell.value = title;
  titleCell.font = { bold: true, size: 18 };

  // Row 2: blank

  // Row 3: Headers (bold)
  const headerRow = ws.getRow(3);
  headers.forEach((header, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = header;
    cell.font = { bold: true };
  });

  // Data rows starting at row 4
  const dataStartRow = 4;
  receipts.forEach((receipt, idx) => {
    const row = ws.getRow(dataStartRow + idx);
    row.getCell(1).value = receipt.receipt_date ?? '';
    row.getCell(2).value = receipt.vendor ?? '';
    row.getCell(3).value = receipt.invoice_number ?? '';

    const subtotal = parseMonetary(receipt.subtotal);
    const gst = parseMonetary(receipt.gst);
    const total = parseMonetary(receipt.total);

    if (subtotal !== null) row.getCell(4).value = subtotal;
    if (gst !== null) row.getCell(5).value = gst;
    if (total !== null) row.getCell(6).value = total;

    // Add borders to all cells in the row
    for (let c = 1; c <= 6; c++) {
      row.getCell(c).border = cellBorder;
    }
  });

  const dataEndRow = dataStartRow + receipts.length - 1;

  // Format monetary columns as currency
  for (let r = dataStartRow; r <= dataEndRow; r++) {
    for (const col of [4, 5, 6]) {
      ws.getRow(r).getCell(col).numFmt = '$#,##0.00';
    }
  }

  // Blank row after data
  const totalsRow = dataEndRow + 2;

  // Totals row - SUM formula for Total column (F), bold
  const totalsRowObj = ws.getRow(totalsRow);
  if (receipts.length > 0) {
    totalsRowObj.getCell(6).value = {
      formula: `SUM(F${dataStartRow}:F${dataEndRow})`,
    } as ExcelJS.CellFormulaValue;
  } else {
    totalsRowObj.getCell(6).value = 0;
  }
  totalsRowObj.getCell(6).numFmt = '$#,##0.00';
  totalsRowObj.getCell(6).font = { bold: true };

  // Set column widths
  ws.columns = [
    { width: 14 },  // Date
    { width: 32 },  // Vendor
    { width: 17 },  // Invoice #
    { width: 14 },  // Subtotal
    { width: 12 },  // GST
    { width: 14 },  // Total
  ];
}

function triggerDownload(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadBucketExcel(receipts: Receipt[], bucket: Bucket): Promise<void> {
  const monthName = MONTH_NAMES[bucket.month - 1];
  const sheetName = `${monthName} - ${bucket.category}`;
  const filename = `${BUSINESS_NAME} ${monthName} ${bucket.year} - ${bucket.category}.xlsx`;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  buildSheet(ws, receipts, bucket);

  const buffer = await wb.xlsx.writeBuffer();
  triggerDownload(buffer as ArrayBuffer, filename);
}

export async function downloadYearExcel(
  receipts: Receipt[],
  bucketMap: Map<string, Bucket>,
  year: number
): Promise<void> {
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

  const wb = new ExcelJS.Workbook();

  for (const bucket of bucketsWithReceipts) {
    const bucketReceipts = receiptsByBucket.get(bucket.id) ?? [];
    const monthName = MONTH_NAMES[bucket.month - 1];
    const sheetName = `${monthName} - ${bucket.category}`;

    const ws = wb.addWorksheet(sheetName);
    buildSheet(ws, bucketReceipts, bucket);
  }

  // If no sheets were added, create an empty one
  if (bucketsWithReceipts.length === 0) {
    const ws = wb.addWorksheet('Empty');
    ws.getCell('A1').value = 'No receipts found';
  }

  const filename = `${BUSINESS_NAME} ${year}.xlsx`;
  const buffer = await wb.xlsx.writeBuffer();
  triggerDownload(buffer as ArrayBuffer, filename);
}
