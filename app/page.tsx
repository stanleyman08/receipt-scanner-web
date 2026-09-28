import { redirect } from "next/navigation";
import ReceiptsApp from "@/components/ReceiptsApp";
import { requireSessionOrRedirect } from "@/lib/auth-session";
import { getSql } from "@/lib/db/sql";
import { listBuckets, listReceipts } from "@/lib/receipt-store";
import { companyPath, getSelectedCompany } from "@/lib/selected-company";
import { isCompany } from "@/types/company";

export default async function Home({ searchParams }: { searchParams: Promise<{ company?: string | string[] }> }) {
  await requireSessionOrRedirect();
  // The company comes from the address, so this tab stays on it; "/" goes to the one this device last switched to.
  const { company } = await searchParams;
  if (!isCompany(company)) redirect(companyPath(await getSelectedCompany()));
  const sql = getSql();
  const [buckets, receipts] = await Promise.all([listBuckets(sql), listReceipts(sql, company)]);
  // Keyed by company, so switching companies starts the screen afresh with that company's receipts.
  return <ReceiptsApp key={company} company={company} initialBuckets={buckets} initialReceipts={receipts} />;
}
