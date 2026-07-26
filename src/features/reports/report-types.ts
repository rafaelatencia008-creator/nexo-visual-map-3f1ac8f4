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
  | "exportacao_bloqueada"
  // ---------- LV-16 ----------
  | "checklist_marcado"
  | "checklist_desmarcado"
  | "versao_trabalho_criada"
  | "versao_revisada_criada"
  | "versao_revisada_bloqueada"
  | "fechamento_iniciado"
  | "fechamento_cancelado"
  | "fechamento_bloqueado"
  | "versao_fechada_criada"
  | "documento_congelado"
  | "reabertura_solicitada"
  | "reabertura_bloqueada"
  | "documento_reaberto"
  | "comparacao_aberta"
  | "versao_visualizada"
  | "versao_exportada"
  | "versao_impressa"
  | "versao_anterior_substituida";

export type ReportHistoryEvent = {
  readonly id: string;
  readonly kind: ReportHistoryEventKind;
  readonly at: string;
  readonly description: string;
  readonly reportId: string;
  readonly sectionId?: string;
  readonly blockId?: string;
  readonly versionId?: string;
  readonly relatedEventId?: string;
};

export type ReportExportFormat = "txt" | "json" | "print";
export type ReportExportMode = "rascunho" | "revisada";

export const REPORT_WATERMARK = "DOCUMENTO DEMONSTRATIVO — SEM VALIDADE";

// ---------- LV-16 — Versões, Checklist, Congelamento ----------

export type ReportVersionType = "trabalho" | "revisada" | "fechada";

export const REPORT_VERSION_TYPE_LABEL: Readonly<Record<ReportVersionType, string>> = {
  trabalho: "Versão de trabalho",
  revisada: "Versão revisada",
  fechada: "Versão fechada",
};

export const REPORT_VERSION_WATERMARK: Readonly<Record<ReportVersionType, string>> = {
  trabalho: "VERSÃO DE TRABALHO — DOCUMENTO DEMONSTRATIVO — SEM VALIDADE",
  revisada: "VERSÃO REVISADA DEMONSTRATIVA — SEM VALIDADE",
  fechada: "VERSÃO FECHADA DEMONSTRATIVA — SEM VALIDADE OFICIAL",
};

export type ReportVersionStatus =
  | "rascunho"
  | "em_revisao"
  | "fechada"
  | "substituida"
  | "reaberta";

export const REPORT_VERSION_STATUS_LABEL: Readonly<Record<ReportVersionStatus, string>> = {
  rascunho: "Rascunho",
  em_revisao: "Em revisão",
  fechada: "Fechada",
  substituida: "Substituída",
  reaberta: "Reaberta",
};

export type ReportChecklistItemId =
  | "titulo_conferido"
  | "pericia_conferida"
  | "modelo_conferido"
  | "partes_conferidas"
  | "objeto_conferido"
  | "metodologia_conferida"
  | "entrevistas_conferidas"
  | "diligencias_conferidas"
  | "documentos_conferidos"
  | "quesitos_conferidos"
  | "fundamentacao_conferida"
  | "analise_conferida"
  | "conclusao_conferida"
  | "anexos_conferidos"
  | "fontes_revisadas"
  | "pendencias_resolvidas"
  | "marca_demonstrativa"
  | "ciencia_sem_assinatura"
  | "ciencia_sem_protocolo"
  | "confirmacao_responsavel";

export const REPORT_CHECKLIST_ORDER: readonly ReportChecklistItemId[] = [
  "titulo_conferido",
  "pericia_conferida",
  "modelo_conferido",
  "partes_conferidas",
  "objeto_conferido",
  "metodologia_conferida",
  "entrevistas_conferidas",
  "diligencias_conferidas",
  "documentos_conferidos",
  "quesitos_conferidos",
  "fundamentacao_conferida",
  "analise_conferida",
  "conclusao_conferida",
  "anexos_conferidos",
  "fontes_revisadas",
  "pendencias_resolvidas",
  "marca_demonstrativa",
  "ciencia_sem_assinatura",
  "ciencia_sem_protocolo",
  "confirmacao_responsavel",
] as const;

export const REPORT_CHECKLIST_LABEL: Readonly<Record<ReportChecklistItemId, string>> = {
  titulo_conferido: "Título conferido",
  pericia_conferida: "Perícia vinculada conferida",
  modelo_conferido: "Modelo documental conferido",
  partes_conferidas: "Identificação das partes conferida",
  objeto_conferido: "Objeto da perícia conferido",
  metodologia_conferida: "Metodologia conferida",
  entrevistas_conferidas: "Entrevistas conferidas",
  diligencias_conferidas: "Diligências conferidas",
  documentos_conferidos: "Documentos e evidências conferidos",
  quesitos_conferidos: "Quesitos conferidos",
  fundamentacao_conferida: "Fundamentação conferida",
  analise_conferida: "Análise conferida",
  conclusao_conferida: "Conclusão conferida",
  anexos_conferidos: "Anexos conferidos",
  fontes_revisadas: "Fontes vinculadas revisadas",
  pendencias_resolvidas: "Pendências impeditivas resolvidas",
  marca_demonstrativa: "Marca demonstrativa confirmada",
  ciencia_sem_assinatura: "Ciência de ausência de assinatura",
  ciencia_sem_protocolo: "Ciência de ausência de protocolo",
  confirmacao_responsavel: "Confirmação final do responsável mock",
};

export type ReportChecklist = Readonly<Record<ReportChecklistItemId, boolean>>;

export type ReportVersionSnapshot = {
  readonly document: ReportDocument;
  readonly checklist: ReportChecklist;
  readonly pendings: readonly ReportPendingItem[];
  readonly generalStatus: ReportGeneralStatus;
};

export type ReportVersion = {
  readonly id: string;
  readonly number: number;
  readonly reportId: string;
  readonly type: ReportVersionType;
  readonly status: ReportVersionStatus;
  readonly title: string;
  readonly templateId: ReportTemplateId;
  readonly caseId: string;
  readonly caseLabel: string;
  readonly createdAt: string;
  readonly authorLabel: string;
  readonly reason: string;
  readonly pendingCount: number;
  readonly generalStatus: ReportGeneralStatus;
  readonly watermark: string;
  readonly snapshot: ReportVersionSnapshot;
  readonly demonstrative: true;
};

export type ReportVersionListItem = {
  readonly id: string;
  readonly number: number;
  readonly type: ReportVersionType;
  readonly status: ReportVersionStatus;
  readonly createdAt: string;
  readonly authorLabel: string;
  readonly reason: string;
  readonly pendingCount: number;
  readonly generalStatus: ReportGeneralStatus;
};

// ---------- LV-16 — Diff de comparação ----------

export type ReportDiffKind =
  | "sem_alteracao"
  | "alterado"
  | "adicionado"
  | "removido"
  | "movido";

export type ReportDiffValueChange<T> = {
  readonly changed: boolean;
  readonly before: T;
  readonly after: T;
};

export type ReportBlockDiff = {
  readonly kind: ReportDiffKind;
  readonly blockIdBefore?: string;
  readonly blockIdAfter?: string;
  readonly titleBefore?: string;
  readonly titleAfter?: string;
  readonly contentBefore?: string;
  readonly contentAfter?: string;
  readonly indexBefore?: number;
  readonly indexAfter?: number;
  readonly sourcesAdded: readonly string[];
  readonly sourcesRemoved: readonly string[];
};

export type ReportSectionDiff = {
  readonly kind: ReportSectionKind;
  readonly title: string;
  readonly statusChanged: boolean;
  readonly statusBefore?: ReportSectionStatus;
  readonly statusAfter?: ReportSectionStatus;
  readonly blocksBefore: number;
  readonly blocksAfter: number;
  readonly blocks: readonly ReportBlockDiff[];
};

export type ReportVersionDiff = {
  readonly reportId: string;
  readonly versionAId: string;
  readonly versionBId: string;
  readonly numberA: number;
  readonly numberB: number;
  readonly title: ReportDiffValueChange<string>;
  readonly template: ReportDiffValueChange<ReportTemplateId>;
  readonly generalStatus: ReportDiffValueChange<ReportGeneralStatus>;
  readonly reason: ReportDiffValueChange<string>;
  readonly createdAt: ReportDiffValueChange<string>;
  readonly checklistChanged: readonly ReportChecklistItemId[];
  readonly pendingCount: ReportDiffValueChange<number>;
  readonly sections: readonly ReportSectionDiff[];
};

