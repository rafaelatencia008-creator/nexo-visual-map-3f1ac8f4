/**
 * LV-10 — Segmentador puro de áudio.
 * Recebe blocos monotônicos e produz segmentos com sobreposição por reutilização.
 */

import type { AudioChunk, AudioSegment } from "./audio-types";

export type SegmenterConfig = Readonly<{
  segmentDurationMs: number;
  overlapMs: number;
  mimeType: string;
}>;

export type SegmenterState = Readonly<{
  config: SegmenterConfig;
  nextSequence: number;
  bufferChunks: readonly AudioChunk[];
  bufferStartMs: number | null;
  segments: readonly AudioSegment[];
  overlapMsPendingForNext: number;
  finalized: boolean;
}>;

export function initSegmenter(
  config: SegmenterConfig,
  options: { startSequence?: number } = {},
): SegmenterState {
  if (config.segmentDurationMs <= 0) throw new Error("segmentDurationMs must be positive");
  if (config.overlapMs < 0 || config.overlapMs >= config.segmentDurationMs)
    throw new Error("overlapMs must be between 0 and segmentDurationMs");
  const startSequence = options.startSequence ?? 1;
  if (!Number.isInteger(startSequence) || startSequence < 1)
    throw new Error("startSequence must be a positive integer");
  return {
    config,
    nextSequence: startSequence,
    bufferChunks: [],
    bufferStartMs: null,
    segments: [],
    overlapMsPendingForNext: 0,
    finalized: false,
  };
}

export function formatSegmentId(sequence: number): string {
  return `segment-${String(sequence).padStart(4, "0")}`;
}

function buildBlob(chunks: readonly AudioChunk[], mimeType: string): Blob {
  const parts = chunks.map((c) => c.data);
  return new Blob(parts, { type: mimeType });
}

function sumSize(chunks: readonly AudioChunk[]): number {
  return chunks.reduce((acc, c) => acc + c.sizeBytes, 0);
}

/**
 * Adiciona um chunk. Pode emitir 0 ou mais segmentos.
 */
export function pushChunk(state: SegmenterState, chunk: AudioChunk): SegmenterState {
  if (state.finalized) throw new Error("segmenter finalized: cannot push more chunks");
  const bufferChunks = [...state.bufferChunks, chunk];
  const bufferStartMs = state.bufferStartMs ?? chunk.startedAtMs;
  const currentDuration = chunk.endedAtMs - bufferStartMs;

  if (currentDuration < state.config.segmentDurationMs) {
    return { ...state, bufferChunks, bufferStartMs };
  }

  // Close a segment
  const seq = state.nextSequence;
  const endedAtMs = chunk.endedAtMs;
  const segment: AudioSegment = Object.freeze({
    id: formatSegmentId(seq),
    sequence: seq,
    startedAtMs: bufferStartMs,
    endedAtMs,
    durationMs: endedAtMs - bufferStartMs,
    overlapBeforeMs: state.overlapMsPendingForNext,
    mimeType: state.config.mimeType,
    sizeBytes: sumSize(bufferChunks),
    status: "captured",
    blob: buildBlob(bufferChunks, state.config.mimeType),
    incomplete: false,
  });

  // Compute overlap carry: chunks whose endedAtMs > endedAtMs - overlapMs.
  const overlapThreshold = endedAtMs - state.config.overlapMs;
  const carry = bufferChunks.filter((c) => c.endedAtMs > overlapThreshold);
  const carryStartMs =
    carry.length > 0 ? Math.max(carry[0].startedAtMs, overlapThreshold) : endedAtMs;

  return {
    ...state,
    nextSequence: seq + 1,
    bufferChunks: carry,
    bufferStartMs: carry.length > 0 ? carryStartMs : null,
    segments: [...state.segments, segment],
    overlapMsPendingForNext: carry.length > 0 ? endedAtMs - carryStartMs : 0,
    finalized: false,
  };
}

/**
 * Finaliza a sessão emitindo o último segmento, possivelmente menor e/ou incompleto.
 */
export function finalizeSegmenter(state: SegmenterState): SegmenterState {
  if (state.finalized) return state;
  if (state.bufferChunks.length === 0 || state.bufferStartMs === null) {
    return { ...state, finalized: true };
  }
  const seq = state.nextSequence;
  const last = state.bufferChunks[state.bufferChunks.length - 1];
  const startedAtMs = state.bufferStartMs;
  const endedAtMs = last.endedAtMs;
  const durationMs = endedAtMs - startedAtMs;
  const incomplete = durationMs < state.config.segmentDurationMs;
  const segment: AudioSegment = Object.freeze({
    id: formatSegmentId(seq),
    sequence: seq,
    startedAtMs,
    endedAtMs,
    durationMs,
    overlapBeforeMs: state.overlapMsPendingForNext,
    mimeType: state.config.mimeType,
    sizeBytes: sumSize(state.bufferChunks),
    status: incomplete ? "incomplete" : "captured",
    blob: buildBlob(state.bufferChunks, state.config.mimeType),
    incomplete,
  });
  return {
    ...state,
    nextSequence: seq + 1,
    bufferChunks: [],
    bufferStartMs: null,
    segments: [...state.segments, segment],
    overlapMsPendingForNext: 0,
    finalized: true,
  };
}

export function totalCapturedBytes(state: SegmenterState): number {
  return state.segments.reduce((acc, s) => acc + s.sizeBytes, 0);
}
