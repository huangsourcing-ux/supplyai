const PHONE_DISPLAY_PATTERN = /^\+?[0-9 ().-]+$/u;
const PHONE_SEPARATOR_PATTERN = /[ ().-]/gu;
const MIN_PHONE_DIGITS = 3;
const MAX_PHONE_DIGITS = 15;

export function safeHttpUrl(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function buildEmailUrl(value: string): string {
  return `mailto:${encodeURIComponent(value)}`;
}

export function buildPhoneUrl(value: string): string | null {
  if (/[\r\n]/u.test(value)) return null;

  const candidate = value.trim();
  if (!PHONE_DISPLAY_PATTERN.test(candidate)) return null;

  const hasInternationalPrefix = candidate.startsWith("+");
  const digits = candidate
    .replace(PHONE_SEPARATOR_PATTERN, "")
    .replace(/^\+/u, "");
  if (digits.length < MIN_PHONE_DIGITS || digits.length > MAX_PHONE_DIGITS) {
    return null;
  }

  return `tel:${hasInternationalPrefix ? "+" : ""}${digits}`;
}
