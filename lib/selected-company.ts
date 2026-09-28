import { cookies } from "next/headers";
import { type Company, DEFAULT_COMPANY, isCompany } from "@/types/company";

// A tab shows the company in its address, so each tab keeps its own even when another tab switches. The device
// remembers the company it last switched to, and "/" opens on that one.
const COMPANY_COOKIE = "company";
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/** The main page for a company, e.g. "/?company=Peko+Peko". */
export function companyPath(company: Company): string {
  return `/?${new URLSearchParams({ company })}`;
}

/** The company this device last switched to, or the first company for a device that hasn't switched. */
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
