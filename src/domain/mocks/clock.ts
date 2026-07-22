/**
 * Relógio determinístico para mocks. Não usa tempo real.
 */

import type { IsoDateTime } from "../core/common";

export const MOCK_BASE_EPOCH_MS: number = Date.UTC(2026, 0, 1, 0, 0, 0);
export const MOCK_TICK_MS = 1000;

export interface MockClock {
  /** Timestamp do tick atual (não avança). */
  now(): IsoDateTime;
  /** Avança um tick e devolve o novo timestamp. */
  next(): IsoDateTime;
  /** Tick atual (uso interno de testes). */
  tick(): number;
}

export function createMockClock(
  baseEpochMs: number = MOCK_BASE_EPOCH_MS,
  tickMs: number = MOCK_TICK_MS,
): MockClock {
  let t = 0;
  const format = (n: number): IsoDateTime =>
    new Date(baseEpochMs + n * tickMs).toISOString() as IsoDateTime;
  return {
    now: () => format(t),
    next: () => {
      t += 1;
      return format(t);
    },
    tick: () => t,
  };
}
