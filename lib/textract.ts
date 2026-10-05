import { AnalyzeExpenseCommand, type AnalyzeExpenseCommandOutput, TextractClient } from "@aws-sdk/client-textract";
import { readCheckAmounts, readReceipt } from "@/lib/receipt-reading";
import { type CheckAmounts, NOTHING_TO_CHECK, type ReceiptDetails } from "@/types/receipt";

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

/** The details read from a receipt photo, the amounts read to check them, and everything Textract returned for it. */
export async function analyzeReceipt(
  imageBytes: Uint8Array,
): Promise<{ details: ReceiptDetails; checkAmounts: CheckAmounts; textract: AnalyzeExpenseCommandOutput }> {
  const textract = await textractClient.send(new AnalyzeExpenseCommand({ Document: { Bytes: imageBytes } }));
  const document = textract.ExpenseDocuments?.[0];
  return {
    details: document ? readReceipt(document) : NOTHING_READ,
    checkAmounts: document ? readCheckAmounts(document) : NOTHING_TO_CHECK,
    textract,
  };
}
