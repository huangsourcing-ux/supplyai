export function formatVerificationMonth(
  lastVerifiedAt: string | null,
): string | null {
  return lastVerifiedAt?.slice(0, 7) ?? null;
}
