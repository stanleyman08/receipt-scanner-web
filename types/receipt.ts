export interface Receipt {
  id: string;
  subtotal: string | null;
  gst: string | null;
  total: string | null;
  invoice_number: string | null;
  vendor: string | null;
  receipt_date: string | null;
  image_url: string | null;
  bucket_id: string;
  created_at: string;
}

export interface ReceiptInsert {
  subtotal?: string | null;
  gst?: string | null;
  total?: string | null;
  invoice_number?: string | null;
  vendor?: string | null;
  receipt_date?: string | null;
  image_url?: string | null;
  bucket_id: string;
}

// Type for edited receipt data before bucket_id is added
export type EditedReceiptData = Omit<ReceiptInsert, 'bucket_id'>;

export interface ParsedReceiptData {
  subtotal: string | null;
  gst: string | null;
  total: string | null;
  invoiceNumber: string | null;
  vendor: string | null;
  receiptDate: string | null;
}

export interface ScanReceiptResponse {
  success: boolean;
  receipt?: Receipt;
  error?: string;
}

export interface ParseReceiptResponse {
  success: boolean;
  data?: ParsedReceiptData;
  error?: string;
}

export interface SaveReceiptResponse {
  success: boolean;
  receipt?: Receipt;
  error?: string;
}
