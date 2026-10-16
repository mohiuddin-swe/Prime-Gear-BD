const BANGLA_DIGITS = "০১২৩৪৫৬৭৮৯";

/**
 * The one place Bangladeshi mobile numbers are normalized. Returns `01XXXXXXXXX` (11 digits) or null.
 * Accepts spaces/dashes/brackets, Bangla digits, `+880`, `880`, `00880` prefixes and a missing leading 0.
 * Operator prefixes 013-019 only.
 */
export function normalizeBdPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = input
    .replace(/[০-৯]/g, (d) => String(BANGLA_DIGITS.indexOf(d)))
    .replace(/[\s\-().]/g, "");
  if (s.startsWith("+")) s = s.slice(1);
  if (s.startsWith("00")) s = s.slice(2);
  if (!/^\d+$/.test(s)) return null;
  if (s.startsWith("880")) s = s.slice(3);
  if (s.length === 10 && s.startsWith("1")) s = `0${s}`;
  return /^01[3-9]\d{8}$/.test(s) ? s : null;
}

/** 01712345678 -> 017******78 (public pages must not show the full number) */
export function maskPhone(phone: string): string {
  return phone.length < 6
    ? phone
    : `${phone.slice(0, 3)}${"*".repeat(phone.length - 5)}${phone.slice(-2)}`;
}
