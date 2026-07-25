export function isMissingFactoryResponse(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return false;
  }

  return error.status === 400 || error.status === 404;
}
