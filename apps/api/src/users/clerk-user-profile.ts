export interface ClerkEmailAddressInput {
  emailAddress: string;
  id: string;
}

export interface ClerkUserProfileInput {
  emailAddresses: readonly ClerkEmailAddressInput[];
  firstName: string | null;
  lastName: string | null;
  primaryEmailAddressId: string | null;
}

export function formatClerkName(
  firstName: string | null,
  lastName: string | null,
): string | null {
  const name = [firstName, lastName]
    .map((part) => part?.trim() ?? "")
    .filter((part) => part.length > 0)
    .join(" ")
    .trim();
  return name.length > 0 ? name : null;
}

export function getPrimaryEmail(profile: ClerkUserProfileInput): string | null {
  if (profile.primaryEmailAddressId === null) {
    return null;
  }

  return (
    profile.emailAddresses.find(
      (email) => email.id === profile.primaryEmailAddressId,
    )?.emailAddress ?? null
  );
}
