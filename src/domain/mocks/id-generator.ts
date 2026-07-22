/**
 * Gerador determinístico de IDs branded por tipo de entidade.
 * Sem `Math.random`, sem UUID, sem timestamp.
 */

import { buildDomainId, type ImplementedIdMap } from "../core/ids";

export interface MockIdGenerator {
  next<K extends keyof ImplementedIdMap>(kind: K): ImplementedIdMap[K];
  /** Prevê o próximo ID sem avançar o contador. */
  previewNext<K extends keyof ImplementedIdMap>(kind: K): ImplementedIdMap[K];
  /** Contador atual (uso interno de testes). */
  peek<K extends keyof ImplementedIdMap>(kind: K): number;
}

export function createMockIdGenerator(prefix: string = "mock"): MockIdGenerator {
  const counters = new Map<keyof ImplementedIdMap, number>();
  const buildFor = <K extends keyof ImplementedIdMap>(kind: K, n: number) => {
    const suffix = `${prefix}_${String(n).padStart(4, "0")}`;
    return buildDomainId(kind, suffix);
  };
  return {
    next<K extends keyof ImplementedIdMap>(kind: K): ImplementedIdMap[K] {
      const n = (counters.get(kind) ?? 0) + 1;
      counters.set(kind, n);
      return buildFor(kind, n);
    },
    previewNext<K extends keyof ImplementedIdMap>(kind: K): ImplementedIdMap[K] {
      const n = (counters.get(kind) ?? 0) + 1;
      return buildFor(kind, n);
    },
    peek<K extends keyof ImplementedIdMap>(kind: K): number {
      return counters.get(kind) ?? 0;
    },
  };
}
