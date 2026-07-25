/**
 * LV-10 — Detecção pura de capacidades do ambiente para gravação de áudio.
 * Não realiza I/O real; recebe injeções para permitir teste determinístico.
 */

import { CANDIDATE_MIME_TYPES } from "./audio-types";

export type CapabilityInputs = {
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
  hasEnumerateDevices: boolean;
  hasMediaRecorder: boolean;
  isTypeSupported: (mime: string) => boolean;
  hasAudioContext: boolean;
  hasDeviceChangeEvent: boolean;
  userAgent: string;
  platform: string;
};

export type CapabilityReport = Readonly<{
  supported: boolean;
  reason: string | null;
  selectedMimeType: string | null;
  codec: string | null;
  supportedMimeTypes: readonly string[];
  hasAudioContext: boolean;
  hasDeviceChangeEvent: boolean;
  browser: string;
  platform: string;
}>;

export function selectMimeType(
  isTypeSupported: (mime: string) => boolean,
  candidates: readonly string[] = CANDIDATE_MIME_TYPES,
): { mimeType: string | null; codec: string | null } {
  for (const candidate of candidates) {
    if (isTypeSupported(candidate)) {
      const codecMatch = /codecs=([^;]+)/.exec(candidate);
      return { mimeType: candidate, codec: codecMatch ? codecMatch[1] : null };
    }
  }
  return { mimeType: null, codec: null };
}

export function identifyBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("edg/")) return "Edge";
  if (ua.includes("firefox")) return "Firefox";
  if (ua.includes("chrome") && !ua.includes("edg/")) return "Chrome";
  if (ua.includes("safari") && !ua.includes("chrome")) return "Safari";
  if (!ua) return "Desconhecido";
  return "Outro";
}

export function assessCapabilities(inputs: CapabilityInputs): CapabilityReport {
  const supportedMimeTypes = CANDIDATE_MIME_TYPES.filter(inputs.isTypeSupported);
  const selection = selectMimeType(inputs.isTypeSupported);
  let reason: string | null = null;
  if (!inputs.hasMediaDevices) reason = "mediaDevices indisponível";
  else if (!inputs.hasGetUserMedia) reason = "getUserMedia indisponível";
  else if (!inputs.hasMediaRecorder) reason = "MediaRecorder indisponível";
  else if (!selection.mimeType) reason = "Nenhum MIME type suportado";
  const supported = reason === null;
  return {
    supported,
    reason,
    selectedMimeType: selection.mimeType,
    codec: selection.codec,
    supportedMimeTypes,
    hasAudioContext: inputs.hasAudioContext,
    hasDeviceChangeEvent: inputs.hasDeviceChangeEvent,
    browser: identifyBrowser(inputs.userAgent),
    platform: inputs.platform || "Desconhecida",
  };
}

export function readCapabilitiesFromWindow(): CapabilityReport {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return assessCapabilities({
      hasMediaDevices: false,
      hasGetUserMedia: false,
      hasEnumerateDevices: false,
      hasMediaRecorder: false,
      isTypeSupported: () => false,
      hasAudioContext: false,
      hasDeviceChangeEvent: false,
      userAgent: "",
      platform: "",
    });
  }
  const md = navigator.mediaDevices;
  const MR = (window as unknown as { MediaRecorder?: typeof MediaRecorder })
    .MediaRecorder;
  const AC =
    (window as unknown as { AudioContext?: unknown }).AudioContext ??
    (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext;
  return assessCapabilities({
    hasMediaDevices: !!md,
    hasGetUserMedia: !!md && typeof md.getUserMedia === "function",
    hasEnumerateDevices: !!md && typeof md.enumerateDevices === "function",
    hasMediaRecorder: typeof MR === "function",
    isTypeSupported: (mime) =>
      typeof MR === "function" &&
      typeof MR.isTypeSupported === "function" &&
      MR.isTypeSupported(mime),
    hasAudioContext: typeof AC === "function",
    hasDeviceChangeEvent: !!md && "ondevicechange" in md,
    userAgent: navigator.userAgent || "",
    platform: navigator.platform || "",
  });
}
