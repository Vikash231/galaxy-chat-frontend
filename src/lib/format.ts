/** Credits in the reference product's unit (its "credits" are the backend's microcredits): 5,000 · 29.92M. Mirrors @gx/contracts formatCredits. */
export function formatCredits(micro: number | string): string {
  const n = Number(micro);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  return Math.round(n).toLocaleString("en-US");
}
