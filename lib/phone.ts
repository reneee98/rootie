/** Normalize Slovak local numbers and explicit international numbers to E.164. */
export function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw || !/^\+?[\d\s().-]+$/.test(raw)) return null;
  let digits = raw.replace(/\D/g, "");

  if (raw.startsWith("+")) {
    return /^[1-9]\d{8,14}$/.test(digits) ? `+${digits}` : null;
  }
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
    return /^[1-9]\d{8,14}$/.test(digits) ? `+${digits}` : null;
  }
  if (/^0\d{9}$/.test(digits)) digits = digits.slice(1);
  if (/^[1-9]\d{8}$/.test(digits)) return `+421${digits}`;
  if (/^421\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}
