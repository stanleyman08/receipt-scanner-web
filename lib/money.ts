// Amounts are stored as whole cents. These convert between cents and what people read and type.

// A currency code before or after the amount, e.g. "CAD$ 60.00", "CA $12.00", "USD 7.50" or "60.00 CAD".
const CURRENCY_CODE = /^[A-Z]{1,3}\s*\$|^[A-Z]{3}|[A-Z]{3}$/gi;
// Dollar signs, thousands separators and the stray spaces OCR puts in amounts like "10. 58".
const AMOUNT_NOISE = /[$,\s]/g;
const PLAIN_NUMBER = /^-?(\d+(\.\d*)?|\.\d+)$/;
const TWO_DECIMALS = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Whole cents for a written amount such as "$1,234.56", or null if it isn't a plain amount. */
export function parseAmountCents(value: string | null): number | null {
  if (!value) return null;
  const number = value.trim().replace(CURRENCY_CODE, "").replace(AMOUNT_NOISE, "");
  return PLAIN_NUMBER.test(number) ? Math.round(Number(number) * 100) : null;
}

/** "$1,234.56" for display, or "—" when there's no amount. */
export function formatCents(cents: number | null): string {
  if (cents === null) return "—";
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${TWO_DECIMALS.format(Math.abs(cents) / 100)}`;
}

/** "1234.56" for an input field, or empty when there's no amount. */
export function centsToInput(cents: number | null): string {
  return cents === null ? "" : (cents / 100).toFixed(2);
}
