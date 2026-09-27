import ReceiptsApp from "@/components/ReceiptsApp";
import { requireSessionOrRedirect } from "@/lib/auth-session";
import { getSql } from "@/lib/db/sql";
import { listBuckets, listReceipts } from "@/lib/receipt-store";

export default async function Home() {
  await requireSessionOrRedirect();
  const sql = getSql();
  const [buckets, receipts] = await Promise.all([listBuckets(sql), listReceipts(sql)]);
  return <ReceiptsApp initialBuckets={buckets} initialReceipts={receipts} />;
}
