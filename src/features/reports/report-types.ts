/**
 * LV-14 / LV-15 — Tipos do domínio dos documentos periciais (mock).
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

/**
 * LV-15 — seções obrigatórias para status "Aprovado".
 * "anexos" é opcional (não impeditivo).
 */
export const REPORT_MANDATORY_SECTIONS: readonly ReportSectionKind[] = [
  "identificacao_pericia",
  "identificacao_partes",
  "objeto",
  "historico",
  "metodologia",
  "quesitos",
  "fundamentacao",
  "analise",
  "conclusao",
] as const;

export function isMandatorySection(kind: ReportSectionKind): boolean {
  return REPORT_MANDATORY_SECTIONS.includes(kind);
}

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
  /** LV-15 — data/hora mock da última alteração do bloco. */
  readonly lastEditedAt?: string;
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
  readonly reviewProgress: number;
};

// ---------- LV-15 — status geral, pendências, histórico ----------

export type ReportGeneralStatus =
  | "rascunho"
  | "em_revisao"
  | "revisado"
  | "aprovado_demonstrativo";

export const REPORT_GENERAL_STATUS_LABEL: Readonly<
  Record<ReportGeneralStatus, string>
> = {
  rascunho: "Rascunho",
  em_revisao: "Em revisão",
  revisado: "Revisado",
  aprovado_demonstrativo: "Aprovado para exportação demonstrativa",
};

export type ReportPendingSeverity = "impeditivo" | "aviso";

export type ReportPendingKind =
  | "titulo_vazio"
  | "sem_pericia"
  | "secao_obrigatoria_vazia"
  | "secao_obrigatoria_nao_revisada"
  | "bloco_obrigatorio_vazio"
  | "nenhuma_secao_aprovada"
  | "bloco_sem_fonte"
  | "secao_em_elaboracao"
  | "bloco_editado_apos_revisao"
  | "sem_anexos"
  | "fonte_indisponivel";

export type ReportPendingItem = {
  readonly kind: ReportPendingKind;
  readonly severity: ReportPendingSeverity;
  readonly message: string;
  readonly sectionId?: string;
  readonly blockId?: string;
};

export type ReportHistoryEventKind =
  | "documento_criado"
  | "titulo_alterado"
  | "modelo_alterado"
  | "bloco_criado"
  | "bloco_duplicado"
  | "bloco_removido"
  | "bloco_movido"
  | "conteudo_alterado"
  | "titulo_bloco_alterado"
  | "fonte_vinculada"
  | "fonte_removida"
  | "bloco_revisado"
  | "revisao_retirada"
  | "status_secao_alterado"
  | "previa_aberta"
  | "exportacao_realizada"
  | "exportacao_bloqueada";

export type ReportHistoryEvent = {
  readonly id: string;
  readonly kind: ReportHistoryEventKind;
  readonly at: string;
  readonly description: string;
  readonly reportId: string;
  readonly sectionId?: string;
  readonly blockId?: string;
};

export type ReportExportFormat = "txt" | "json" | "print";
export type ReportExportMode = "rascunho" | "revisada";

export const REPORT_WATERMARK = "DOCUMENTO DEMONSTRATIVO — SEM VALIDADE";
