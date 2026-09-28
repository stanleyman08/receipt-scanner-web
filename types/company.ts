/**
 * The companies whose receipts are kept, each as its own books. A device that hasn't switched starts on the first.
 * The buckets table checks for the same names (lib/db/schema.ts), so changing this list needs a schema change too.
 */
export const COMPANIES = ["Carino", "Peko Peko"] as const;
export type Company = (typeof COMPANIES)[number];
export const DEFAULT_COMPANY: Company = COMPANIES[0];

export function isCompany(value: unknown): value is Company {
  return COMPANIES.some((company) => company === value);
}
