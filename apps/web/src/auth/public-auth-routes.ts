export const PUBLIC_SIGN_IN_PATH = "/sign-in";
export const PUBLIC_AUTH_FALLBACK_PATH = "/";

export function buildClusterAuthReturnPath(slug: string): string {
  return `/clusters/${encodeURIComponent(slug)}`;
}
