/** Remove generated QR identity prefixes from product labels without changing stored names. */
export function displayItemName(value: unknown): string {
  return String(value ?? "")
    .replace(/^\s*(?:#{1,6}\s*)?\[?ITEM:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]?\s*/i, "")
    .trim();
}
