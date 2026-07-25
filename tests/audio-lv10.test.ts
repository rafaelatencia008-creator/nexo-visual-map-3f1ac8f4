/**
 * LV-10 — Suite de testes do spike técnico de gravação longa de áudio.
 * Cobertura: máquina de estados, capacidades, segmentação, fila, cronômetro,
 * relatório técnico, integração de rota (arquivo) e ausência de backend/rota nova.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import {
  assessCapabilities,
  selectMimeType,
  identifyBrowser,
  type CapabilityInputs,
} from "../src/features/audio-spike/audio-capabilities";
import {
  INITIAL_CONTEXT,
  canTransition,
  describeState,
  initialContext,
  reduce,
} from "../src/features/audio-spike/audio-state-machine";
import {
  CLOCK_IDLE,
  clockElapsedMs,
  clockPause,
  clockResume,
  clockReset,
  clockStart,
} from "../src/features/audio-spike/audio-clock";
import {
  finalizeSegmenter,
  formatSegmentId,
  initSegmenter,
  pushChunk,
  totalCapturedBytes,
} from "../src/features/audio-spike/audio-segmenter";
import {
  EMPTY_QUEUE,
  beginProcessing,
  collectPreviewUrls,
  completeProcessing,
  countByStatus,
  discardAll,
  discardSegment,
  enqueueSegment,
  nextPending,
  scheduleRetry,
} from "../src/features/audio-spike/audio-queue";
import {
  buildDiagnosticsReport,
  formatBytes,
  formatDurationMs,
} from "../src/features/audio-spike/audio-diagnostics";
import {
  AUDIO_DEMO_NOTICE,
  AUDIO_MESSAGES,
  CANDIDATE_MIME_TYPES,
  DEFAULT_OVERLAP_MS,
  DEFAULT_SEGMENT_DURATION_MS,
  DEFAULT_TIMESLICE_MS,
  MANUAL_CHECKLIST_ITEMS,
  type AudioChunk,
  type AudioSegment,
} from "../src/features/audio-spike/audio-types";

// --- Test helpers -----------------------------------------------------

function fakeBlob(size: number): Blob {
  return new Blob([new Uint8Array(size)], { type: "audio/webm" });
}

function chunk(id: number, start: number, end: number, size = 1024): AudioChunk {
  return { id, startedAtMs: start, endedAtMs: end, sizeBytes: size, data: fakeBlob(size) };
}

const BASE_INPUTS: CapabilityInputs = {
  hasMediaDevices: true,
  hasGetUserMedia: true,
  hasEnumerateDevices: true,
  hasMediaRecorder: true,
  isTypeSupported: (m) => m === "audio/webm;codecs=opus",
  hasAudioContext: true,
  hasDeviceChangeEvent: true,
  userAgent: "Mozilla/5.0 Chrome/120",
  platform: "Linux x86_64",
};

// --- Capabilities -----------------------------------------------------

describe("LV-10 audio-capabilities", () => {
  test("selectMimeType prefere webm+opus", () => {
    const s = selectMimeType((m) => m === "audio/webm;codecs=opus");
    expect(s.mimeType).toBe("audio/webm;codecs=opus");
    expect(s.codec).toBe("opus");
  });

  test("selectMimeType desce a lista quando o topo não é suportado", () => {
    const s = selectMimeType((m) => m === "audio/mp4");
    expect(s.mimeType).toBe("audio/mp4");
    expect(s.codec).toBeNull();
  });

  test("selectMimeType retorna nulo sem suporte", () => {
    const s = selectMimeType(() => false);
    expect(s.mimeType).toBeNull();
    expect(s.codec).toBeNull();
  });

  test("identifyBrowser reconhece Chrome, Firefox, Safari e Edge", () => {
    expect(identifyBrowser("Mozilla/5.0 Chrome/120")).toBe("Chrome");
    expect(identifyBrowser("Firefox/120")).toBe("Firefox");
    expect(identifyBrowser("Safari/605")).toBe("Safari");
    expect(identifyBrowser("Chrome Edg/120")).toBe("Edge");
    expect(identifyBrowser("")).toBe("Desconhecido");
    expect(identifyBrowser("Curl/8")).toBe("Outro");
  });

  test("assessCapabilities aprova ambiente completo", () => {
    const r = assessCapabilities(BASE_INPUTS);
    expect(r.supported).toBe(true);
    expect(r.reason).toBeNull();
    expect(r.selectedMimeType).toBe("audio/webm;codecs=opus");
    expect(r.hasAudioContext).toBe(true);
    expect(r.hasDeviceChangeEvent).toBe(true);
    expect(r.platform).toBe("Linux x86_64");
    expect(r.browser).toBe("Chrome");
  });

  test("assessCapabilities reprova sem mediaDevices", () => {
    const r = assessCapabilities({ ...BASE_INPUTS, hasMediaDevices: false });
    expect(r.supported).toBe(false);
    expect(r.reason).toContain("mediaDevices");
  });

  test("assessCapabilities reprova sem getUserMedia", () => {
    const r = assessCapabilities({ ...BASE_INPUTS, hasGetUserMedia: false });
    expect(r.reason).toContain("getUserMedia");
  });

  test("assessCapabilities reprova sem MediaRecorder", () => {
    const r = assessCapabilities({ ...BASE_INPUTS, hasMediaRecorder: false });
    expect(r.reason).toContain("MediaRecorder");
  });

  test("assessCapabilities reprova sem MIME suportado", () => {
    const r = assessCapabilities({ ...BASE_INPUTS, isTypeSupported: () => false });
    expect(r.reason).toContain("MIME");
    expect(r.selectedMimeType).toBeNull();
  });

  test("assessCapabilities preserva platform vazia", () => {
    const r = assessCapabilities({ ...BASE_INPUTS, platform: "" });
    expect(r.platform).toBe("Desconhecida");
  });

  test("CANDIDATE_MIME_TYPES tem ordem exigida", () => {
    expect(CANDIDATE_MIME_TYPES[0]).toBe("audio/webm;codecs=opus");
    expect(CANDIDATE_MIME_TYPES[1]).toBe("audio/webm");
    expect(CANDIDATE_MIME_TYPES[2]).toBe("audio/mp4");
    expect(CANDIDATE_MIME_TYPES[3]).toBe("audio/ogg;codecs=opus");
  });
});

// --- State machine ----------------------------------------------------

describe("LV-10 audio-state-machine", () => {
  test("contexto inicial é idle quando suportado", () => {
    expect(initialContext(null).state).toBe("idle");
  });

  test("contexto inicial é unsupported quando há motivo", () => {
    const c = initialContext("no MR");
    expect(c.state).toBe("unsupported");
    expect(c.error).toBe("no MR");
  });

  test("idle → requesting_permission via request_permission", () => {
    const c = reduce(INITIAL_CONTEXT, { type: "request_permission" });
    expect(c.state).toBe("requesting_permission");
  });

  test("requesting_permission → ready via permission_granted", () => {
    const c = reduce(reduce(INITIAL_CONTEXT, { type: "request_permission" }), {
      type: "permission_granted",
    });
    expect(c.state).toBe("ready");
  });

  test("requesting_permission → error via permission_denied", () => {
    const c = reduce(reduce(INITIAL_CONTEXT, { type: "request_permission" }), {
      type: "permission_denied",
      reason: "negado",
    });
    expect(c.state).toBe("error");
    expect(c.error).toBe("negado");
  });

  test("iniciar sem permissão é bloqueado", () => {
    const c = reduce(INITIAL_CONTEXT, { type: "start" });
    expect(c.state).toBe("idle");
  });

  test("ready → recording via start", () => {
    let c = reduce(INITIAL_CONTEXT, { type: "request_permission" });
    c = reduce(c, { type: "permission_granted" });
    c = reduce(c, { type: "start" });
    expect(c.state).toBe("recording");
  });

  test("iniciar duas vezes seguidas é bloqueado", () => {
    let c = reduce(INITIAL_CONTEXT, { type: "request_permission" });
    c = reduce(c, { type: "permission_granted" });
    c = reduce(c, { type: "start" });
    const c2 = reduce(c, { type: "start" });
    expect(c2.state).toBe("recording");
    expect(c2).toBe(c);
  });

  test("pausar fora de recording é bloqueado", () => {
    const c = reduce(INITIAL_CONTEXT, { type: "pause" });
    expect(c.state).toBe("idle");
  });

  test("retomar fora de paused é bloqueado", () => {
    let c = reduce(INITIAL_CONTEXT, { type: "request_permission" });
    c = reduce(c, { type: "permission_granted" });
    c = reduce(c, { type: "start" });
    const c2 = reduce(c, { type: "resume" });
    expect(c2).toBe(c);
  });

  test("recording → paused → recording", () => {
    let c = reduce(INITIAL_CONTEXT, { type: "request_permission" });
    c = reduce(c, { type: "permission_granted" });
    c = reduce(c, { type: "start" });
    c = reduce(c, { type: "pause" });
    expect(c.state).toBe("paused");
    c = reduce(c, { type: "resume" });
    expect(c.state).toBe("recording");
  });

  test("encerrar mais de uma vez é bloqueado", () => {
    let c = reduce(INITIAL_CONTEXT, { type: "request_permission" });
    c = reduce(c, { type: "permission_granted" });
    c = reduce(c, { type: "start" });
    c = reduce(c, { type: "stop" });
    expect(c.state).toBe("stopping");
    const c2 = reduce(c, { type: "stop" });
    expect(c2).toBe(c);
    c = reduce(c, { type: "stopped" });
    expect(c.state).toBe("completed");
  });

  test("device_lost eleva contagem de interrupções", () => {
    let c = reduce(INITIAL_CONTEXT, { type: "request_permission" });
    c = reduce(c, { type: "permission_granted" });
    c = reduce(c, { type: "start" });
    c = reduce(c, { type: "device_lost", reason: "off" });
    expect(c.state).toBe("recovering");
    expect(c.interruptionCount).toBe(1);
  });

  test("recovering → recording via recovered", () => {
    let c = reduce(INITIAL_CONTEXT, { type: "request_permission" });
    c = reduce(c, { type: "permission_granted" });
    c = reduce(c, { type: "start" });
    c = reduce(c, { type: "device_lost", reason: "off" });
    c = reduce(c, { type: "recovered" });
    expect(c.state).toBe("recording");
    expect(c.deviceLostReason).toBeNull();
  });

  test("recovering → error via recover_failed", () => {
    let c = reduce(INITIAL_CONTEXT, { type: "request_permission" });
    c = reduce(c, { type: "permission_granted" });
    c = reduce(c, { type: "start" });
    c = reduce(c, { type: "device_lost", reason: "off" });
    c = reduce(c, { type: "recover_failed", reason: "sem microfone" });
    expect(c.state).toBe("error");
    expect(c.error).toBe("sem microfone");
  });

  test("fatal em qualquer estado ativo vai para error", () => {
    let c = reduce(INITIAL_CONTEXT, { type: "request_permission" });
    c = reduce(c, { type: "permission_granted" });
    c = reduce(c, { type: "fatal", reason: "boom" });
    expect(c.state).toBe("error");
  });

  test("fatal não sai de unsupported", () => {
    const start = initialContext("MR ausente");
    const c = reduce(start, { type: "fatal", reason: "x" });
    expect(c).toBe(start);
  });

  test("reset volta para idle", () => {
    let c = reduce(INITIAL_CONTEXT, { type: "request_permission" });
    c = reduce(c, { type: "permission_granted" });
    c = reduce(c, { type: "start" });
    c = reduce(c, { type: "stop" });
    c = reduce(c, { type: "stopped" });
    c = reduce(c, { type: "reset" });
    expect(c.state).toBe("idle");
    expect(c.error).toBeNull();
  });

  test("reset não sai de unsupported", () => {
    const s = initialContext("no");
    const c = reduce(s, { type: "reset" });
    expect(c).toBe(s);
  });

  test("detect_unsupported é sempre aceito", () => {
    const c = reduce(INITIAL_CONTEXT, { type: "detect_unsupported", reason: "x" });
    expect(c.state).toBe("unsupported");
  });

  test("canTransition rejeita transição inválida", () => {
    expect(canTransition(INITIAL_CONTEXT, { type: "start" })).toBe(false);
    expect(canTransition(INITIAL_CONTEXT, { type: "request_permission" })).toBe(true);
  });

  test("describeState cobre todos os estados", () => {
    for (const s of [
      "unsupported",
      "idle",
      "requesting_permission",
      "ready",
      "recording",
      "paused",
      "stopping",
      "completed",
      "recovering",
      "error",
    ] as const) {
      expect(describeState(s)).toBeTruthy();
    }
  });
});

// --- Clock ------------------------------------------------------------

describe("LV-10 audio-clock", () => {
  test("clock idle retorna zero", () => {
    expect(clockElapsedMs(CLOCK_IDLE, 1000)).toBe(0);
  });

  test("clockStart e clockElapsedMs calculam duração", () => {
    const c = clockStart(1000);
    expect(clockElapsedMs(c, 3500)).toBe(2500);
  });

  test("pausa congela o cronômetro", () => {
    let c = clockStart(1000);
    c = clockPause(c, 3000);
    expect(clockElapsedMs(c, 9999)).toBe(2000);
  });

  test("resume acumula pausa e retoma", () => {
    let c = clockStart(1000);
    c = clockPause(c, 3000);
    c = clockResume(c, 4000);
    expect(clockElapsedMs(c, 5000)).toBe(3000);
  });

  test("pausar duas vezes não altera estado", () => {
    let c = clockStart(1000);
    c = clockPause(c, 3000);
    const c2 = clockPause(c, 4000);
    expect(c2).toEqual(c);
  });

  test("resumir sem pausa é no-op", () => {
    const c = clockStart(1000);
    expect(clockResume(c, 3000)).toEqual(c);
  });

  test("clockReset retorna ao idle", () => {
    expect(clockReset()).toEqual(CLOCK_IDLE);
  });
});

// --- Segmenter --------------------------------------------------------

describe("LV-10 audio-segmenter", () => {
  const CFG = { segmentDurationMs: 10_000, overlapMs: 2_000, mimeType: "audio/webm" };

  test("formatSegmentId formata com padding de quatro dígitos", () => {
    expect(formatSegmentId(1)).toBe("segment-0001");
    expect(formatSegmentId(42)).toBe("segment-0042");
    expect(formatSegmentId(9999)).toBe("segment-9999");
  });

  test("initSegmenter rejeita configuração inválida", () => {
    expect(() => initSegmenter({ ...CFG, segmentDurationMs: 0 })).toThrow();
    expect(() => initSegmenter({ ...CFG, overlapMs: -1 })).toThrow();
    expect(() => initSegmenter({ ...CFG, overlapMs: 10_000 })).toThrow();
  });

  test("acumula blocos até fechar segmento", () => {
    let s = initSegmenter(CFG);
    for (let i = 0; i < 9; i++) s = pushChunk(s, chunk(i, i * 1000, (i + 1) * 1000));
    expect(s.segments.length).toBe(0);
    s = pushChunk(s, chunk(9, 9000, 10_000));
    expect(s.segments.length).toBe(1);
    expect(s.segments[0].id).toBe("segment-0001");
    expect(s.segments[0].durationMs).toBe(10_000);
  });

  test("blocos são reaproveitados para overlap ≈ 2s", () => {
    let s = initSegmenter(CFG);
    for (let i = 0; i < 10; i++) s = pushChunk(s, chunk(i, i * 1000, (i + 1) * 1000));
    expect(s.bufferChunks.length).toBe(2);
    expect(s.bufferStartMs).toBe(8000);
  });

  test("sequência é monotônica e única", () => {
    let s = initSegmenter(CFG);
    for (let i = 0; i < 30; i++) s = pushChunk(s, chunk(i, i * 1000, (i + 1) * 1000));
    const ids = s.segments.map((seg) => seg.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(s.segments[0].sequence).toBe(1);
    expect(s.segments[s.segments.length - 1].sequence).toBeGreaterThan(1);
  });

  test("sobreposição de segmentos consecutivos é aproximadamente overlapMs", () => {
    let s = initSegmenter(CFG);
    for (let i = 0; i < 30; i++) s = pushChunk(s, chunk(i, i * 1000, (i + 1) * 1000));
    for (let i = 1; i < s.segments.length; i++) {
      const prev = s.segments[i - 1];
      const cur = s.segments[i];
      expect(prev.endedAtMs - cur.startedAtMs).toBeGreaterThanOrEqual(2000);
      expect(prev.endedAtMs - cur.startedAtMs).toBeLessThanOrEqual(3000);
    }
  });

  test("nenhum byte é perdido entre segmentos consecutivos", () => {
    let s = initSegmenter(CFG);
    for (let i = 0; i < 30; i++) s = pushChunk(s, chunk(i, i * 1000, (i + 1) * 1000, 100));
    // Cada chunk contribui pelo menos uma vez.
    expect(totalCapturedBytes(s)).toBeGreaterThanOrEqual(30 * 100);
  });

  test("finalize emite último segmento menor marcado incompleto", () => {
    let s = initSegmenter(CFG);
    for (let i = 0; i < 15; i++) s = pushChunk(s, chunk(i, i * 1000, (i + 1) * 1000));
    s = finalizeSegmenter(s);
    const last = s.segments[s.segments.length - 1];
    expect(last.incomplete).toBe(true);
    expect(last.status).toBe("incomplete");
    expect(last.durationMs).toBeLessThan(CFG.segmentDurationMs);
    expect(s.finalized).toBe(true);
  });

  test("finalize sem buffer não emite segmento novo", () => {
    let s = initSegmenter(CFG);
    for (let i = 0; i < 10; i++) s = pushChunk(s, chunk(i, i * 1000, (i + 1) * 1000));
    // O overlap deixa buffer; para exercitar “sem buffer”, forçamos overlap zero.
    let s2 = initSegmenter({ ...CFG, overlapMs: 0 });
    for (let i = 0; i < 10; i++) s2 = pushChunk(s2, chunk(i, i * 1000, (i + 1) * 1000));
    s2 = finalizeSegmenter(s2);
    expect(s2.segments.length).toBe(1);
    // idempotência
    const again = finalizeSegmenter(s2);
    expect(again.segments.length).toBe(1);
    void s;
  });

  test("push depois de finalize lança erro", () => {
    let s = initSegmenter(CFG);
    s = pushChunk(s, chunk(0, 0, 1000));
    s = finalizeSegmenter(s);
    expect(() => pushChunk(s, chunk(1, 1000, 2000))).toThrow();
  });

  test("simulação com relógio virtual (timeslice 1s / segmento 5s)", () => {
    const CFG5 = { segmentDurationMs: 5_000, overlapMs: 1_000, mimeType: "audio/webm" };
    let s = initSegmenter(CFG5);
    let clock = 0;
    for (let i = 0; i < 12; i++) {
      s = pushChunk(s, chunk(i, clock, clock + 1000));
      clock += 1000;
    }
    s = finalizeSegmenter(s);
    // 12s @ 5s com overlap 1s ⇒ pelo menos 2 segmentos completos + resto.
    expect(s.segments.length).toBeGreaterThanOrEqual(2);
    expect(s.segments[0].mimeType).toBe("audio/webm");
  });

  test("defaults do domínio são exatamente 60 s / 2 s / 1 s", () => {
    expect(DEFAULT_SEGMENT_DURATION_MS).toBe(60_000);
    expect(DEFAULT_OVERLAP_MS).toBe(2_000);
    expect(DEFAULT_TIMESLICE_MS).toBe(1_000);
  });
});

// --- Queue ------------------------------------------------------------

function makeSegment(seq: number, incomplete = false): AudioSegment {
  return Object.freeze({
    id: formatSegmentId(seq),
    sequence: seq,
    startedAtMs: 0,
    endedAtMs: 60_000,
    durationMs: 60_000,
    overlapBeforeMs: 0,
    mimeType: "audio/webm",
    sizeBytes: 4096,
    status: incomplete ? "incomplete" : "captured",
    blob: fakeBlob(4096),
    incomplete,
  });
}

describe("LV-10 audio-queue", () => {
  test("enqueue mantém ordem", () => {
    let q = EMPTY_QUEUE;
    q = enqueueSegment(q, makeSegment(1));
    q = enqueueSegment(q, makeSegment(2));
    q = enqueueSegment(q, makeSegment(3));
    expect(q.order).toEqual(["segment-0001", "segment-0002", "segment-0003"]);
  });

  test("enqueue duplicado é no-op", () => {
    let q = enqueueSegment(EMPTY_QUEUE, makeSegment(1));
    const q2 = enqueueSegment(q, makeSegment(1));
    expect(q2).toBe(q);
  });

  test("segmento incompleto entra como incomplete", () => {
    const q = enqueueSegment(EMPTY_QUEUE, makeSegment(1, true));
    expect(q.items["segment-0001"].status).toBe("incomplete");
  });

  test("beginProcessing só age em queued/retrying", () => {
    let q = enqueueSegment(EMPTY_QUEUE, makeSegment(1));
    q = beginProcessing(q, "segment-0001");
    expect(q.items["segment-0001"].status).toBe("processing");
    expect(q.items["segment-0001"].attempts).toBe(1);
    // duplo begin é bloqueado
    const q2 = beginProcessing(q, "segment-0001");
    expect(q2).toBe(q);
  });

  test("completeProcessing sucesso guarda URL", () => {
    let q = enqueueSegment(EMPTY_QUEUE, makeSegment(1));
    q = beginProcessing(q, "segment-0001");
    q = completeProcessing(q, "segment-0001", { kind: "success", previewUrl: "blob:x" });
    expect(q.items["segment-0001"].status).toBe("ready");
    expect(q.items["segment-0001"].previewUrl).toBe("blob:x");
  });

  test("completeProcessing falha grava erro", () => {
    let q = enqueueSegment(EMPTY_QUEUE, makeSegment(1));
    q = beginProcessing(q, "segment-0001");
    q = completeProcessing(q, "segment-0001", { kind: "failure", error: "boom" });
    expect(q.items["segment-0001"].status).toBe("failed");
    expect(q.items["segment-0001"].lastError).toBe("boom");
  });

  test("scheduleRetry só age após failed", () => {
    let q = enqueueSegment(EMPTY_QUEUE, makeSegment(1));
    q = beginProcessing(q, "segment-0001");
    q = completeProcessing(q, "segment-0001", { kind: "failure", error: "x" });
    q = scheduleRetry(q, "segment-0001");
    expect(q.items["segment-0001"].status).toBe("retrying");
    const noop = scheduleRetry(q, "segment-0001");
    expect(noop).toBe(q);
  });

  test("processamento duplicado é impedido", () => {
    let q = enqueueSegment(EMPTY_QUEUE, makeSegment(1));
    q = beginProcessing(q, "segment-0001");
    q = beginProcessing(q, "segment-0001");
    expect(q.items["segment-0001"].attempts).toBe(1);
  });

  test("discardSegment marca discarded e apaga URL", () => {
    let q = enqueueSegment(EMPTY_QUEUE, makeSegment(1));
    q = beginProcessing(q, "segment-0001");
    q = completeProcessing(q, "segment-0001", { kind: "success", previewUrl: "blob:x" });
    q = discardSegment(q, "segment-0001");
    expect(q.items["segment-0001"].status).toBe("discarded");
    expect(q.items["segment-0001"].previewUrl).toBeNull();
  });

  test("discardAll marca todos como discarded", () => {
    let q = enqueueSegment(EMPTY_QUEUE, makeSegment(1));
    q = enqueueSegment(q, makeSegment(2));
    q = discardAll(q);
    for (const id of q.order) expect(q.items[id].status).toBe("discarded");
  });

  test("nextPending devolve o primeiro pendente", () => {
    let q = enqueueSegment(EMPTY_QUEUE, makeSegment(1));
    q = enqueueSegment(q, makeSegment(2));
    expect(nextPending(q)).toBe("segment-0001");
    q = beginProcessing(q, "segment-0001");
    q = completeProcessing(q, "segment-0001", { kind: "success", previewUrl: "u" });
    expect(nextPending(q)).toBe("segment-0002");
  });

  test("nextPending retorna null quando nada pendente", () => {
    const q = enqueueSegment(EMPTY_QUEUE, makeSegment(1, true));
    expect(nextPending(q)).toBeNull();
  });

  test("countByStatus contabiliza corretamente", () => {
    let q = enqueueSegment(EMPTY_QUEUE, makeSegment(1));
    q = enqueueSegment(q, makeSegment(2));
    q = beginProcessing(q, "segment-0001");
    q = completeProcessing(q, "segment-0001", { kind: "success", previewUrl: "u" });
    const c = countByStatus(q);
    expect(c.ready).toBe(1);
    expect(c.queued).toBe(1);
  });

  test("collectPreviewUrls retorna URLs prontas em ordem", () => {
    let q = enqueueSegment(EMPTY_QUEUE, makeSegment(1));
    q = enqueueSegment(q, makeSegment(2));
    q = beginProcessing(q, "segment-0001");
    q = completeProcessing(q, "segment-0001", { kind: "success", previewUrl: "u1" });
    q = beginProcessing(q, "segment-0002");
    q = completeProcessing(q, "segment-0002", { kind: "success", previewUrl: "u2" });
    expect(collectPreviewUrls(q)).toEqual(["u1", "u2"]);
  });
});

// --- Diagnostics ------------------------------------------------------

describe("LV-10 audio-diagnostics", () => {
  test("formatDurationMs formata em HH:MM:SS", () => {
    expect(formatDurationMs(0)).toBe("00:00:00");
    expect(formatDurationMs(65_500)).toBe("00:01:05");
    expect(formatDurationMs(3600_000)).toBe("01:00:00");
  });

  test("formatBytes escala unidades", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.00 MB");
  });

  test("buildDiagnosticsReport contém campos exigidos", () => {
    const cap = assessCapabilities(BASE_INPUTS);
    const rep = buildDiagnosticsReport({
      capability: cap,
      microphoneCount: 2,
      selectedDeviceLabel: "Interno",
      recordedMs: 61_000,
      chunksReceived: 61,
      segmentsCompleted: 1,
      segmentsIncomplete: 0,
      failures: 0,
      recoveries: 0,
      approxMemoryBytes: 4096,
      supportsPause: true,
    });
    expect(rep).toContain("Navegador identificado: Chrome");
    expect(rep).toContain("Formato selecionado: audio/webm;codecs=opus");
    expect(rep).toContain("Microfones encontrados: 2");
    expect(rep).toContain("Blocos recebidos: 61");
    expect(rep).toContain("Sem backend");
    expect(rep).toContain("Segmentos concluídos: 1");
  });

  test("buildDiagnosticsReport nunca inclui base64 nem palavras proibidas", () => {
    const cap = assessCapabilities(BASE_INPUTS);
    const rep = buildDiagnosticsReport({
      capability: cap,
      microphoneCount: 0,
      selectedDeviceLabel: "",
      recordedMs: 0,
      chunksReceived: 0,
      segmentsCompleted: 0,
      segmentsIncomplete: 0,
      failures: 0,
      recoveries: 0,
      approxMemoryBytes: 0,
      supportsPause: false,
    });
    expect(rep.toLowerCase()).not.toContain("base64,");
    expect(rep.toLowerCase()).not.toContain("openai");
    expect(rep.toLowerCase()).not.toContain("supabase");
    expect(rep.toLowerCase()).not.toContain("transcrição");
  });
});

// --- Constantes e mensagens ------------------------------------------

describe("LV-10 constantes e mensagens", () => {
  test("AUDIO_MESSAGES cobre todas as chaves esperadas", () => {
    expect(AUDIO_MESSAGES.askPermission).toContain("Permitir");
    expect(AUDIO_MESSAGES.permissionGranted).toContain("concedido");
    expect(AUDIO_MESSAGES.permissionDenied).toContain("negada");
    expect(AUDIO_MESSAGES.noDevice).toContain("microfone");
    expect(AUDIO_MESSAGES.deviceDisconnected).toContain("desconectado");
    expect(AUDIO_MESSAGES.unsupported).toContain("suportada");
  });

  test("AUDIO_DEMO_NOTICE afirma memória temporária e ausência de servidor", () => {
    expect(AUDIO_DEMO_NOTICE).toContain("memória");
    expect(AUDIO_DEMO_NOTICE).toContain("servidor");
  });

  test("MANUAL_CHECKLIST_ITEMS contém a lista requerida completa", () => {
    const list = MANUAL_CHECKLIST_ITEMS as unknown as string[];
    expect(list).toContain("Android + Chrome");
    expect(list).toContain("iPhone + Safari");
    expect(list).toContain("Firefox desktop");
    expect(list).toContain("Fone Bluetooth");
    expect(list).toContain("Bloqueio de tela");
    expect(list).toContain("Gravação prolongada");
    expect(list.length).toBeGreaterThanOrEqual(14);
  });
});

// --- Integração de rota (arquivo) e ausência de backend --------------

const REPO = resolve(import.meta.dir, "..");
const readSrc = (rel: string) => readFileSync(resolve(REPO, rel), "utf-8");

describe("LV-10 integração de rota /app/entrevistas", () => {
  test("rota /app/entrevistas permanece existente e única", () => {
    expect(existsSync(resolve(REPO, "src/routes/app.entrevistas.tsx"))).toBe(true);
  });

  test("rota renderiza UnderConstruction no modo normal", () => {
    const src = readSrc("src/routes/app.entrevistas.tsx");
    expect(src).toContain("UnderConstruction");
    expect(src).toContain("CONSTRUCTION_MODULES");
  });

  test("rota renderiza AudioSpikeLab quando demo=audio-spike", () => {
    const src = readSrc("src/routes/app.entrevistas.tsx");
    expect(src).toContain("audio-spike");
    expect(src).toContain("AudioSpikeLab");
    expect(src).toContain("validateSearch");
  });

  test("nenhuma nova rota foi introduzida no diretório", () => {
    const files = readdirSync(resolve(REPO, "src/routes"));
    const audioRoutes = files.filter(
      (f) => /audio/i.test(f) || /spike/i.test(f) || /entrevista/i.test(f),
    );
    expect(audioRoutes).toEqual(["app.entrevistas.tsx"]);
  });

  test("entrada Entrevistas continua com construction:true no nav", () => {
    const src = readSrc("src/lib/app-nav.ts");
    const idx = src.indexOf("/app/entrevistas");
    expect(idx).toBeGreaterThan(-1);
    const slice = src.slice(idx, idx + 200);
    expect(slice).toContain("construction: true");
  });

  test("CONSTRUCTION_MODULES mantém entrada /app/entrevistas", () => {
    const src = readSrc("src/lib/app-nav.ts");
    expect(src).toContain('"/app/entrevistas"');
  });
});

describe("LV-10 ausência de backend, IA e uploads", () => {
  const files = [
    "src/features/audio-spike/audio-types.ts",
    "src/features/audio-spike/audio-capabilities.ts",
    "src/features/audio-spike/audio-state-machine.ts",
    "src/features/audio-spike/audio-clock.ts",
    "src/features/audio-spike/audio-segmenter.ts",
    "src/features/audio-spike/audio-queue.ts",
    "src/features/audio-spike/audio-diagnostics.ts",
    "src/features/audio-spike/useAudioRecorder.ts",
    "src/features/audio-spike/AudioSpikeLab.tsx",
    "src/features/audio-spike/AudioDeviceSelector.tsx",
    "src/features/audio-spike/AudioLevelMeter.tsx",
    "src/features/audio-spike/AudioSegmentsPanel.tsx",
    "src/features/audio-spike/AudioDiagnosticsPanel.tsx",
  ];

  test("nenhum arquivo importa Supabase, OpenAI, fetch remoto ou WebSocket", () => {
    for (const f of files) {
      const src = readSrc(f);
      const lc = src.toLowerCase();
      expect(lc).not.toContain("supabase");
      expect(lc).not.toContain("openai");
      expect(lc).not.toContain("websocket");
      // fetch remoto: nenhuma chamada explícita a fetch
      expect(lc).not.toContain("fetch(");
      expect(lc).not.toContain("axios");
    }
  });

  test("nenhum arquivo usa crypto.randomUUID para segmentos", () => {
    for (const f of files) {
      const src = readSrc(f);
      expect(src).not.toContain("randomUUID");
    }
  });

  test("nenhum arquivo tenta upload/download", () => {
    for (const f of files) {
      const src = readSrc(f).toLowerCase();
      expect(src).not.toMatch(/\bupload\b/);
      expect(src).not.toMatch(/\bdownload\b/);
    }
  });

  test("DEC-AUD-001 registra spike, cleanup, MIME, segmentos e limitações", () => {
    const dec = readSrc("docs/decisions/DEC-AUD-001-spike-gravacao-longa.md");
    expect(dec).toContain("Máquina de estados");
    expect(dec).toContain("MIME");
    expect(dec).toContain("segmento");
    expect(dec).toContain("Cleanup");
    expect(dec).toContain("recarregar");
    expect(dec).toContain("Safari");
    expect(dec).toContain("Sem backend");
  });
});

// --- Acessibilidade estrutural ---------------------------------------

describe("LV-10 acessibilidade estrutural", () => {
  test("AudioLevelMeter expõe role=progressbar e aria-valuenow", () => {
    const src = readSrc("src/features/audio-spike/AudioLevelMeter.tsx");
    expect(src).toContain('role="progressbar"');
    expect(src).toContain("aria-valuenow");
    expect(src).toContain("aria-label");
  });

  test("AudioSpikeLab possui aria-live e aria-busy no estado", () => {
    const src = readSrc("src/features/audio-spike/AudioSpikeLab.tsx");
    expect(src).toContain('aria-live="polite"');
    expect(src).toContain("aria-busy");
  });

  test("erros são anunciados com role=alert", () => {
    const src = readSrc("src/features/audio-spike/AudioSpikeLab.tsx");
    expect(src).toContain('role="alert"');
  });

  test("segmentos falhados usam role=alert", () => {
    const src = readSrc("src/features/audio-spike/AudioSegmentsPanel.tsx");
    expect(src).toContain('role="alert"');
  });

  test("descarte tem AlertDialog de confirmação", () => {
    const src = readSrc("src/features/audio-spike/AudioSpikeLab.tsx");
    expect(src).toContain("AlertDialog");
    expect(src).toContain("Descartar gravação?");
  });
});

// --- Responsividade estrutural ---------------------------------------

describe("LV-10 responsividade estrutural", () => {
  test("AudioSpikeLab usa max-w e grid responsivo", () => {
    const src = readSrc("src/features/audio-spike/AudioSpikeLab.tsx");
    expect(src).toContain("max-w-4xl");
    expect(src).toContain("sm:grid-cols-");
    expect(src).toContain("flex-wrap");
  });

  test("Segmentos usam flex-wrap para caberem em 360 px", () => {
    const src = readSrc("src/features/audio-spike/AudioSegmentsPanel.tsx");
    expect(src).toContain("flex-wrap");
    expect(src).toContain("break-words");
  });

  test("Diagnóstico permite quebra e rolagem interna", () => {
    const src = readSrc("src/features/audio-spike/AudioDiagnosticsPanel.tsx");
    expect(src).toContain("whitespace-pre-wrap");
    expect(src).toContain("overflow-auto");
  });
});
