/**
 * LV-10 — Tipos do spike técnico de gravação longa de áudio.
 * Domínio: mock técnico, sem backend, sem transcrição, sem IA real.
 */

export type AudioRecorderState =
  | "unsupported"
  | "idle"
  | "requesting_permission"
  | "ready"
  | "recording"
  | "paused"
  | "stopping"
  | "completed"
  | "recovering"
  | "error";

export type AudioRecorderEvent =
  | { type: "detect_unsupported"; reason: string }
  | { type: "request_permission" }
  | { type: "permission_granted" }
  | { type: "permission_denied"; reason: string }
  | { type: "start" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "stop" }
  | { type: "stopped" }
  | { type: "device_lost"; reason: string }
  | { type: "recover" }
  | { type: "recovered" }
  | { type: "recover_failed"; reason: string }
  | { type: "fatal"; reason: string }
  | { type: "reset" };

export type AudioChunk = Readonly<{
  id: number;
  startedAtMs: number;
  endedAtMs: number;
  sizeBytes: number;
  data: Blob;
}>;

export type AudioSegmentStatus =
  | "captured"
  | "queued"
  | "processing"
  | "ready"
  | "failed"
  | "retrying"
  | "discarded"
  | "incomplete";

export type AudioSegment = Readonly<{
  id: string;
  sequence: number;
  startedAtMs: number;
  endedAtMs: number;
  durationMs: number;
  overlapBeforeMs: number;
  mimeType: string;
  sizeBytes: number;
  status: AudioSegmentStatus;
  blob: Blob;
  incomplete: boolean;
}>;

export type AudioQueueItemState = {
  segmentId: string;
  status: AudioSegmentStatus;
  attempts: number;
  lastError: string | null;
  previewUrl: string | null;
};

export const CANDIDATE_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
] as const;

export const DEFAULT_TIMESLICE_MS = 1000;
export const DEFAULT_SEGMENT_DURATION_MS = 60_000;
export const DEFAULT_OVERLAP_MS = 2_000;

export type ManualCheckStatus =
  | "not_tested"
  | "approved"
  | "approved_with_restriction"
  | "rejected";

export const MANUAL_CHECKLIST_ITEMS = [
  "Android + Chrome",
  "Android + Edge",
  "iPhone + Safari",
  "macOS + Safari",
  "Windows + Chrome",
  "Windows + Edge",
  "Firefox desktop",
  "Microfone interno",
  "Fone Bluetooth",
  "Microfone USB",
  "Bloqueio de tela",
  "Troca de aplicativo",
  "Desconexão de microfone",
  "Gravação prolongada",
] as const;

export type ManualChecklistItem = (typeof MANUAL_CHECKLIST_ITEMS)[number];

export const AUDIO_DEMO_NOTICE =
  "Laboratório técnico. A gravação existe apenas na memória desta sessão e é perdida ao recarregar a página. Nenhum áudio é enviado a servidor.";

export const AUDIO_MESSAGES = {
  askPermission: "Permitir acesso ao microfone",
  permissionGranted: "Acesso ao microfone concedido",
  permissionDenied: "Permissão do microfone negada",
  noDevice: "Nenhum microfone encontrado",
  deviceDisconnected: "O microfone foi desconectado",
  unsupported: "Gravação não suportada neste navegador",
} as const;
