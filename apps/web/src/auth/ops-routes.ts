export const OPS_HOME_PATH = "/ops";
export const OPS_SIGN_IN_PATH = "/ops/sign-in";
export const OPS_FORBIDDEN_PATH = "/ops/forbidden";

function isPathOrDescendant(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isPublicOpsPath(pathname: string): boolean {
  return (
    isPathOrDescendant(pathname, OPS_SIGN_IN_PATH) ||
    pathname === OPS_FORBIDDEN_PATH
  );
}

export function isProtectedOpsPath(pathname: string): boolean {
  return (
    isPathOrDescendant(pathname, OPS_HOME_PATH) && !isPublicOpsPath(pathname)
  );
}
