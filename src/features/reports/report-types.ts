/**
 * LV-14 — Modelos Documentais e Estrutura do Laudo (mock)
 *
 * Tipos puros. Nenhum React, backend, IA ou armazenamento externo.
 */

export type ReportTemplateId =
  | "laudo_psicologico"
  | "parecer_psicologico"
  | "estudo_social"
  | "parecer_social"
  | "laudo_multiprofissional"
  | "relatorio_tecnico"
  | "personalizado";

export const REPORT_TEMPLATE_IDS: readonly ReportTemplateId[] = [
  "laudo_psicologico",
  "parecer_psicologico",
  "estudo_social",
  "parecer_social",
  "laudo_multiprofissional",
  "relatorio_tecnico",
  "personalizado",
] as const;

export const REPORT_TEMPLATE_LABEL: Readonly<Record<ReportTemplateId, string>> = {
  laudo_psicologico: "Laudo Psicológico",
  parecer_psicologico: "Parecer Psicológico",
  estudo_social: "Estudo Social",
  parecer_social: "Parecer Social",
  laudo_multiprofissional: "Laudo Multiprofissional",
  relatorio_tecnico: "Relatório Técnico",
  personalizado: "Documento Personalizado",
};

/** Seções obrigatórias exigidas pela LV-14 (chaves canônicas). */
export type ReportSectionKind =
  | "identificacao_pericia"
  | "identificacao_partes"
  | "objeto"
  | "historico"
  | "metodologia"
  | "entrevistas"
  | "diligencias"
  | "documentos_analisados"
  | "evidencias"
  | "quesitos"
  | "fundamentacao"
  | "analise"
  | "conclusao"
  | "anexos";

export const REPORT_SECTION_KINDS: readonly ReportSectionKind[] = [
  "identificacao_pericia",
  "identificacao_partes",
  "objeto",
  "historico",
  "metodologia",
  "entrevistas",
  "diligencias",
  "documentos_analisados",
  "evidencias",
  "quesitos",
  "fundamentacao",
  "analise",
  "conclusao",
  "anexos",
] as const;

export const REPORT_SECTION_LABEL: Readonly<Record<ReportSectionKind, string>> = {
  identificacao_pericia: "Identificação da perícia",
  identificacao_partes: "Identificação das partes",
  objeto: "Objeto da perícia",
  historico: "Histórico",
  metodologia: "Metodologia",
  entrevistas: "Entrevistas",
  diligencias: "Diligências",
  documentos_analisados: "Documentos analisados",
  evidencias: "Evidências",
  quesitos: "Quesitos",
  fundamentacao: "Fundamentação técnica",
  analise: "Análise",
  conclusao: "Conclusão",
  anexos: "Anexos",
};

export type ReportSectionStatus =
  | "nao_iniciada"
  | "em_elaboracao"
  | "revisada"
  | "aprovada";

export const REPORT_SECTION_STATUSES: readonly ReportSectionStatus[] = [
  "nao_iniciada",
  "em_elaboracao",
  "revisada",
  "aprovada",
] as const;

export const REPORT_SECTION_STATUS_LABEL: Readonly<Record<ReportSectionStatus, string>> = {
  nao_iniciada: "Não iniciada",
  em_elaboracao: "Em elaboração",
  revisada: "Revisada",
  aprovada: "Aprovada",
};

export type ReportBlockOrigin = "modelo" | "manual" | "importado";

export const REPORT_BLOCK_ORIGIN_LABEL: Readonly<Record<ReportBlockOrigin, string>> = {
  modelo: "Origem: modelo",
  manual: "Origem: manual",
  importado: "Origem: importado",
};

export type ReportSourceKind =
  | "entrevista"
  | "diligencia"
  | "documento"
  | "quesito"
  | "evidencia";

export const REPORT_SOURCE_KIND_LABEL: Readonly<Record<ReportSourceKind, string>> = {
  entrevista: "Entrevista",
  diligencia: "Diligência",
  documento: "Documento",
  quesito: "Quesito",
  evidencia: "Evidência",
};

export type ReportSourceRef = {
  readonly id: string;
  readonly kind: ReportSourceKind;
  readonly refId: string;
  readonly label: string;
};

export type ReportBlock = {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly origin: ReportBlockOrigin;
  readonly manuallyEdited: boolean;
  readonly reviewed: boolean;
  readonly sources: readonly ReportSourceRef[];
};

export type ReportSection = {
  readonly id: string;
  readonly kind: ReportSectionKind;
  readonly title: string;
  readonly status: ReportSectionStatus;
  readonly blocks: readonly ReportBlock[];
};

export type ReportDocument = {
  readonly id: string;
  readonly title: string;
  readonly templateId: ReportTemplateId;
  readonly caseId: string;
  readonly caseLabel: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly sections: readonly ReportSection[];
};

export type ReportListSummary = {
  readonly id: string;
  readonly title: string;
  readonly templateId: ReportTemplateId;
  readonly caseLabel: string;
  readonly updatedAt: string;
  readonly reviewProgress: number; // 0..1 baseado em seções aprovadas/revisadas
};
