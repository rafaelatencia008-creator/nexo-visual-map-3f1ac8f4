/**
 * Ordenação estável para os mocks. Desempate sempre por `id`.
 */

import type { SortDirection } from "../services/pagination";

export function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function sortStable<T extends { id: string }>(
  items: readonly T[],
  pick: (item: T) => string | number,
  dir: SortDirection = "asc",
): T[] {
  const copy = items.slice();
  const sign = dir === "asc" ? 1 : -1;
  copy.sort((a, b) => {
    const va = pick(a);
    const vb = pick(b);
    let cmp: number;
    if (typeof va === "number" && typeof vb === "number") {
      cmp = va - vb;
    } else {
      cmp = compareStrings(String(va), String(vb));
    }
    if (cmp !== 0) return cmp * sign;
    return compareStrings(a.id, b.id);
  });
  return copy;
}
