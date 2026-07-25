/**
 * LV-09.3 — Helpers puros de formulário e cálculo de prazos.
 */

import {
  ACCEPTED_EXTENSIONS,
  MAX_ANNOTATION_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_FILE_SIZE_BYTES,
  MAX_NAME_LENGTH,
  type DocumentCategory,
  type DocumentConfidentiality,
  type DocumentDeadlineState,
} from "./document-types";

export interface DocumentFileMeta {
  fileName: string;
  sizeBytes: number;
  mimeType: string;
}

export interface DocumentFormInput {
  file?: DocumentFileMeta | null;
  name: string;
  category: DocumentCategory | "";
  confidentiality: DocumentConfidentiality | "";
  description?: string;
  caseId?: string;
  expertiseId?: string;
  personIds?: readonly string[];
  deadlineAt?: string;
  responsibleLabel?: string;
}

export type DocumentFormErrors = Partial<
  Record<
    | "file"
    | "name"
    | "category"
    | "confidentiality"
    | "description"
    | "deadlineAt",
    string
  >
>;

const CANONICAL_ERROR_ORDER: ReadonlyArray<keyof DocumentFormErrors> = [
  "file",
  "name",
  "category",
  "confidentiality",
  "deadlineAt",
  "description",
];

export function getExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  if (idx <= 0 || idx === fileName.length - 1) return "";
  return fileName.slice(idx + 1).toLowerCase();
}

export function isAcceptedExtension(ext: string): boolean {
  return (ACCEPTED_EXTENSIONS as ReadonlyArray<string>).includes(ext.toLowerCase());
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export function validateFileMeta(file: DocumentFileMeta | null | undefined): string | undefined {
  if (!file) return "Arquivo obrigatório.";
  const ext = getExtension(file.fileName);
  if (!ext || !isAcceptedExtension(ext)) return "Tipo de arquivo não permitido.";
  if (file.sizeBytes > MAX_FILE_SIZE_BYTES) return "Arquivo excede 50 MB.";
  if (file.sizeBytes < 0) return "Tamanho inválido.";
  return undefined;
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m! - 1 &&
    dt.getUTCDate() === d
  );
}

export function validateDocumentForm(input: DocumentFormInput): DocumentFormErrors {
  const errors: DocumentFormErrors = {};
  const fileErr = validateFileMeta(input.file ?? null);
  if (fileErr) errors.file = fileErr;

  const name = input.name?.trim() ?? "";
  if (name.length < 3) errors.name = "Informe um nome com ao menos 3 caracteres.";
  else if (name.length > MAX_NAME_LENGTH) errors.name = `Nome excede ${MAX_NAME_LENGTH} caracteres.`;

  if (!input.category) errors.category = "Escolha uma categoria.";
  if (!input.confidentiality) errors.confidentiality = "Escolha o nível de sigilo.";

  const desc = input.description?.trim() ?? "";
  if (desc.length > MAX_DESCRIPTION_LENGTH)
    errors.description = `Descrição excede ${MAX_DESCRIPTION_LENGTH} caracteres.`;

  if (input.deadlineAt && input.deadlineAt.length > 0 && !isIsoDate(input.deadlineAt)) {
    errors.deadlineAt = "Data inválida.";
  }
  return errors;
}

export function getFirstDocumentErrorField(
  errors: DocumentFormErrors,
): keyof DocumentFormErrors | null {
  for (const key of CANONICAL_ERROR_ORDER) {
    if (errors[key]) return key;
  }
  return null;
}

// —— Versão

export interface DocumentVersionInput {
  file?: DocumentFileMeta | null;
  description?: string;
}

export type DocumentVersionErrors = Partial<Record<"file" | "description", string>>;

export function validateVersionForm(input: DocumentVersionInput): DocumentVersionErrors {
  const errors: DocumentVersionErrors = {};
  const fileErr = validateFileMeta(input.file ?? null);
  if (fileErr) errors.file = fileErr;
  const desc = input.description?.trim() ?? "";
  if (desc.length > MAX_DESCRIPTION_LENGTH)
    errors.description = `Descrição excede ${MAX_DESCRIPTION_LENGTH} caracteres.`;
  return errors;
}

// —— Anotações

export function validateAnnotation(text: string): string | undefined {
  const t = text?.trim() ?? "";
  if (t.length === 0) return "Anotação obrigatória.";
  if (t.length > MAX_ANNOTATION_LENGTH)
    return `Anotação excede ${MAX_ANNOTATION_LENGTH} caracteres.`;
  return undefined;
}

// —— Prazos

const DAY_MS = 86_400_000;

export function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.UTC(
    Number(fromIso.slice(0, 4)),
    Number(fromIso.slice(5, 7)) - 1,
    Number(fromIso.slice(8, 10)),
  );
  const to = Date.UTC(
    Number(toIso.slice(0, 4)),
    Number(toIso.slice(5, 7)) - 1,
    Number(toIso.slice(8, 10)),
  );
  return Math.round((to - from) / DAY_MS);
}

export function computeDeadlineState(
  deadlineAt: string | undefined,
  referenceIsoDate: string,
): DocumentDeadlineState {
  if (!deadlineAt) return "sem_prazo";
  const iso = deadlineAt.slice(0, 10);
  if (!isIsoDate(iso)) return "sem_prazo";
  const diff = daysBetween(referenceIsoDate, iso);
  if (diff === 0) return "hoje";
  if (diff < 0) return "vencido";
  if (diff <= 7) return "vencendo";
  return "futuro";
}

export function formatDeadlineText(
  deadlineAt: string | undefined,
  referenceIsoDate: string,
): string {
  if (!deadlineAt) return "Sem prazo";
  const iso = deadlineAt.slice(0, 10);
  if (!isIsoDate(iso)) return "Sem prazo";
  const diff = daysBetween(referenceIsoDate, iso);
  if (diff === 0) return "Vence hoje";
  if (diff > 0) return diff === 1 ? "Vence em 1 dia" : `Vence em ${diff} dias`;
  const abs = Math.abs(diff);
  return abs === 1 ? "Vencido há 1 dia" : `Vencido há ${abs} dias`;
}
