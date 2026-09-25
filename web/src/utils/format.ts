/**
 * Single currency formatting utility (§12).
 * Formats integer paisa to BDT display string.
 * Example: 4000 paisa -> "৳40"
 */
export function formatBdt(paisa: number): string {
  const bdt = Math.round(paisa / 100);
  return `৳${bdt}`;
}
