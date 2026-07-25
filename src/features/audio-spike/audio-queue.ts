/**
 * LV-10 — Fila local em memória de segmentos.
 * Sem backend: “processar” = validar Blob, calcular metadados, preparar URL local.
 */

import type {
  AudioQueueItemState,
  AudioSegment,
  AudioSegmentStatus,
} from "./audio-types";

export type QueueState = Readonly<{
  order: readonly string[];
  items: Readonly<Record<string, AudioQueueItemState>>;
}>;

export const EMPTY_QUEUE: QueueState = Object.freeze({
  order: [],
  items: Object.freeze({}),
});

export function enqueueSegment(
  state: QueueState,
  segment: AudioSegment,
): QueueState {
  if (state.items[segment.id]) return state;
  const initialStatus: AudioSegmentStatus = segment.incomplete
    ? "incomplete"
    : "queued";
  const item: AudioQueueItemState = {
    segmentId: segment.id,
    status: initialStatus,
    attempts: 0,
    lastError: null,
    previewUrl: null,
  };
  return {
    order: [...state.order, segment.id],
    items: { ...state.items, [segment.id]: item },
  };
}

export type ProcessOutcome =
  | { kind: "success"; previewUrl: string }
  | { kind: "failure"; error: string };

export type Processor = (segment: AudioSegment) => ProcessOutcome;

export function beginProcessing(
  state: QueueState,
  segmentId: string,
): QueueState {
  const item = state.items[segmentId];
  if (!item) return state;
  if (item.status !== "queued" && item.status !== "retrying") return state;
  if (item.status === "processing") return state;
  return {
    ...state,
    items: {
      ...state.items,
      [segmentId]: { ...item, status: "processing", attempts: item.attempts + 1 },
    },
  };
}

export function completeProcessing(
  state: QueueState,
  segmentId: string,
  outcome: ProcessOutcome,
): QueueState {
  const item = state.items[segmentId];
  if (!item || item.status !== "processing") return state;
  if (outcome.kind === "success") {
    return {
      ...state,
      items: {
        ...state.items,
        [segmentId]: {
          ...item,
          status: "ready",
          lastError: null,
          previewUrl: outcome.previewUrl,
        },
      },
    };
  }
  return {
    ...state,
    items: {
      ...state.items,
      [segmentId]: { ...item, status: "failed", lastError: outcome.error },
    },
  };
}

export function scheduleRetry(state: QueueState, segmentId: string): QueueState {
  const item = state.items[segmentId];
  if (!item || item.status !== "failed") return state;
  return {
    ...state,
    items: {
      ...state.items,
      [segmentId]: { ...item, status: "retrying", lastError: null },
    },
  };
}

export function discardSegment(state: QueueState, segmentId: string): QueueState {
  const item = state.items[segmentId];
  if (!item) return state;
  return {
    ...state,
    items: {
      ...state.items,
      [segmentId]: { ...item, status: "discarded", previewUrl: null },
    },
  };
}

export function discardAll(state: QueueState): QueueState {
  const items: Record<string, AudioQueueItemState> = {};
  for (const id of state.order) {
    items[id] = { ...state.items[id], status: "discarded", previewUrl: null };
  }
  return { order: state.order, items };
}

export function nextPending(state: QueueState): string | null {
  for (const id of state.order) {
    const s = state.items[id].status;
    if (s === "queued" || s === "retrying") return id;
  }
  return null;
}

export function countByStatus(
  state: QueueState,
): Record<AudioSegmentStatus, number> {
  const counts: Record<AudioSegmentStatus, number> = {
    captured: 0,
    queued: 0,
    processing: 0,
    ready: 0,
    failed: 0,
    retrying: 0,
    discarded: 0,
    incomplete: 0,
  };
  for (const id of state.order) counts[state.items[id].status]++;
  return counts;
}

export function collectPreviewUrls(state: QueueState): readonly string[] {
  const urls: string[] = [];
  for (const id of state.order) {
    const u = state.items[id].previewUrl;
    if (u) urls.push(u);
  }
  return urls;
}
