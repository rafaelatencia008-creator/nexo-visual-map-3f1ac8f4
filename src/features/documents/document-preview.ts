/**
 * LV-09.4 — Visualizador documental (mock).
 *
 * Helpers puros e determinísticos. Nada é buscado, transmitido ou armazenado.
 * A prévia é sempre reconstruída a partir do par (documentId, versionId) —
 * sem Math.random, crypto.randomUUID ou Date.now.
 */

import { getExtension } from "./document-form";

export type PreviewKind =
  | "text"
  | "sheet"
  | "image"
  | "audio"
  | "video"
  | "unsupported";

export const PREVIEW_KIND_LABEL: Record<PreviewKind, string> = {
  text: "Documento textual",
  sheet: "Planilha",
  image: "Imagem",
  audio: "Áudio",
  video: "Vídeo",
  unsupported: "Formato sem prévia",
};

export type PreviewStatus =
  | "preparing"
  | "ready"
  | "unsupported"
  | "error"
  | "offline"
  | "forbidden";

export const PREVIEW_STATUS_LABEL: Record<PreviewStatus, string> = {
  preparing: "Preparando visualização…",
  ready: "Prévia disponível",
  unsupported: "Formato sem prévia",
  error: "Não foi possível preparar a visualização",
  offline: "Você está offline",
  forbidden: "Sem permissão",
};

/** Aviso obrigatório apresentado em toda prévia demonstrativa. */
export const PREVIEW_DEMO_NOTICE =
  "Prévia demonstrativa. O arquivo real não está armazenado nesta etapa.";

// ─────────────────────────────────────────────────────────────
// Classificação por extensão / mime
// ─────────────────────────────────────────────────────────────

const TEXT_EXT = new Set(["pdf", "doc", "docx", "txt"]);
const SHEET_EXT = new Set(["xls", "xlsx", "csv"]);
const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
const AUDIO_EXT = new Set(["mp3", "wav", "ogg", "m4a"]);
const VIDEO_EXT = new Set(["mp4", "mov", "webm", "mkv"]);

export function classifyPreview(fileName: string, mimeType?: string): PreviewKind {
  const ext = getExtension(fileName);
  if (TEXT_EXT.has(ext)) return "text";
  if (SHEET_EXT.has(ext)) return "sheet";
  if (IMAGE_EXT.has(ext)) return "image";
  if (AUDIO_EXT.has(ext)) return "audio";
  if (VIDEO_EXT.has(ext)) return "video";
  const m = (mimeType ?? "").toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("audio/")) return "audio";
  if (m.startsWith("video/")) return "video";
  if (m === "application/pdf" || m.startsWith("text/")) return "text";
  if (m.includes("spreadsheet") || m.includes("excel")) return "sheet";
  return "unsupported";
}

// ─────────────────────────────────────────────────────────────
// Zoom e rotação
// ─────────────────────────────────────────────────────────────

export const MIN_ZOOM = 50;
export const MAX_ZOOM = 300;
export const ZOOM_STEP = 25;
export const DEFAULT_ZOOM = 100;
export const ZOOM_STEPS: readonly number[] = [
  50, 75, 100, 125, 150, 175, 200, 250, 300,
];

export function clampZoom(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_ZOOM;
  if (value < MIN_ZOOM) return MIN_ZOOM;
  if (value > MAX_ZOOM) return MAX_ZOOM;
  return Math.round(value);
}

export function zoomIn(current: number): number {
  return clampZoom(current + ZOOM_STEP);
}

export function zoomOut(current: number): number {
  return clampZoom(current - ZOOM_STEP);
}

export const ROTATIONS: readonly number[] = [0, 90, 180, 270];

export function isValidRotation(r: number): boolean {
  return ROTATIONS.includes(r);
}

export function nextRotation(current: number): number {
  const idx = ROTATIONS.indexOf(current);
  const next = idx < 0 ? 0 : (idx + 1) % ROTATIONS.length;
  return ROTATIONS[next]!;
}

/** Zoom para “ajustar à largura”, dado um container e uma largura base. */
export function fitWidthZoom(containerWidth: number, baseWidth = 800): number {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return DEFAULT_ZOOM;
  const pct = Math.round((containerWidth / baseWidth) * 100);
  return clampZoom(pct);
}

// ─────────────────────────────────────────────────────────────
// PRNG determinístico e hash de string
// ─────────────────────────────────────────────────────────────

export function hashString(input: string): number {
  // FNV-1a 32-bit — determinístico e sem colisões relevantes para prévias.
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function seededRandom(seed: number): () => number {
  // Mulberry32
  let a = (seed | 0) || 1;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function previewSeed(
  documentId: string,
  versionId: string,
  pageIndex = 0,
): number {
  return hashString(`${documentId}::${versionId}::${pageIndex}`);
}

// ─────────────────────────────────────────────────────────────
// Contagem de páginas
// ─────────────────────────────────────────────────────────────

export function getPreviewPageCount(
  kind: PreviewKind,
  documentId: string,
  versionId: string,
): number {
  if (kind === "unsupported") return 0;
  if (kind === "text") {
    const seed = previewSeed(documentId, versionId, -1);
    return 3 + (seed % 6); // 3..8
  }
  return 1;
}

// ─────────────────────────────────────────────────────────────
// Conteúdo mock por tipo
// ─────────────────────────────────────────────────────────────

const TITLES = [
  "Introdução",
  "Contextualização",
  "Desenvolvimento",
  "Análise técnica",
  "Considerações",
  "Recomendações",
  "Anexos",
  "Encerramento",
];

const PHRASES = [
  "Este trecho é demonstrativo e não representa conteúdo real do documento.",
  "A finalidade desta prévia é ilustrar a diagramação da página.",
  "Os dados exibidos são fictícios e determinísticos por documento e versão.",
  "Nenhum arquivo real é armazenado, transmitido ou processado nesta etapa.",
  "A biblioteca documental utiliza dados em memória durante a sessão atual.",
  "O layout aqui apresentado será conectado a um storage seguro em fase posterior.",
  "Os controles de zoom, rotação e paginação são plenamente funcionais.",
  "A prévia demonstrativa preserva a identidade visual da aplicação.",
];

export interface TextPagePreview {
  readonly kind: "text";
  readonly title: string;
  readonly paragraphs: readonly string[];
}

export function buildTextPage(
  documentId: string,
  versionId: string,
  pageIndex: number,
): TextPagePreview {
  const rand = seededRandom(previewSeed(documentId, versionId, pageIndex));
  const title = TITLES[pageIndex % TITLES.length]!;
  const paragraphCount = 3 + Math.floor(rand() * 3); // 3..5
  const paragraphs: string[] = [];
  for (let i = 0; i < paragraphCount; i += 1) {
    const sentenceCount = 2 + Math.floor(rand() * 3);
    const sentences: string[] = [];
    for (let s = 0; s < sentenceCount; s += 1) {
      sentences.push(PHRASES[Math.floor(rand() * PHRASES.length)]!);
    }
    paragraphs.push(sentences.join(" "));
  }
  return { kind: "text", title, paragraphs };
}

export interface SheetPreview {
  readonly kind: "sheet";
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

export function buildSheetPreview(
  documentId: string,
  versionId: string,
): SheetPreview {
  const rand = seededRandom(previewSeed(documentId, versionId, 0));
  const headers = ["Item", "Descrição", "Quantidade", "Valor (R$)", "Situação"];
  const situations = ["Concluído", "Em andamento", "Pendente", "Aguardando"];
  const rowCount = 8 + Math.floor(rand() * 5); // 8..12
  const rows: string[][] = [];
  for (let i = 0; i < rowCount; i += 1) {
    const qty = 1 + Math.floor(rand() * 25);
    const value = (10 + rand() * 990).toFixed(2);
    rows.push([
      String(i + 1).padStart(3, "0"),
      `Item demonstrativo ${i + 1}`,
      String(qty),
      value,
      situations[Math.floor(rand() * situations.length)]!,
    ]);
  }
  return { kind: "sheet", headers, rows };
}

export interface ImagePreview {
  readonly kind: "image";
  readonly hue: number;
  readonly hue2: number;
  readonly label: string;
}

export function buildImagePreview(
  documentId: string,
  versionId: string,
): ImagePreview {
  const seed = previewSeed(documentId, versionId, 0);
  const rand = seededRandom(seed);
  const hue = seed % 360;
  const hue2 = (hue + 40 + Math.floor(rand() * 60)) % 360;
  return { kind: "image", hue, hue2, label: "Prévia demonstrativa" };
}

export interface AudioPreview {
  readonly kind: "audio";
  readonly durationLabel: string;
  readonly waveform: readonly number[];
}

export function buildAudioPreview(
  documentId: string,
  versionId: string,
): AudioPreview {
  const rand = seededRandom(previewSeed(documentId, versionId, 0));
  const total = 30 + Math.floor(rand() * 240); // 30s..270s
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  const durationLabel = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  const waveform: number[] = [];
  for (let i = 0; i < 48; i += 1) {
    waveform.push(0.2 + rand() * 0.8);
  }
  return { kind: "audio", durationLabel, waveform };
}

export interface VideoPreview {
  readonly kind: "video";
  readonly durationLabel: string;
  readonly hue: number;
}

export function buildVideoPreview(
  documentId: string,
  versionId: string,
): VideoPreview {
  const seed = previewSeed(documentId, versionId, 0);
  const rand = seededRandom(seed);
  const total = 30 + Math.floor(rand() * 300);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  const durationLabel = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  return { kind: "video", durationLabel, hue: seed % 360 };
}

// ─────────────────────────────────────────────────────────────
// Paginação segura
// ─────────────────────────────────────────────────────────────

export function clampPage(page: number, total: number): number {
  if (total <= 0) return 0;
  if (!Number.isFinite(page) || page < 1) return 1;
  if (page > total) return total;
  return Math.floor(page);
}

export function formatPageIndicator(current: number, total: number): string {
  if (total <= 0) return "Sem páginas";
  return `Página ${current} de ${total}`;
}

// ─────────────────────────────────────────────────────────────
// Miniaturas
// ─────────────────────────────────────────────────────────────

export interface ThumbnailEntry {
  readonly index: number;
  readonly label: string;
}

export function buildThumbnails(pageCount: number): ThumbnailEntry[] {
  const out: ThumbnailEntry[] = [];
  for (let i = 1; i <= pageCount; i += 1) {
    out.push({ index: i, label: `Miniatura da página ${i}` });
  }
  return out;
}
