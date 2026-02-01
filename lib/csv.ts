import { Receipt } from '@/types/receipt';
import { Bucket, MONTH_NAMES } from '@/types/bucket';

function escapeCSVField(field: string | null): string {
  if (field === null || field === undefined) {
    return '';
  }
  // Escape quotes by doubling them and wrap in quotes if contains comma, quote, or newline
  const needsQuotes = field.includes(',') || field.includes('"') || field.includes('\n');
  const escaped = field.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function generateCSV(receipts: Receipt[], bucket?: Bucket | null): string {
  const headers = ['Year', 'Month', 'Category', 'Date', 'Vendor', 'Invoice #', 'Subtotal', 'GST', 'Total'];
  const headerRow = headers.join(',');

  const dataRows = receipts.map((receipt) => {
    const year = bucket?.year?.toString() ?? '';
    const month = bucket ? MONTH_NAMES[bucket.month - 1] : '';
    const category = bucket?.category ?? '';

    return [
      escapeCSVField(year),
      escapeCSVField(month),
      escapeCSVField(category),
      escapeCSVField(receipt.receipt_date),
      escapeCSVField(receipt.vendor),
      escapeCSVField(receipt.invoice_number),
      escapeCSVField(receipt.subtotal),
      escapeCSVField(receipt.gst),
      escapeCSVField(receipt.total),
    ].join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

export function downloadCSV(receipts: Receipt[], filename: string = 'receipts.csv', bucket?: Bucket | null): void {
  const csv = generateCSV(receipts, bucket);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
