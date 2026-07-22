type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasAdminRole(sessionClaims: unknown): boolean {
  if (!isRecord(sessionClaims) || !isRecord(sessionClaims.metadata)) {
    return false;
  }

  return sessionClaims.metadata.role === "admin";
}
