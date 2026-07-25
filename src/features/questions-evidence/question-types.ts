/**
 * LV-12 — Quesitos e evidências (mock)
 * Contratos de tipos exclusivos do módulo.
 */

export type QuestionOrigin =
  | "juizo"
  | "autor"
  | "reu"
  | "ministerio_publico"
  | "assistente_tecnico"
  | "perito"
  | "complementar"
  | "outro";

export type QuestionStatus =
  | "nao_analisado"
  | "em_analise"
  | "sem_evidencia"
  | "parcial"
  | "respondido"
  | "nao_aplicavel"
  | "com_divergencia";

export type QuestionPriority = "baixa" | "normal" | "alta" | "critica";

export type EvidenceType =
  | "documento"
  | "documento_versao"
  | "entrevista"
  | "transcricao_trecho"
  | "entrevista_nota"
  | "diligencia"
  | "diligencia_foto"
  | "diligencia_localizacao"
  | "observacao_manual";

export type EvidenceRelevance = "baixa" | "media" | "alta" | "determinante";

export type EvidenceLink = Readonly<{
  id: string;
  questionId: string;
  evidenceType: EvidenceType;
  sourceId?: string;
  sourceParentId?: string;
  sourceLabel: string;
  excerpt?: string;
  technicalNote?: string;
  relevance: EvidenceRelevance;
  supportsAnswer: boolean;
  contradictsAnswer: boolean;
  contradictionJustification?: string;
  createdAt: string;
  createdByLabel: string;
}>;

export type GapKind =
  | "documento_ausente"
  | "entrevista_necessaria"
  | "diligencia_necessaria"
  | "resposta_incompleta"
  | "contradicao"
  | "prazo_vencido"
  | "validacao_pendente"
  | "outro";

export type QuestionGap = Readonly<{
  id: string;
  questionId: string;
  kind: GapKind;
  description: string;
  responsibleLabel?: string;
  priority: QuestionPriority;
  dueAt?: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedByEvidenceId?: string;
  createdAt: string;
}>;

export type HistoryEventKind =
  | "criado"
  | "resposta_alterada"
  | "situacao_alterada"
  | "evidencia_vinculada"
  | "evidencia_removida"
  | "lacuna_criada"
  | "lacuna_resolvida"
  | "divergencia_analisada"
  | "preparado_laudo"
  | "retirado_preparacao";

export type HistoryEvent = Readonly<{
  id: string;
  questionId: string;
  kind: HistoryEventKind;
  summary: string;
  authorLabel: string;
  createdAt: string;
}>;

export type ExpertQuestion = Readonly<{
  id: string;
  caseId?: string;
  expertiseId?: string;
  sequence: number;
  origin: QuestionOrigin;
  originLabel?: string;
  text: string;
  objective?: string;
  status: QuestionStatus;
  priority: QuestionPriority;
  technicalAnalysis?: string;
  technicalAnswer?: string;
  conclusion?: string;
  observations?: string;
  evidenceLinks: readonly EvidenceLink[];
  gapItems: readonly QuestionGap[];
  tags: readonly string[];
  responsibleLabel: string;
  dueAt?: string;
  readyForReport: boolean;
  divergenceAnalyzed: boolean;
  divergenceJustification?: string;
  history: readonly HistoryEvent[];
  createdAt: string;
  updatedAt: string;
}>;

export const QUESTION_ORIGINS: readonly QuestionOrigin[] = [
  "juizo",
  "autor",
  "reu",
  "ministerio_publico",
  "assistente_tecnico",
  "perito",
  "complementar",
  "outro",
] as const;

export const QUESTION_STATUSES: readonly QuestionStatus[] = [
  "nao_analisado",
  "em_analise",
  "sem_evidencia",
  "parcial",
  "respondido",
  "nao_aplicavel",
  "com_divergencia",
] as const;

export const QUESTION_PRIORITIES: readonly QuestionPriority[] = [
  "baixa",
  "normal",
  "alta",
  "critica",
] as const;

export const EVIDENCE_TYPES: readonly EvidenceType[] = [
  "documento",
  "documento_versao",
  "entrevista",
  "transcricao_trecho",
  "entrevista_nota",
  "diligencia",
  "diligencia_foto",
  "diligencia_localizacao",
  "observacao_manual",
] as const;

export const EVIDENCE_RELEVANCES: readonly EvidenceRelevance[] = [
  "baixa",
  "media",
  "alta",
  "determinante",
] as const;

export const GAP_KINDS: readonly GapKind[] = [
  "documento_ausente",
  "entrevista_necessaria",
  "diligencia_necessaria",
  "resposta_incompleta",
  "contradicao",
  "prazo_vencido",
  "validacao_pendente",
  "outro",
] as const;

export const MAX_QUESTION_TEXT = 2000;
export const MAX_ANSWER_TEXT = 8000;
export const MAX_OBJECTIVE_TEXT = 1000;
export const MAX_TAG_LENGTH = 40;
export const MAX_TAGS = 8;
export const MAX_RESPONSIBLE_LENGTH = 120;
export const MAX_ORIGIN_LABEL_LENGTH = 120;
export const MAX_EXCERPT_LENGTH = 2000;
export const MAX_TECHNICAL_NOTE_LENGTH = 1000;
export const MAX_GAP_DESCRIPTION = 1000;
