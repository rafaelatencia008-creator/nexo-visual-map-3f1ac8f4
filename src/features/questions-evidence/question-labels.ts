/**
 * LV-12 — Rótulos em português.
 */
import type {
  EvidenceRelevance,
  EvidenceType,
  GapKind,
  HistoryEventKind,
  QuestionOrigin,
  QuestionPriority,
  QuestionStatus,
} from "./question-types";

export const QUESTION_ORIGIN_LABEL: Record<QuestionOrigin, string> = {
  juizo: "Juízo",
  autor: "Autor",
  reu: "Réu",
  ministerio_publico: "Ministério Público",
  assistente_tecnico: "Assistente técnico",
  perito: "Perito",
  complementar: "Quesito complementar",
  outro: "Outro",
};

export const QUESTION_STATUS_LABEL: Record<QuestionStatus, string> = {
  nao_analisado: "Não analisado",
  em_analise: "Em análise",
  sem_evidencia: "Sem evidência",
  parcial: "Parcialmente respondido",
  respondido: "Respondido",
  nao_aplicavel: "Não aplicável",
  com_divergencia: "Com divergência",
};

export const QUESTION_PRIORITY_LABEL: Record<QuestionPriority, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  critica: "Crítica",
};

export const EVIDENCE_TYPE_LABEL: Record<EvidenceType, string> = {
  documento: "Documento",
  documento_versao: "Versão de documento",
  entrevista: "Entrevista",
  transcricao_trecho: "Trecho de transcrição",
  entrevista_nota: "Nota de entrevista",
  diligencia: "Diligência",
  diligencia_foto: "Foto de diligência",
  diligencia_localizacao: "Localização de diligência",
  observacao_manual: "Observação técnica",
};

export const EVIDENCE_RELEVANCE_LABEL: Record<EvidenceRelevance, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  determinante: "Determinante",
};

export const GAP_KIND_LABEL: Record<GapKind, string> = {
  documento_ausente: "Documento ausente",
  entrevista_necessaria: "Entrevista necessária",
  diligencia_necessaria: "Diligência necessária",
  resposta_incompleta: "Resposta incompleta",
  contradicao: "Contradição não resolvida",
  prazo_vencido: "Prazo vencido",
  validacao_pendente: "Validação técnica pendente",
  outro: "Outra",
};

export const HISTORY_EVENT_LABEL: Record<HistoryEventKind, string> = {
  criado: "Quesito criado",
  resposta_alterada: "Resposta alterada",
  situacao_alterada: "Situação alterada",
  evidencia_vinculada: "Evidência vinculada",
  evidencia_removida: "Evidência removida",
  lacuna_criada: "Lacuna criada",
  lacuna_resolvida: "Lacuna resolvida",
  divergencia_analisada: "Divergência analisada",
  preparado_laudo: "Preparado para o laudo",
  retirado_preparacao: "Retirado da preparação",
};

export type CoverageBand =
  | "insuficiente"
  | "baixa"
  | "parcial"
  | "boa"
  | "completa";

export const COVERAGE_BAND_LABEL: Record<CoverageBand, string> = {
  insuficiente: "Insuficiente",
  baixa: "Baixa",
  parcial: "Parcial",
  boa: "Boa",
  completa: "Completa",
};
