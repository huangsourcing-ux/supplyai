import type { GetFactory200DataContact } from "@chinasupply/api-client";

export const FACTORY_DETAIL_STALE_TIME_MS = 5 * 60 * 1000;

export type FactoryContact = Exclude<GetFactory200DataContact, null>;

export function normalizeFactorySlug(
  value: string | string[] | undefined,
): string | null {
  const slug = Array.isArray(value) ? value[0] : value;
  const normalized = slug?.trim();

  return normalized === undefined || normalized.length === 0
    ? null
    : normalized;
}

export function formatVerificationMonth(value: string | null): string | null {
  return value?.slice(0, 7) ?? null;
}

export function hasFactoryContact(
  contact: GetFactory200DataContact,
): contact is FactoryContact {
  return (
    contact !== null &&
    [contact.website, contact.email, contact.phone, contact.wechat].some(
      (value) => value !== undefined,
    )
  );
}

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

export function buildPhoneUrl(value: string): string {
  return `tel:${encodeURIComponent(value)}`;
}
