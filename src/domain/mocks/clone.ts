/**
 * Clonagem profunda para proteger o store contra mutação externa.
 * Utiliza `structuredClone` nativo — determinístico e sem dependência.
 */

export function deepClone<T>(value: T): T {
  return structuredClone(value);
}

export function cloneArray<T>(items: readonly T[]): T[] {
  return items.map((it) => structuredClone(it));
}
