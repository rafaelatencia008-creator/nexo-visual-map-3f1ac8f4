/**
 * LV-10 — Hook React que orquestra MediaRecorder, AnalyserNode e a máquina de estados.
 * Nenhuma lógica pura vive aqui; apenas orquestração de I/O.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  assessCapabilities,
  readCapabilitiesFromWindow,
  type CapabilityReport,
} from "./audio-capabilities";
import {
  CLOCK_IDLE,
  clockElapsedMs,
  clockPause,
  clockResume,
  clockReset,
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
  collectPreviewUrls,
  completeProcessing,
  countByStatus,
  discardAll,
  discardSegment,
  EMPTY_QUEUE,
  enqueueSegment,
  scheduleRetry,
  type QueueState,
} from "./audio-queue";
import { initialContext, reduce } from "./audio-state-machine";
import {
  AUDIO_MESSAGES,
  DEFAULT_OVERLAP_MS,
  DEFAULT_SEGMENT_DURATION_MS,
  DEFAULT_TIMESLICE_MS,
  type AudioChunk,
  type AudioRecorderEvent,
  type AudioSegment,
} from "./audio-types";

export type RecorderOptions = {
  segmentDurationMs?: number;
  overlapMs?: number;
  timesliceMs?: number;
};

export type UseAudioRecorder = ReturnType<typeof useAudioRecorder>;

function now(): number {
  return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
}

export function useAudioRecorder(options: RecorderOptions = {}) {
  const segmentDurationMs = options.segmentDurationMs ?? DEFAULT_SEGMENT_DURATION_MS;
  const overlapMs = options.overlapMs ?? DEFAULT_OVERLAP_MS;
  const timesliceMs = options.timesliceMs ?? DEFAULT_TIMESLICE_MS;

  const [capability, setCapability] = useState<CapabilityReport>(() =>
    typeof window === "undefined"
      ? assessCapabilities({
          hasMediaDevices: false,
          hasGetUserMedia: false,
          hasEnumerateDevices: false,
          hasMediaRecorder: false,
          isTypeSupported: () => false,
          hasAudioContext: false,
          hasDeviceChangeEvent: false,
          userAgent: "",
          platform: "",
        })
      : readCapabilitiesFromWindow(),
  );

  const [ctx, setCtx] = useState(() =>
    initialContext(capability.supported ? null : capability.reason),
  );
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [clock, setClock] = useState<ClockState>(CLOCK_IDLE);
  const [segments, setSegments] = useState<readonly AudioSegment[]>([]);
  const [segmenter, setSegmenter] = useState<SegmenterState | null>(null);
  const [queue, setQueue] = useState<QueueState>(EMPTY_QUEUE);
  const [level, setLevel] = useState(0);
  const [chunksReceived, setChunksReceived] = useState(0);
  const [approxBytes, setApproxBytes] = useState(0);
  const [nowTick, setNowTick] = useState(0);
  const [failuresCount, setFailuresCount] = useState(0);
  const [supportsPause, setSupportsPause] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const chunkCounterRef = useRef(0);
  const chunkStartRef = useRef<number | null>(null);
  const chunkStartWallRef = useRef<number | null>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const fullPreviewRef = useRef<string | null>(null);

  const dispatch = useCallback((event: AudioRecorderEvent) => {
    setCtx((prev) => reduce(prev, event));
  }, []);

  // Refresh capability on mount (in case first render was pre-hydration).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const c = readCapabilitiesFromWindow();
    setCapability(c);
    if (!c.supported) dispatch({ type: "detect_unsupported", reason: c.reason ?? "não suportado" });
  }, [dispatch]);

  // Cronômetro derivado via tick.
  useEffect(() => {
    if (ctx.state !== "recording") return;
    const id = window.setInterval(() => setNowTick((v) => v + 1), 250);
    return () => window.clearInterval(id);
  }, [ctx.state]);
  const elapsedMs = clockElapsedMs(clock, now());
  void nowTick;

  const cleanupAudioAnalyzer = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch {
        /* noop */
      }
      analyserRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        void audioCtxRef.current.close();
      } catch {
        /* noop */
      }
      audioCtxRef.current = null;
    }
  }, []);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        try {
          track.stop();
        } catch {
          /* noop */
        }
      }
      streamRef.current = null;
    }
  }, []);

  const cleanupRecorder = useCallback(() => {
    if (recorderRef.current) {
      try {
        if (recorderRef.current.state !== "inactive") recorderRef.current.stop();
      } catch {
        /* noop */
      }
      recorderRef.current = null;
    }
  }, []);

  const revokePreviewUrls = useCallback(() => {
    for (const url of previewUrlsRef.current) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* noop */
      }
    }
    previewUrlsRef.current = [];
    if (fullPreviewRef.current) {
      try {
        URL.revokeObjectURL(fullPreviewRef.current);
      } catch {
        /* noop */
      }
      fullPreviewRef.current = null;
    }
  }, []);

  const fullCleanup = useCallback(() => {
    cleanupAudioAnalyzer();
    cleanupRecorder();
    cleanupStream();
    revokePreviewUrls();
  }, [cleanupAudioAnalyzer, cleanupRecorder, cleanupStream, revokePreviewUrls]);

  useEffect(() => () => fullCleanup(), [fullCleanup]);

  // beforeunload guard
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasContent = ctx.state === "recording" || ctx.state === "paused" || segments.length > 0;
    if (!hasContent) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [ctx.state, segments.length]);

  const refreshDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list.filter((d) => d.kind === "audioinput"));
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;
    const handler = () => {
      void refreshDevices();
    };
    navigator.mediaDevices.addEventListener?.("devicechange", handler);
    return () => navigator.mediaDevices.removeEventListener?.("devicechange", handler);
  }, [refreshDevices]);

  const requestPermission = useCallback(async () => {
    if (!capability.supported) {
      dispatch({
        type: "detect_unsupported",
        reason: capability.reason ?? AUDIO_MESSAGES.unsupported,
      });
      return;
    }
    dispatch({ type: "request_permission" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        video: false,
      });
      streamRef.current = stream;
      for (const track of stream.getAudioTracks()) {
        track.addEventListener("ended", () => {
          dispatch({
            type: "device_lost",
            reason: AUDIO_MESSAGES.deviceDisconnected,
          });
        });
      }
      dispatch({ type: "permission_granted" });
      await refreshDevices();
    } catch (err) {
      const reason = err instanceof Error ? err.message : AUDIO_MESSAGES.permissionDenied;
      dispatch({ type: "permission_denied", reason });
    }
  }, [capability, deviceId, dispatch, refreshDevices]);

  const startAnalyzer = useCallback(() => {
    if (!streamRef.current) return;
    const AC =
      (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (typeof AC !== "function") return;
    try {
      const audioCtx = new AC();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(streamRef.current);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i++) {
          const v = Math.abs(data[i] - 128);
          if (v > peak) peak = v;
        }
        setLevel(Math.min(1, peak / 128));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      /* medidor opcional */
    }
  }, []);

  const beginRecorder = useCallback(() => {
    if (!streamRef.current) return;
    const mime = capability.selectedMimeType ?? "";
    setSegmenter(
      initSegmenter({
        segmentDurationMs,
        overlapMs,
        mimeType: mime,
      }),
    );
    setSegments([]);
    setQueue(EMPTY_QUEUE);
    setChunksReceived(0);
    setApproxBytes(0);
    chunkCounterRef.current = 0;
    const startWall = now();
    chunkStartRef.current = 0;
    chunkStartWallRef.current = startWall;
    setClock(clockStart(startWall));

    const rec = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : undefined);
    recorderRef.current = rec;
    setSupportsPause(typeof rec.pause === "function");

    rec.addEventListener("dataavailable", (ev: BlobEvent) => {
      if (!ev.data || ev.data.size === 0) return;
      const idx = chunkCounterRef.current++;
      const startedAtMs = chunkStartRef.current ?? 0;
      const endedAtMs = startedAtMs + timesliceMs;
      chunkStartRef.current = endedAtMs;
      const chunk: AudioChunk = {
        id: idx,
        startedAtMs,
        endedAtMs,
        sizeBytes: ev.data.size,
        data: ev.data,
      };
      setSegmenter((prev) => (prev ? pushChunk(prev, chunk) : prev));
      setChunksReceived((c) => c + 1);
      setApproxBytes((b) => b + ev.data.size);
    });

    rec.addEventListener("stop", () => {
      setSegmenter((prev) => {
        if (!prev) return prev;
        const finalized = finalizeSegmenter(prev);
        setSegments(finalized.segments);
        setQueue((qs) => {
          let next = qs;
          for (const seg of finalized.segments) next = enqueueSegment(next, seg);
          return next;
        });
        return finalized;
      });
      dispatch({ type: "stopped" });
    });

    rec.addEventListener("error", () => {
      dispatch({ type: "fatal", reason: "Erro no MediaRecorder" });
    });

    try {
      rec.start(timesliceMs);
      startAnalyzer();
      dispatch({ type: "start" });
    } catch (err) {
      dispatch({
        type: "fatal",
        reason: err instanceof Error ? err.message : "Falha ao iniciar",
      });
    }
  }, [
    capability.selectedMimeType,
    dispatch,
    overlapMs,
    segmentDurationMs,
    startAnalyzer,
    timesliceMs,
  ]);

  const pause = useCallback(() => {
    if (!recorderRef.current) return;
    try {
      recorderRef.current.pause();
      setClock((c) => clockPause(c, now()));
      dispatch({ type: "pause" });
    } catch {
      /* noop */
    }
  }, [dispatch]);

  const resume = useCallback(() => {
    if (!recorderRef.current) return;
    try {
      recorderRef.current.resume();
      setClock((c) => clockResume(c, now()));
      dispatch({ type: "resume" });
    } catch {
      /* noop */
    }
  }, [dispatch]);

  const stop = useCallback(() => {
    dispatch({ type: "stop" });
    try {
      recorderRef.current?.stop();
    } catch {
      /* noop */
    }
    cleanupAudioAnalyzer();
    // segments finalized on 'stop' handler above
  }, [cleanupAudioAnalyzer, dispatch]);

  const discardAllData = useCallback(() => {
    setQueue((q) => discardAll(q));
    setSegments([]);
    revokePreviewUrls();
    setClock(clockReset());
    dispatch({ type: "reset" });
    cleanupStream();
  }, [cleanupStream, dispatch, revokePreviewUrls]);

  const tryRecover = useCallback(async () => {
    if (ctx.state !== "recovering") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
      cleanupStream();
      streamRef.current = stream;
      dispatch({ type: "recovered" });
      beginRecorder();
    } catch (err) {
      dispatch({
        type: "recover_failed",
        reason: err instanceof Error ? err.message : "Falha ao recuperar",
      });
    }
  }, [beginRecorder, cleanupStream, ctx.state, deviceId, dispatch]);

  const processSegment = useCallback(
    (segmentId: string) => {
      const seg = segments.find((s) => s.id === segmentId);
      if (!seg) return;
      setQueue((q) => beginProcessing(q, segmentId));
      queueMicrotask(() => {
        try {
          if (seg.sizeBytes === 0) throw new Error("segmento vazio");
          const url = URL.createObjectURL(seg.blob);
          previewUrlsRef.current.push(url);
          setQueue((q) => completeProcessing(q, segmentId, { kind: "success", previewUrl: url }));
        } catch (err) {
          setFailuresCount((n) => n + 1);
          setQueue((q) =>
            completeProcessing(q, segmentId, {
              kind: "failure",
              error: err instanceof Error ? err.message : "falha desconhecida",
            }),
          );
        }
      });
    },
    [segments],
  );

  const retry = useCallback(
    (segmentId: string) => {
      setQueue((q) => scheduleRetry(q, segmentId));
      queueMicrotask(() => processSegment(segmentId));
    },
    [processSegment],
  );

  const discardOne = useCallback((segmentId: string) => {
    setQueue((q) => discardSegment(q, segmentId));
  }, []);

  const counts = useMemo(() => countByStatus(queue), [queue]);

  return {
    capability,
    context: ctx,
    devices,
    deviceId,
    setDeviceId,
    elapsedMs,
    level,
    segments,
    queue,
    counts,
    chunksReceived,
    approxBytes,
    failuresCount,
    supportsPause,
    interruptionCount: ctx.interruptionCount,
    requestPermission,
    beginRecorder,
    pause,
    resume,
    stop,
    discardAllData,
    tryRecover,
    processSegment,
    retry,
    discardOne,
    refreshDevices,
    collectPreviewUrls: () => collectPreviewUrls(queue),
  } as const;
}
