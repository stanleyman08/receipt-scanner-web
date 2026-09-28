/** The companies whose receipts are kept, each as its own books. A device that hasn't picked one starts on the first. */
export const COMPANIES = ["Carino", "Peko Peko"] as const;
export type Company = (typeof COMPANIES)[number];
export const DEFAULT_COMPANY: Company = COMPANIES[0];
