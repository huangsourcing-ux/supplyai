import type { GetFactory200DataContact } from "@chinasupply/api-client";

export type FactoryContact = Exclude<GetFactory200DataContact, null>;

export function hasFactoryContact(
  contact: GetFactory200DataContact,
): contact is FactoryContact {
  return (
    contact !== null &&
    [contact.email, contact.phone, contact.wechat, contact.website].some(
      (value) => value !== undefined,
    )
  );
}

export function safeWebsiteHref(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
