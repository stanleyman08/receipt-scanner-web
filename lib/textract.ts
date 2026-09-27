import { AnalyzeExpenseCommand, TextractClient } from "@aws-sdk/client-textract";
import { readReceipt } from "@/lib/receipt-reading";
import type { ReceiptDetails } from "@/types/receipt";

const textractClient = new TextractClient({
  region: process.env.AWS_REGION || "us-west-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const NOTHING_READ: ReceiptDetails = {
  vendor: null,
  receipt_date: null,
  invoice_number: null,
  subtotal_cents: null,
  gst_cents: null,
  total_cents: null,
};

export async function analyzeReceipt(imageBytes: Uint8Array): Promise<ReceiptDetails> {
  const response = await textractClient.send(new AnalyzeExpenseCommand({ Document: { Bytes: imageBytes } }));
  const document = response.ExpenseDocuments?.[0];
  return document ? readReceipt(document) : NOTHING_READ;
}
