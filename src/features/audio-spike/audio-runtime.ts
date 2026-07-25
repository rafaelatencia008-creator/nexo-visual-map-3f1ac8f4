/**
 * LV-10 — Orquestrador framework-free do motor de gravação de áudio.
 *
 * Isola o ciclo de vida de MediaStream, MediaRecorder e AnalyserNode
 * das APIs React. Todas as dependências do navegador são injetadas,
 * o que permite testar troca de microfone, recuperação preservando
 * segmentos, enfileiramento durante a gravação e descarte com cleanup
 * completo sem depender de DOM real.
 */

import {
  INITIAL_CONTEXT,
  reduce,
  type AudioMachineContext,
} from "./audio-state-machine";
import {
  CLOCK_IDLE,
  clockPause,
  clockResume,
  clockStart,
  type ClockState,
} from "./audio-clock";
import {
  finalizeSegmenter,
  initSegmenter,
  pushChunk,
  type SegmenterState,
} from "./audio-segmenter";
import {
  beginProcessing,
  completeProcessing,
  discardAll as queueDiscardAll,
  discardSegment as queueDiscardSegment,
  EMPTY_QUEUE,
  enqueueSegment,
  scheduleRetry,
  type QueueState,
} from "./audio-queue";
import type { AudioChunk, AudioRecorderEvent, AudioSegment } from "./audio-types";

export type MinimalMediaRecorder = {
  state: "inactive" | "recording" | "paused";
  start: (timeslice?: number) => void;
  stop: () => void;
  pause?: () => void;
  resume?: () => void;
  addEventListener: (
    type: "dataavailable" | "stop" | "error",
    listener: (event: unknown) => void,
  ) => void;
  removeEventListener?: (
    type: "dataavailable" | "stop" | "error",
    listener: (event: unknown) => void,
  ) => void;
};

export type MinimalMediaStream = {
  getTracks: () => Array<{
    stop: () => void;
    addEventListener?: (type: "ended", listener: () => void) => void;
    removeEventListener?: (type: "ended", listener: () => void) => void;
  }>;
  getAudioTracks?: () => Array<{
    stop: () => void;
    addEventListener?: (type: "ended", listener: () => void) => void;
    removeEventListener?: (type: "ended", listener: () => void) => void;
  }>;
};

export type AudioRuntimeDeps = {
  getUserMedia: (constraints: {
    audio: boolean | { deviceId?: { exact: string } };
  }) => Promise<MinimalMediaStream>;
  createRecorder: (
    stream: MinimalMediaStream,
    options: { mimeType?: string },
  ) => MinimalMediaRecorder;
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
  now: () => number;
};

export type AudioRuntimeOptions = {
  mimeType: string;
  segmentDurationMs: number;
  overlapMs: number;
  timesliceMs: number;
};

export type RuntimeSnapshot = Readonly<{
  context: AudioMachineContext;
  deviceId: string | null;
  segments: readonly AudioSegment[];
  queue: QueueState;
  clock: ClockState;
  chunksReceived: number;
  approxBytes: number;
  failuresCount: number;
  interruptionCount: number;
  supportsPause: boolean;
  nextSequence: number;
}>;

type RecorderEmitter = {
  fire: (
    event: "dataavailable" | "stop" | "error",
    payload: unknown,
  ) => void;
};

export class AudioRuntime {
  private ctx: AudioMachineContext = INITIAL_CONTEXT;
  private deviceId: string | null = null;
  private stream: MinimalMediaStream | null = null;
  private recorder: MinimalMediaRecorder | null = null;
  private segmenter: SegmenterState | null = null;
  private segments: readonly AudioSegment[] = [];
  private queue: QueueState = EMPTY_QUEUE;
  private clock: ClockState = CLOCK_IDLE;
  private chunksReceived = 0;
  private approxBytes = 0;
  private failuresCount = 0;
  private supportsPause = false;
  private nextSequence = 1;
  private chunkCounter = 0;
  private chunkStartMs = 0;
  private previewUrls = new Set<string>();
  private intentionalStop = false;
  private trackEndedHandler: (() => void) | null = null;
  private recorderListeners = new Map<
    "dataavailable" | "stop" | "error",
    (payload: unknown) => void
  >();
  private listeners = new Set<() => void>();

  constructor(
    private deps: AudioRuntimeDeps,
    private options: AudioRuntimeOptions,
    initialContext: AudioMachineContext = INITIAL_CONTEXT,
  ) {
    this.ctx = initialContext;
  }

  // ---- observability ------------------------------------------------

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  snapshot(): RuntimeSnapshot {
    return Object.freeze({
      context: this.ctx,
      deviceId: this.deviceId,
      segments: this.segments,
      queue: this.queue,
      clock: this.clock,
      chunksReceived: this.chunksReceived,
      approxBytes: this.approxBytes,
      failuresCount: this.failuresCount,
      interruptionCount: this.ctx.interruptionCount,
      supportsPause: this.supportsPause,
      nextSequence: this.nextSequence,
    });
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  private dispatch(event: AudioRecorderEvent): void {
    const prev = this.ctx;
    const next = reduce(prev, event);
    if (next !== prev) {
      this.ctx = next;
      this.notify();
    }
  }

  // ---- device ------------------------------------------------------

  getDeviceId(): string | null {
    return this.deviceId;
  }

  /**
   * Aplica um novo `deviceId`. No estado `ready`, reabre imediatamente o
   * stream para que o próximo `start()` use o microfone escolhido. Durante
   * `recording`/`paused`, encerra a gravação atual preservando segmentos e
   * volta para `ready` já vinculado ao novo dispositivo.
   */
  async setDevice(deviceId: string | null): Promise<void> {
    if (deviceId === this.deviceId) return;
    const prevDevice = this.deviceId;
    this.deviceId = deviceId;
    this.notify();

    if (this.ctx.state === "ready" && this.stream) {
      try {
        await this.reopenStreamForReady(deviceId);
      } catch (err) {
        // rollback and report
        this.deviceId = prevDevice;
        this.notify();
        this.dispatch({
          type: "fatal",
          reason: err instanceof Error ? err.message : "Falha ao trocar microfone",
        });
      }
      return;
    }

    if (this.ctx.state === "recording" || this.ctx.state === "paused") {
      await this.stopPreservingAndReopen(deviceId);
    }
  }

  private async reopenStreamForReady(deviceId: string | null): Promise<void> {
    this.intentionalStop = true;
    this.detachTrackEnded();
    this.stopStreamOnly();
    const stream = await this.deps.getUserMedia({
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
    });
    this.intentionalStop = false;
    this.stream = stream;
    this.attachTrackEnded();
    this.notify();
  }

  private async stopPreservingAndReopen(deviceId: string | null): Promise<void> {
    // Fecha o gravador; segmentos já capturados permanecem em `this.segments`.
    await this.stopAndFinalize();
    // Após o stop, ctx é "completed" (via evento). Movemos manualmente para ready
    // já apontando para o novo dispositivo.
    try {
      this.intentionalStop = true;
      this.stopStreamOnly();
      const stream = await this.deps.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
      this.intentionalStop = false;
      this.stream = stream;
      this.attachTrackEnded();
      // completed → ready via reset preservando segmentos? Não: o dispatch reset
      // apagaria a interrupçãoCount. Aqui apenas remontamos o ctx para "ready".
      this.ctx = { ...this.ctx, state: "ready", error: null };
      this.notify();
    } catch (err) {
      this.dispatch({
        type: "fatal",
        reason: err instanceof Error ? err.message : "Falha ao trocar microfone",
      });
    }
  }

  // ---- permission --------------------------------------------------

  async requestPermission(): Promise<void> {
    this.dispatch({ type: "request_permission" });
    try {
      const stream = await this.deps.getUserMedia({
        audio: this.deviceId ? { deviceId: { exact: this.deviceId } } : true,
      });
      this.stream = stream;
      this.attachTrackEnded();
      this.dispatch({ type: "permission_granted" });
    } catch (err) {
      const reason =
        err instanceof Error ? err.message : "Permissão do microfone negada";
      this.dispatch({ type: "permission_denied", reason });
    }
  }

  private attachTrackEnded(): void {
    if (!this.stream) return;
    const tracks =
      this.stream.getAudioTracks?.() ?? this.stream.getTracks();
    const handler = () => {
      // Se o descarte/encerramento intencional foi acionado, ignore.
      if (this.intentionalStop) return;
      this.dispatch({
        type: "device_lost",
        reason: "O microfone foi desconectado",
      });
    };
    this.trackEndedHandler = handler;
    for (const t of tracks) t.addEventListener?.("ended", handler);
  }

  private detachTrackEnded(): void {
    if (!this.stream || !this.trackEndedHandler) return;
    const tracks =
      this.stream.getAudioTracks?.() ?? this.stream.getTracks();
    for (const t of tracks) t.removeEventListener?.("ended", this.trackEndedHandler);
    this.trackEndedHandler = null;
  }

  private stopStreamOnly(): void {
    if (!this.stream) return;
    for (const t of this.stream.getTracks()) {
      try {
        t.stop();
      } catch {
        /* noop */
      }
    }
    this.stream = null;
  }

  // ---- recording ---------------------------------------------------

  /**
   * Inicia a gravação a partir do estado `ready`. Reinicia contadores e
   * abre um novo segmenter começando na sequência 1.
   */
  start(): void {
    if (!this.stream) return;
    this.segmenter = initSegmenter(
      {
        segmentDurationMs: this.options.segmentDurationMs,
        overlapMs: this.options.overlapMs,
        mimeType: this.options.mimeType,
      },
      { startSequence: 1 },
    );
    this.segments = [];
    this.queue = EMPTY_QUEUE;
    this.chunksReceived = 0;
    this.approxBytes = 0;
    this.chunkCounter = 0;
    this.chunkStartMs = 0;
    this.nextSequence = 1;
    this.clock = clockStart(this.deps.now());
    this.attachRecorder({ startSequence: 1 });
    this.dispatch({ type: "start" });
    this.startRecorderSafely();
  }

  /**
   * Cria e conecta um novo `MediaRecorder` sem tocar em segmentos existentes.
   * Usado tanto por `start()` (com segmenter recém-criado) quanto por
   * `tryRecover()` (com segmenter iniciado após o segmento interrompido).
   */
  private attachRecorder(_opts: { startSequence: number }): void {
    if (!this.stream) return;
    const recorder = this.deps.createRecorder(this.stream, {
      mimeType: this.options.mimeType || undefined,
    });
    this.recorder = recorder;
    this.supportsPause = typeof recorder.pause === "function";

    const onData = (raw: unknown) => {
      const ev = raw as { data?: Blob };
      if (!ev.data || ev.data.size === 0) return;
      const idx = this.chunkCounter++;
      const startedAtMs = this.chunkStartMs;
      const endedAtMs = startedAtMs + this.options.timesliceMs;
      this.chunkStartMs = endedAtMs;
      const chunk: AudioChunk = {
        id: idx,
        startedAtMs,
        endedAtMs,
        sizeBytes: ev.data.size,
        data: ev.data,
      };
      const prevSegmenter = this.segmenter;
      if (!prevSegmenter) return;
      const nextSegmenter = pushChunk(prevSegmenter, chunk);
      this.segmenter = nextSegmenter;
      this.chunksReceived += 1;
      this.approxBytes += ev.data.size;

      // Enfileirar imediatamente segmentos recém-fechados durante a gravação.
      if (nextSegmenter.segments.length > prevSegmenter.segments.length) {
        const additions = nextSegmenter.segments.slice(
          prevSegmenter.segments.length,
        );
        this.segments = [...this.segments, ...additions];
        let q = this.queue;
        for (const seg of additions) q = enqueueSegment(q, seg);
        this.queue = q;
        this.nextSequence = nextSegmenter.nextSequence;
      }
      this.notify();
    };

    const onStop = () => {
      // Se este recorder foi substituído (troca ou recuperação intencional),
      // ignore o evento tardio para não corromper a nova sessão.
      if (this.recorder !== recorder) return;
      const seg = this.segmenter;
      if (seg && !seg.finalized) {
        const finalized = finalizeSegmenter(seg);
        this.segmenter = finalized;
        if (finalized.segments.length > seg.segments.length) {
          const additions = finalized.segments.slice(seg.segments.length);
          this.segments = [...this.segments, ...additions];
          let q = this.queue;
          for (const s of additions) {
            if (!q.items[s.id]) q = enqueueSegment(q, s);
          }
          this.queue = q;
          this.nextSequence = finalized.nextSequence;
        }
      }
      this.dispatch({ type: "stopped" });
    };

    const onError = () => {
      if (this.recorder !== recorder) return;
      this.dispatch({ type: "fatal", reason: "Erro no MediaRecorder" });
    };

    this.recorderListeners.set("dataavailable", onData);
    this.recorderListeners.set("stop", onStop);
    this.recorderListeners.set("error", onError);
    recorder.addEventListener("dataavailable", onData);
    recorder.addEventListener("stop", onStop);
    recorder.addEventListener("error", onError);
  }

  private detachRecorderListeners(): void {
    if (!this.recorder) return;
    const rem = this.recorder.removeEventListener?.bind(this.recorder);
    if (rem) {
      for (const [type, fn] of this.recorderListeners) rem(type, fn);
    }
    this.recorderListeners.clear();
  }

  private startRecorderSafely(): void {
    if (!this.recorder) return;
    try {
      this.recorder.start(this.options.timesliceMs);
    } catch (err) {
      this.dispatch({
        type: "fatal",
        reason: err instanceof Error ? err.message : "Falha ao iniciar",
      });
    }
  }

  pause(): void {
    if (!this.recorder || this.ctx.state !== "recording") return;
    try {
      this.recorder.pause?.();
      this.clock = clockPause(this.clock, this.deps.now());
      this.dispatch({ type: "pause" });
    } catch {
      /* noop */
    }
  }

  resume(): void {
    if (!this.recorder || this.ctx.state !== "paused") return;
    try {
      this.recorder.resume?.();
      this.clock = clockResume(this.clock, this.deps.now());
      this.dispatch({ type: "resume" });
    } catch {
      /* noop */
    }
  }

  private async stopAndFinalize(): Promise<void> {
    if (!this.recorder) return;
    this.dispatch({ type: "stop" });
    const recorder = this.recorder;
    const done = new Promise<void>((resolve) => {
      const listener = () => {
        recorder.removeEventListener?.("stop", listener);
        resolve();
      };
      recorder.addEventListener("stop", listener);
    });
    try {
      if (recorder.state !== "inactive") recorder.stop();
    } catch {
      resolve: {
        break resolve;
      }
    }
    await Promise.race([
      done,
      new Promise<void>((r) => setTimeout(r, 0)),
    ]);
  }

  stop(): void {
    if (!this.recorder) return;
    try {
      this.dispatch({ type: "stop" });
      if (this.recorder.state !== "inactive") this.recorder.stop();
    } catch {
      /* noop */
    }
  }

  // ---- recovery ----------------------------------------------------

  /**
   * Recuperação preservando o áudio já capturado. Encerra o gravador
   * antigo (marcando fim intencional), preserva segmentos, fila, URLs
   * e cronômetro, então solicita um novo stream, cria um novo
   * `MediaRecorder` e retoma a captura em um novo segmento cuja
   * sequência continua a numeração anterior.
   */
  async tryRecover(): Promise<void> {
    if (this.ctx.state !== "recovering") return;
    // Encerra e finaliza segmento parcial (se houver) sem destruir a fila.
    this.intentionalStop = true;
    try {
      if (this.recorder && this.recorder.state !== "inactive") {
        try {
          this.recorder.stop();
        } catch {
          /* noop */
        }
      }
    } finally {
      // Detach listeners of previous recorder so late events not affect the new session.
      this.detachRecorderListeners();
      this.recorder = null;
    }
    const seg = this.segmenter;
    if (seg && !seg.finalized) {
      const finalized = finalizeSegmenter(seg);
      if (finalized.segments.length > seg.segments.length) {
        const additions = finalized.segments.slice(seg.segments.length);
        this.segments = [...this.segments, ...additions];
        let q = this.queue;
        for (const s of additions) if (!q.items[s.id]) q = enqueueSegment(q, s);
        this.queue = q;
        this.nextSequence = finalized.nextSequence;
      } else {
        this.nextSequence = finalized.nextSequence;
      }
      this.segmenter = finalized;
    }
    this.detachTrackEnded();
    this.stopStreamOnly();

    try {
      const stream = await this.deps.getUserMedia({
        audio: this.deviceId ? { deviceId: { exact: this.deviceId } } : true,
      });
      this.intentionalStop = false;
      this.stream = stream;
      this.attachTrackEnded();

      // Novo segmenter começa após a sequência anterior, sem apagar segments/queue.
      this.segmenter = initSegmenter(
        {
          segmentDurationMs: this.options.segmentDurationMs,
          overlapMs: this.options.overlapMs,
          mimeType: this.options.mimeType,
        },
        { startSequence: this.nextSequence },
      );
      this.chunkStartMs = 0;
      this.attachRecorder({ startSequence: this.nextSequence });
      this.dispatch({ type: "recovered" });
      this.startRecorderSafely();
    } catch (err) {
      this.intentionalStop = false;
      this.dispatch({
        type: "recover_failed",
        reason: err instanceof Error ? err.message : "Falha ao recuperar",
      });
    }
  }

  // ---- processing / queue -----------------------------------------

  processSegment(segmentId: string): void {
    const seg = this.segments.find((s) => s.id === segmentId);
    if (!seg) return;
    this.queue = beginProcessing(this.queue, segmentId);
    this.notify();
    try {
      if (seg.sizeBytes === 0) throw new Error("segmento vazio");
      const url = this.deps.createObjectURL(seg.blob);
      this.previewUrls.add(url);
      this.queue = completeProcessing(this.queue, segmentId, {
        kind: "success",
        previewUrl: url,
      });
    } catch (err) {
      this.failuresCount += 1;
      this.queue = completeProcessing(this.queue, segmentId, {
        kind: "failure",
        error: err instanceof Error ? err.message : "falha desconhecida",
      });
    }
    this.notify();
  }

  retry(segmentId: string): void {
    this.queue = scheduleRetry(this.queue, segmentId);
    this.notify();
    this.processSegment(segmentId);
  }

  /**
   * Descarta um único segmento revogando imediatamente sua `previewUrl`
   * antes de marcá-lo como descartado na fila.
   */
  discardOne(segmentId: string): void {
    const item = this.queue.items[segmentId];
    if (item?.previewUrl) {
      try {
        this.deps.revokeObjectURL(item.previewUrl);
      } catch {
        /* noop */
      }
      this.previewUrls.delete(item.previewUrl);
    }
    this.queue = queueDiscardSegment(this.queue, segmentId);
    this.notify();
  }

  /**
   * Descarte total: marca todos os segmentos como descartados, para o
   * gravador e as tracks, remove listeners, revoga URLs e volta a `idle`.
   * O evento `ended` da track — disparado como consequência do descarte —
   * é ignorado para não colocar a máquina em `recovering`.
   */
  discardAll(): void {
    this.intentionalStop = true;
    this.detachRecorderListeners();
    if (this.recorder) {
      try {
        if (this.recorder.state !== "inactive") this.recorder.stop();
      } catch {
        /* noop */
      }
      this.recorder = null;
    }
    this.detachTrackEnded();
    this.stopStreamOnly();
    // Revoga todas as URLs.
    for (const url of this.previewUrls) {
      try {
        this.deps.revokeObjectURL(url);
      } catch {
        /* noop */
      }
    }
    this.previewUrls.clear();
    this.queue = queueDiscardAll(this.queue);
    this.queue = EMPTY_QUEUE;
    this.segments = [];
    this.segmenter = null;
    this.chunksReceived = 0;
    this.approxBytes = 0;
    this.chunkCounter = 0;
    this.chunkStartMs = 0;
    this.nextSequence = 1;
    this.clock = CLOCK_IDLE;
    this.ctx = { ...INITIAL_CONTEXT };
    this.intentionalStop = false;
    this.notify();
  }

  // ---- test helpers ------------------------------------------------

  /** Injeta um evento na máquina de estados (usado para simular device_lost em testes). */
  _injectEvent(event: AudioRecorderEvent): void {
    this.dispatch(event);
  }

  /** Emite manualmente eventos do MediaRecorder falso (usado em testes). */
  _emitRecorderEvent(
    type: "dataavailable" | "stop" | "error",
    payload: unknown,
  ): void {
    const listener = this.recorderListeners.get(type);
    if (listener) listener(payload);
  }

  _getRecorder(): MinimalMediaRecorder | null {
    return this.recorder;
  }

  _getStream(): MinimalMediaStream | null {
    return this.stream;
  }
}
