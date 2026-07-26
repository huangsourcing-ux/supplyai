export const PUBLIC_SIGN_IN_PATH = "/sign-in";
export const PUBLIC_AUTH_FALLBACK_PATH = "/";
export const PUBLIC_ACCOUNT_PATH = "/account";
export const PUBLIC_FAVORITES_PATH = "/favorites";

export function buildClusterAuthReturnPath(slug: string): string {
  return `/clusters/${encodeURIComponent(slug)}`;
}

export function buildFactoryAuthReturnPath(slug: string): string {
  return `/factories/${encodeURIComponent(slug)}`;
}
