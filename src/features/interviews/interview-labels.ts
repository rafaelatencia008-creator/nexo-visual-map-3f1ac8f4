/**
 * LV-11 — Rótulos em português das entidades do módulo.
 */

import type {
  DiligenceChecklistState,
  DiligenceKind,
  DiligencePhotoCategory,
  InterviewNoteKind,
  InterviewStatus,
  QuestionAnswerStatus,
} from "./interview-types";

export const INTERVIEW_STATUS_LABEL: Record<InterviewStatus, string> = {
  agendada: "Agendada",
  em_preparacao: "Em preparação",
  em_andamento: "Em andamento",
  pausada: "Pausada",
  concluida: "Concluída",
  cancelada: "Cancelada",
  com_pendencia: "Com pendência",
};

export const NOTE_KIND_LABEL: Record<InterviewNoteKind, string> = {
  observacao: "Observação",
  ponto_importante: "Ponto importante",
  pendencia: "Pendência",
  contradicao: "Contradição",
  conclusao_provisoria: "Conclusão provisória",
};

export const DILIGENCE_KIND_LABEL: Record<DiligenceKind, string> = {
  vistoria_imovel: "Vistoria de imóvel",
  visita_domiciliar: "Visita domiciliar",
  inspecao_tecnica: "Inspeção técnica",
  coleta_evidencias: "Coleta de evidências",
  diligencia_externa: "Diligência externa",
  outro: "Outro",
};

export const CHECKLIST_STATE_LABEL: Record<DiligenceChecklistState, string> = {
  pendente: "Pendente",
  concluido: "Concluído",
  nao_aplicavel: "Não aplicável",
};

export const PHOTO_CATEGORY_LABEL: Record<DiligencePhotoCategory, string> = {
  visao_geral: "Visão geral",
  ambiente: "Ambiente",
  objeto: "Objeto",
  documento: "Documento",
  dano: "Dano",
  evidencia: "Evidência",
  outro: "Outro",
};

export const QUESTION_STATUS_LABEL: Record<QuestionAnswerStatus, string> = {
  pendente: "Pendente",
  respondida: "Respondida",
  ignorada: "Ignorada",
};

export const MODULE_KIND_LABEL: Record<"entrevista" | "diligencia", string> = {
  entrevista: "Entrevista",
  diligencia: "Diligência",
};
