/**
 * LV-10 — Hook React thin wrapper sobre AudioRuntime.
 * Toda a orquestração de MediaRecorder/MediaStream vive em `audio-runtime.ts`.
 * Aqui apenas conectamos capabilities, listagem de dispositivos, analisador
 * de nível e o snapshot reativo do runtime via useSyncExternalStore.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  assessCapabilities,
  readCapabilitiesFromWindow,
  type CapabilityReport,
} from "./audio-capabilities";
import { clockElapsedMs } from "./audio-clock";
import {
  AudioRuntime,
  type AudioRuntimeDeps,
  type MinimalMediaRecorder,
  type MinimalMediaStream,
} from "./audio-runtime";
import { collectPreviewUrls, countByStatus } from "./audio-queue";
import { initialContext } from "./audio-state-machine";
import {
  AUDIO_MESSAGES,
  DEFAULT_OVERLAP_MS,
  DEFAULT_SEGMENT_DURATION_MS,
  DEFAULT_TIMESLICE_MS,
} from "./audio-types";

export type RecorderOptions = {
  segmentDurationMs?: number;
  overlapMs?: number;
  timesliceMs?: number;
};

export type UseAudioRecorder = ReturnType<typeof useAudioRecorder>;

function now(): number {
  return typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();
}

function createBrowserDeps(): AudioRuntimeDeps {
  return {
    getUserMedia: (constraints) =>
      navigator.mediaDevices.getUserMedia(
        constraints as MediaStreamConstraints,
      ) as unknown as Promise<MinimalMediaStream>,
    createRecorder: (stream, opts) =>
      new MediaRecorder(
        stream as unknown as MediaStream,
        opts.mimeType ? { mimeType: opts.mimeType } : undefined,
      ) as unknown as MinimalMediaRecorder,
    createObjectURL: (blob) => URL.createObjectURL(blob),
    revokeObjectURL: (url) => URL.revokeObjectURL(url),
    now,
  };
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

  const runtimeRef = useRef<AudioRuntime | null>(null);
  if (runtimeRef.current === null && typeof window !== "undefined") {
    runtimeRef.current = new AudioRuntime(
      createBrowserDeps(),
      {
        mimeType: capability.selectedMimeType ?? "",
        segmentDurationMs,
        overlapMs,
        timesliceMs,
      },
      initialContext(capability.supported ? null : capability.reason),
    );
  }

  const subscribe = useCallback((cb: () => void) => {
    const rt = runtimeRef.current;
    if (!rt) return () => {};
    return rt.subscribe(cb);
  }, []);
  const getSnapshot = useCallback(() => {
    const rt = runtimeRef.current;
    return rt ? rt.snapshot() : null;
  }, []);
  const getServerSnapshot = useCallback(() => null, []);
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [level, setLevel] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const [nowTick, setNowTick] = useState(0);

  // Refresh capabilities on mount (hydration).
  useEffect(() => {
    if (typeof window === "undefined") return;
    setCapability(readCapabilitiesFromWindow());
  }, []);

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
    const handler = () => void refreshDevices();
    navigator.mediaDevices.addEventListener?.("devicechange", handler);
    return () => navigator.mediaDevices.removeEventListener?.("devicechange", handler);
  }, [refreshDevices]);

  // Cronômetro tick durante gravação.
  useEffect(() => {
    if (snap?.context.state !== "recording") return;
    const id = window.setInterval(() => setNowTick((v) => v + 1), 250);
    return () => window.clearInterval(id);
  }, [snap?.context.state]);
  void nowTick;

  // Analisador de nível — recriado quando o stream muda.
  useEffect(() => {
    const rt = runtimeRef.current;
    if (!rt) return;
    const state = snap?.context.state;
    if (state !== "recording" && state !== "paused") return;
    const stream = rt._getStream();
    if (!stream) return;
    const AC =
      (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (typeof AC !== "function") return;
    let stopped = false;
    try {
      const audioCtx = new AC();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream as unknown as MediaStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (stopped || !analyserRef.current) return;
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
      /* noop */
    }
    return () => {
      stopped = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      try {
        analyserRef.current?.disconnect();
      } catch {
        /* noop */
      }
      analyserRef.current = null;
      try {
        void audioCtxRef.current?.close();
      } catch {
        /* noop */
      }
      audioCtxRef.current = null;
    };
  }, [snap?.context.state]);

  // beforeunload guard
  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = snap?.context.state;
    const hasContent =
      s === "recording" || s === "paused" || (snap?.segments.length ?? 0) > 0;
    if (!hasContent) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [snap?.context.state, snap?.segments.length]);

  const context = snap?.context ?? initialContext(capability.supported ? null : capability.reason);
  const segments = snap?.segments ?? [];
  const queue = snap?.queue ?? { order: [], items: {} };
  const clock = snap?.clock ?? { startedAtMs: null, pausedAtMs: null, accumulatedPauseMs: 0 };
  const elapsedMs = clockElapsedMs(clock, now());
  const counts = useMemo(() => countByStatus(queue), [queue]);

  const requestPermission = useCallback(async () => {
    if (!capability.supported) return;
    await runtimeRef.current?.requestPermission();
    void refreshDevices();
  }, [capability.supported, refreshDevices]);

  const setDeviceId = useCallback((id: string) => {
    void runtimeRef.current?.setDevice(id);
  }, []);

  const beginRecorder = useCallback(() => runtimeRef.current?.start(), []);
  const pause = useCallback(() => runtimeRef.current?.pause(), []);
  const resume = useCallback(() => runtimeRef.current?.resume(), []);
  const stop = useCallback(() => runtimeRef.current?.stop(), []);
  const discardAllData = useCallback(() => runtimeRef.current?.discardAll(), []);
  const tryRecover = useCallback(() => runtimeRef.current?.tryRecover(), []);
  const processSegment = useCallback(
    (id: string) => runtimeRef.current?.processSegment(id),
    [],
  );
  const retry = useCallback((id: string) => runtimeRef.current?.retry(id), []);
  const discardOne = useCallback(
    (id: string) => runtimeRef.current?.discardOne(id),
    [],
  );

  useEffect(() => () => runtimeRef.current?.discardAll(), []);
  // Silence unused vars from message constants module for esm-tree-shaking.
  void AUDIO_MESSAGES;

  return {
    capability,
    context,
    devices,
    deviceId: snap?.deviceId ?? null,
    setDeviceId,
    elapsedMs,
    level,
    segments,
    queue,
    counts,
    chunksReceived: snap?.chunksReceived ?? 0,
    approxBytes: snap?.approxBytes ?? 0,
    failuresCount: snap?.failuresCount ?? 0,
    supportsPause: snap?.supportsPause ?? false,
    interruptionCount: snap?.interruptionCount ?? 0,
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
