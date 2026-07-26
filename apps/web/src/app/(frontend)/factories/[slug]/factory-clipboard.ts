export async function copyTextToClipboard(value: string): Promise<void> {
  if (
    typeof navigator === "undefined" ||
    navigator.clipboard?.writeText === undefined
  ) {
    throw new Error("Clipboard API is unavailable");
  }

  await navigator.clipboard.writeText(value);
}
