/**
 * LV-09.3 — Biblioteca documental (mock)
 * Contratos de tipos exclusivos da funcionalidade.
 */

export type DocumentCategory =
  | "laudo"
  | "peticao"
  | "decisao"
  | "documento_pessoal"
  | "comprovante"
  | "relatorio_tecnico"
  | "imagem"
  | "audio"
  | "video"
  | "outro";

export type DocumentStatus =
  | "ativo"
  | "pendente_revisao"
  | "arquivado"
  | "com_prazo"
  | "prazo_vencido";

export type DocumentConfidentiality = "publico" | "restrito" | "sigiloso";

export type DocumentDeadlineState =
  | "sem_prazo"
  | "futuro"
  | "vencendo"
  | "vencido"
  | "hoje";

export type DocumentVersion = Readonly<{
  id: string;
  version: number;
  fileName: string;
  fileSizeLabel: string;
  mimeType: string;
  description?: string;
  createdAt: string;
  createdByLabel: string;
}>;

export type DocumentAnnotation = Readonly<{
  id: string;
  text: string;
  createdAt: string;
  authorLabel: string;
}>;

export type DocumentRecord = Readonly<{
  id: string;
  organizationId: string;
  name: string;
  category: DocumentCategory;
  status: DocumentStatus;
  confidentiality: DocumentConfidentiality;
  description?: string;
  caseId?: string;
  expertiseId?: string;
  personIds: readonly string[];
  deadlineAt?: string;
  currentVersion: number;
  versions: readonly DocumentVersion[];
  annotations: readonly DocumentAnnotation[];
  createdAt: string;
  updatedAt: string;
  responsibleLabel: string;
}>;

export const ACCEPTED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "jpg",
  "jpeg",
  "png",
  "txt",
] as const;

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
export const MAX_NAME_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 2000;
export const MAX_ANNOTATION_LENGTH = 2000;
