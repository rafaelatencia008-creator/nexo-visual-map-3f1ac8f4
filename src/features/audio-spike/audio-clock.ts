/**
 * LV-10 — Cronômetro monotônico puro. Calcula duração descontando pausas.
 */

export type ClockState = Readonly<{
  startedAtMs: number | null;
  pausedAtMs: number | null;
  accumulatedPauseMs: number;
}>;

export const CLOCK_IDLE: ClockState = Object.freeze({
  startedAtMs: null,
  pausedAtMs: null,
  accumulatedPauseMs: 0,
});

export function clockStart(nowMs: number): ClockState {
  return { startedAtMs: nowMs, pausedAtMs: null, accumulatedPauseMs: 0 };
}

export function clockPause(state: ClockState, nowMs: number): ClockState {
  if (state.startedAtMs === null || state.pausedAtMs !== null) return state;
  return { ...state, pausedAtMs: nowMs };
}

export function clockResume(state: ClockState, nowMs: number): ClockState {
  if (state.startedAtMs === null || state.pausedAtMs === null) return state;
  return {
    ...state,
    pausedAtMs: null,
    accumulatedPauseMs: state.accumulatedPauseMs + (nowMs - state.pausedAtMs),
  };
}

export function clockElapsedMs(state: ClockState, nowMs: number): number {
  if (state.startedAtMs === null) return 0;
  const anchor = state.pausedAtMs ?? nowMs;
  return Math.max(0, anchor - state.startedAtMs - state.accumulatedPauseMs);
}

export function clockReset(): ClockState {
  return CLOCK_IDLE;
}
