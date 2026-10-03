/** The numeric(10,2) limit used by prices, offers and bids in Postgres. */
const MAX_EURO_AMOUNT = 99_999_999.99;

export function isValidEuroAmount(value: unknown, allowZero = false): value is number {
  return typeof value === "number" && Number.isFinite(value) &&
    (allowZero ? value >= 0 : value > 0) && value <= MAX_EURO_AMOUNT &&
    Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;
}

/** Accept a whole localized decimal amount, never parse a numeric prefix. */
export function parseEuroAmountStrict(value: unknown): number | null {
  if (typeof value === "number") return isValidEuroAmount(value, true) ? value : null;
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return isValidEuroAmount(amount, true) ? amount : null;
}
