/**
 * LV-09.3 — Rótulos em português das entidades documentais.
 */

import type {
  DocumentCategory,
  DocumentConfidentiality,
  DocumentDeadlineState,
  DocumentStatus,
} from "./document-types";

export const DOCUMENT_CATEGORY_LABEL: Record<DocumentCategory, string> = {
  laudo: "Laudo",
  peticao: "Petição",
  decisao: "Decisão judicial",
  documento_pessoal: "Documento pessoal",
  comprovante: "Comprovante",
  relatorio_tecnico: "Relatório técnico",
  imagem: "Imagem",
  audio: "Áudio",
  video: "Vídeo",
  outro: "Outro",
};

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  ativo: "Ativo",
  pendente_revisao: "Pendente de revisão",
  arquivado: "Arquivado",
  com_prazo: "Com prazo",
  prazo_vencido: "Prazo vencido",
};

export const DOCUMENT_CONFIDENTIALITY_LABEL: Record<DocumentConfidentiality, string> = {
  publico: "Público no processo",
  restrito: "Restrito",
  sigiloso: "Sigiloso",
};

export const DOCUMENT_CONFIDENTIALITY_SHORT: Record<DocumentConfidentiality, string> = {
  publico: "Público",
  restrito: "Restrito",
  sigiloso: "Sigiloso",
};

export const DOCUMENT_DEADLINE_LABEL: Record<DocumentDeadlineState, string> = {
  sem_prazo: "Sem prazo",
  futuro: "Prazo futuro",
  vencendo: "Vencendo em breve",
  vencido: "Prazo vencido",
  hoje: "Vence hoje",
};

export const DOCUMENT_CATEGORIES = Object.keys(DOCUMENT_CATEGORY_LABEL) as ReadonlyArray<DocumentCategory>;
export const DOCUMENT_STATUSES = Object.keys(DOCUMENT_STATUS_LABEL) as ReadonlyArray<DocumentStatus>;
export const DOCUMENT_CONFIDENTIALITIES = Object.keys(
  DOCUMENT_CONFIDENTIALITY_LABEL,
) as ReadonlyArray<DocumentConfidentiality>;
