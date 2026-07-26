/**
 * LV-18.1 — Tipos de domínio dos Modelos de Laudo.
 *
 * Domínio 100% frontend/mock. Sem dependências de rede, storage persistente
 * ou IA. Todos os tipos exportados representam entidades imutáveis do ponto
 * de vista do consumidor (uso extensivo de `Readonly`).
 *
 * Escopo LV-18.1: estrutura, status básicos e assinaturas das operações
 * estruturais. Versionamento imutável, validação completa, import/export e
 * integração com laudos ficam para LV-18.2+.
 */

/** ID branded de modelo (formato interno: `rtpl-<n>`). */
export type ReportTemplateId = string & { readonly __brand: "ReportTemplateId" };
/** ID branded de seção de modelo. */
export type ReportTemplateSectionId = string & { readonly __brand: "ReportTemplateSectionId" };
/** ID branded de bloco de modelo. */
export type ReportTemplateBlockId = string & { readonly __brand: "ReportTemplateBlockId" };
/** ID branded de variável. */
export type ReportTemplateVariableId = string & { readonly __brand: "ReportTemplateVariableId" };

/** Ciclo de vida básico. Publicação/validação plenas ficam para LV-18.2. */
export const REPORT_TEMPLATE_STATUSES = ["rascunho", "publicado", "arquivado"] as const;
export type ReportTemplateStatus = (typeof REPORT_TEMPLATE_STATUSES)[number];

/** Especialidades demonstrativas — usadas apenas para filtro visual. */
export const REPORT_TEMPLATE_SPECIALTIES = [
  "psicologia",
  "engenharia",
  "medicina",
  "contabilidade",
  "geral",
] as const;
export type ReportTemplateSpecialty = (typeof REPORT_TEMPLATE_SPECIALTIES)[number];

/** Tipos de bloco suportados pelo editor estrutural. */
export const REPORT_TEMPLATE_BLOCK_KINDS = [
  "titulo",
  "paragrafo",
  "lista",
  "citacao",
  "variavel",
  "observacao",
] as const;
export type ReportTemplateBlockKind = (typeof REPORT_TEMPLATE_BLOCK_KINDS)[number];

/** Tipos de variável — normalização de entrada visual apenas. */
export const REPORT_TEMPLATE_VARIABLE_KINDS = [
  "texto",
  "numero",
  "data",
  "booleano",
  "lista",
] as const;
export type ReportTemplateVariableKind = (typeof REPORT_TEMPLATE_VARIABLE_KINDS)[number];

/** Bloco: unidade mínima dentro de uma seção. */
export interface ReportTemplateBlock {
  readonly id: ReportTemplateBlockId;
  readonly kind: ReportTemplateBlockKind;
  readonly title: string;
  readonly content: string;
  /** Posição sequencial dentro da seção (0-based, normalizada). */
  readonly position: number;
  /** Chaves de variáveis referenciadas no conteúdo (ex.: "cliente_nome"). */
  readonly variableRefs: readonly string[];
}

/** Seção: agrupamento ordenado de blocos. */
export interface ReportTemplateSection {
  readonly id: ReportTemplateSectionId;
  readonly title: string;
  readonly description: string;
  /** Posição sequencial dentro do modelo (0-based, normalizada). */
  readonly position: number;
  readonly blocks: readonly ReportTemplateBlock[];
}

/** Variável: chave preenchível pelo laudo consumidor. */
export interface ReportTemplateVariable {
  readonly id: ReportTemplateVariableId;
  /** Chave normalizada (snake_case), única no modelo. */
  readonly key: string;
  readonly label: string;
  readonly kind: ReportTemplateVariableKind;
  readonly required: boolean;
  readonly defaultValue: string;
}

/** Entidade completa Modelo de Laudo. */
export interface ReportTemplate {
  readonly id: ReportTemplateId;
  readonly name: string;
  readonly description: string;
  readonly specialty: ReportTemplateSpecialty;
  readonly status: ReportTemplateStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy: string;
  readonly sections: readonly ReportTemplateSection[];
  readonly variables: readonly ReportTemplateVariable[];
  /**
   * ID do modelo original quando este foi criado por duplicação.
   * `null` para modelos primários.
   */
  readonly duplicatedFrom: ReportTemplateId | null;
}

/** Resumo apresentável em listas. */
export interface ReportTemplateSummary {
  readonly id: ReportTemplateId;
  readonly name: string;
  readonly specialty: ReportTemplateSpecialty;
  readonly status: ReportTemplateStatus;
  readonly sectionsCount: number;
  readonly variablesCount: number;
  readonly updatedAt: string;
}

// ---------- Inputs das operações ----------

export interface CreateTemplateInput {
  readonly name: string;
  readonly description?: string;
  readonly specialty?: ReportTemplateSpecialty;
}

export interface UpdateTemplateMetadataInput {
  readonly name?: string;
  readonly description?: string;
  readonly specialty?: ReportTemplateSpecialty;
}

export interface AddSectionInput {
  readonly title: string;
  readonly description?: string;
  /** Posição desejada; se omitida, entra no final. Negativa é rejeitada. */
  readonly position?: number;
}

export interface UpdateSectionInput {
  readonly title?: string;
  readonly description?: string;
}

export interface AddBlockInput {
  readonly kind: ReportTemplateBlockKind;
  readonly title?: string;
  readonly content?: string;
  readonly position?: number;
  readonly variableRefs?: readonly string[];
}

export interface UpdateBlockInput {
  readonly kind?: ReportTemplateBlockKind;
  readonly title?: string;
  readonly content?: string;
  readonly variableRefs?: readonly string[];
}

export interface AddVariableInput {
  readonly key: string;
  readonly label: string;
  readonly kind?: ReportTemplateVariableKind;
  readonly required?: boolean;
  readonly defaultValue?: string;
}

export interface UpdateVariableInput {
  readonly label?: string;
  readonly kind?: ReportTemplateVariableKind;
  readonly required?: boolean;
  readonly defaultValue?: string;
}

// ---------- Erros de domínio ----------

/** Códigos de erro retornáveis pelas operações da store. */
export type ReportTemplateErrorCode =
  | "template_not_found"
  | "template_archived"
  | "template_published"
  | "template_invalid"
  | "section_not_found"
  | "block_not_found"
  | "variable_not_found"
  | "duplicate_id"
  | "duplicate_variable_key"
  | "empty_name"
  | "empty_variable_key"
  | "invalid_position"
  | "variable_in_use"
  | "invalid_transition"
  | "version_not_found"
  | "version_reason_required"
  | "invalid_variable_reference"
  | "validation_failed"
  | "operation_not_allowed"
  | "history_append_failed";

export class ReportTemplateError extends Error {
  readonly code: ReportTemplateErrorCode;
  readonly context?: Readonly<Record<string, unknown>>;
  constructor(
    code: ReportTemplateErrorCode,
    message: string,
    context?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = "ReportTemplateError";
    this.code = code;
    this.context = context ? Object.freeze({ ...context }) : undefined;
  }
}

// ---------- Rótulos legíveis ----------

export const REPORT_TEMPLATE_STATUS_LABEL: Readonly<Record<ReportTemplateStatus, string>> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  arquivado: "Arquivado",
};

export const REPORT_TEMPLATE_SPECIALTY_LABEL: Readonly<
  Record<ReportTemplateSpecialty, string>
> = {
  psicologia: "Psicologia",
  engenharia: "Engenharia",
  medicina: "Medicina",
  contabilidade: "Contabilidade",
  geral: "Geral",
};

export const REPORT_TEMPLATE_BLOCK_KIND_LABEL: Readonly<
  Record<ReportTemplateBlockKind, string>
> = {
  titulo: "Título",
  paragrafo: "Parágrafo",
  lista: "Lista",
  citacao: "Citação",
  variavel: "Variável",
  observacao: "Observação",
};

export const REPORT_TEMPLATE_VARIABLE_KIND_LABEL: Readonly<
  Record<ReportTemplateVariableKind, string>
> = {
  texto: "Texto",
  numero: "Número",
  data: "Data",
  booleano: "Sim/Não",
  lista: "Lista",
};
