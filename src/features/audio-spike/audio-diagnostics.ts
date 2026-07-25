/**
 * LV-10 — Relatório técnico textual do laboratório de áudio.
 * Copia somente metadados; nunca o áudio.
 */

import type { CapabilityReport } from "./audio-capabilities";

export type DiagnosticsSnapshot = Readonly<{
  capability: CapabilityReport;
  microphoneCount: number;
  selectedDeviceLabel: string;
  recordedMs: number;
  chunksReceived: number;
  segmentsCompleted: number;
  segmentsIncomplete: number;
  failures: number;
  recoveries: number;
  approxMemoryBytes: number;
  supportsPause: boolean;
}>;

function fmtMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function buildDiagnosticsReport(snap: DiagnosticsSnapshot): string {
  const cap = snap.capability;
  const lines = [
    "Relatório técnico — LV-10 Spike de áudio",
    "----------------------------------------",
    `Navegador identificado: ${cap.browser}`,
    `Plataforma identificada: ${cap.platform}`,
    `MediaRecorder disponível: ${cap.supported ? "sim" : "não"}`,
    `getUserMedia disponível: ${cap.supported ? "sim" : "não"}`,
    `Formato selecionado: ${cap.selectedMimeType ?? "nenhum"}`,
    `Codec: ${cap.codec ?? "n/d"}`,
    `AudioContext: ${cap.hasAudioContext ? "sim" : "não"}`,
    `devicechange: ${cap.hasDeviceChangeEvent ? "sim" : "não"}`,
    `Microfones encontrados: ${snap.microphoneCount}`,
    `Microfone selecionado: ${snap.selectedDeviceLabel || "Microfone padrão"}`,
    `Suporte a pausa: ${snap.supportsPause ? "sim" : "não"}`,
    `Tempo gravado: ${fmtMs(snap.recordedMs)}`,
    `Blocos recebidos: ${snap.chunksReceived}`,
    `Segmentos concluídos: ${snap.segmentsCompleted}`,
    `Segmentos incompletos: ${snap.segmentsIncomplete}`,
    `Falhas: ${snap.failures}`,
    `Recuperações: ${snap.recoveries}`,
    `Memória aproximada: ${fmtBytes(snap.approxMemoryBytes)}`,
    "----------------------------------------",
    "Sem backend. Sem transcrição. Sem IA real.",
  ];
  return lines.join("\n");
}

export { fmtMs as formatDurationMs, fmtBytes as formatBytes };
