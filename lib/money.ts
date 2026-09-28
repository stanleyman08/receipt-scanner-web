// Amounts are stored as whole cents. These convert between cents and what people read and type.

// A currency code before or after the amount, e.g. "CAD$ 60.00", "CA $12.00", "USD 7.50" or "60.00 CAD".
const CURRENCY_CODE = /^[A-Z]{1,3}\s*\$|^[A-Z]{3}|[A-Z]{3}$/gi;
// Dollar signs, thousands separators and the stray spaces OCR puts in amounts like "10. 58".
const AMOUNT_NOISE = /[$,\s]/g;
const PLAIN_NUMBER = /^-?(\d+(\.\d*)?|\.\d+)$/;
// The largest amount the database's integer columns hold: $21,474,836.47.
const MAX_CENTS = 2_147_483_647;
const TWO_DECIMALS = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Whole cents for a written amount such as "$1,234.56", or null if it isn't a plain amount the database can hold. */
export function parseAmountCents(value: string | null): number | null {
  if (!value) return null;
  const number = value.trim().replace(CURRENCY_CODE, "").replace(AMOUNT_NOISE, "");
  if (!PLAIN_NUMBER.test(number)) return null;
  const cents = Math.round(Number(number) * 100);
  return Math.abs(cents) <= MAX_CENTS ? cents : null;
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
