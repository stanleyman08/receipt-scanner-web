import ReceiptsApp from "@/components/ReceiptsApp";
import { requireSessionOrRedirect } from "@/lib/auth-session";
import { getSql } from "@/lib/db/sql";
import { listBuckets, listReceipts } from "@/lib/receipt-store";
import { getSelectedCompany } from "@/lib/selected-company";

export default async function Home() {
  await requireSessionOrRedirect();
  const company = await getSelectedCompany();
  const sql = getSql();
  const [buckets, receipts] = await Promise.all([listBuckets(sql), listReceipts(sql, company)]);
  // Keyed by company, so switching companies starts the screen afresh with that company's receipts.
  return <ReceiptsApp key={company} company={company} initialBuckets={buckets} initialReceipts={receipts} />;
}
