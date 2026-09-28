import { cookies } from "next/headers";
import { type Company, DEFAULT_COMPANY, isCompany } from "@/types/company";

// Each device remembers the company it last worked in, so the page loads that company's receipts.
const COMPANY_COOKIE = "company";
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/** The company this device last worked in, or the first company for a device that hasn't picked one. */
export async function getSelectedCompany(): Promise<Company> {
  const value = (await cookies()).get(COMPANY_COOKIE)?.value;
  return isCompany(value) ? value : DEFAULT_COMPANY;
}

/** For server actions only: cookies can't be set while a page renders. */
export async function rememberSelectedCompany(company: Company): Promise<void> {
  (await cookies()).set(COMPANY_COOKIE, company, {
    maxAge: ONE_YEAR_IN_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
