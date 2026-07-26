/**
 * LV-18.6 — Contrato `ReportTemplateRepository`.
 *
 * Interface que desacopla os casos de uso (importação, exportação,
 * aplicação em laudos) das stores concretas. A única implementação
 * produtiva segue delegando para as stores globais existentes; testes
 * podem usar um repositório isolado/fake sem alterar a implementação
 * de produção.
 *
 * 100% frontend/mock. Sem persistência, sem backend, sem rede.
 */

import type {
  AddBlockInput,
  AddSectionInput,
  AddVariableInput,
  CreateTemplateInput,
  ReportTemplate,
  ReportTemplateBlock,
  ReportTemplateBlockId,
  ReportTemplateId,
  ReportTemplateSection,
  ReportTemplateSectionId,
  ReportTemplateSpecialty,
  ReportTemplateStatus,
  ReportTemplateSummary,
  ReportTemplateVariable,
  ReportTemplateVariableId,
  UpdateBlockInput,
  UpdateSectionInput,
  UpdateTemplateMetadataInput,
  UpdateVariableInput,
} from "./report-template-types";
import type {
  AppendHistoryInput,
  ReportTemplateHistoryEvent,
  ReportTemplateHistorySnapshot,
} from "./report-template-history-store";
import type {
  ReportTemplateSnapshot,
} from "./report-template-store";
import type {
  ReportTemplateVersion,
  ReportTemplateVersionSnapshot,
} from "./report-template-version-store";

/** Filtros simples de listagem. */
export interface ReportTemplateListFilters {
  readonly status?: ReportTemplateStatus;
  readonly specialty?: ReportTemplateSpecialty;
}

/** Índice global de IDs existentes — ReadonlySet para evitar vazamento. */
export interface ReportTemplateEntityIdIndex {
  readonly templateIds: ReadonlySet<string>;
  readonly sectionIds: ReadonlySet<string>;
  readonly blockIds: ReadonlySet<string>;
  readonly variableIds: ReadonlySet<string>;
}

/**
 * Contrato único de acesso a dados de Modelos de Laudo. Todos os casos de
 * uso (import, export, aplicação) devem operar exclusivamente sobre este
 * contrato, recebendo a implementação por injeção.
 */
export interface ReportTemplateRepository {
  // ---------- Snapshot e assinatura ----------
  getSnapshot(): ReportTemplateSnapshot;
  subscribe(listener: () => void): () => void;

  // ---------- Leitura ----------
  getById(id: ReportTemplateId): ReportTemplate | undefined;
  list(filters?: ReportTemplateListFilters): readonly ReportTemplateSummary[];

  // ---------- Ciclo de vida ----------
  create(input: CreateTemplateInput): ReportTemplate;
  updateMetadata(
    id: ReportTemplateId,
    patch: UpdateTemplateMetadataInput,
  ): ReportTemplate;
  duplicate(id: ReportTemplateId): ReportTemplate;
  archive(id: ReportTemplateId): ReportTemplate;
  reactivate(id: ReportTemplateId): ReportTemplate;
  publish(id: ReportTemplateId, reason?: string): ReportTemplate;
  returnToDraft(id: ReportTemplateId): ReportTemplate;

  // ---------- Seções ----------
  addSection(
    templateId: ReportTemplateId,
    input: AddSectionInput,
  ): ReportTemplateSection;
  updateSection(
    templateId: ReportTemplateId,
    sectionId: ReportTemplateSectionId,
    input: UpdateSectionInput,
  ): ReportTemplateSection;
  removeSection(
    templateId: ReportTemplateId,
    sectionId: ReportTemplateSectionId,
  ): void;
  moveSection(
    templateId: ReportTemplateId,
    sectionId: ReportTemplateSectionId,
    direction: "up" | "down",
  ): void;

  // ---------- Blocos ----------
  addBlock(
    templateId: ReportTemplateId,
    sectionId: ReportTemplateSectionId,
    input: AddBlockInput,
  ): ReportTemplateBlock;
  updateBlock(
    templateId: ReportTemplateId,
    sectionId: ReportTemplateSectionId,
    blockId: ReportTemplateBlockId,
    input: UpdateBlockInput,
  ): ReportTemplateBlock;
  removeBlock(
    templateId: ReportTemplateId,
    sectionId: ReportTemplateSectionId,
    blockId: ReportTemplateBlockId,
  ): void;
  moveBlock(
    templateId: ReportTemplateId,
    sectionId: ReportTemplateSectionId,
    blockId: ReportTemplateBlockId,
    direction: "up" | "down",
  ): void;

  // ---------- Variáveis ----------
  addVariable(
    templateId: ReportTemplateId,
    input: AddVariableInput,
  ): ReportTemplateVariable;
  updateVariable(
    templateId: ReportTemplateId,
    variableId: ReportTemplateVariableId,
    input: UpdateVariableInput,
  ): ReportTemplateVariable;
  removeVariable(
    templateId: ReportTemplateId,
    variableId: ReportTemplateVariableId,
    options?: { readonly force?: boolean },
  ): void;
  isVariableInUse(
    templateId: ReportTemplateId,
    variableId: ReportTemplateVariableId,
  ): boolean;

  // ---------- Importação ----------
  getExistingIds(): ReportTemplateEntityIdIndex;
  bulkInsertImported(
    templates: readonly ReportTemplate[],
  ): readonly ReportTemplate[];
  generateImportedTemplateId(): ReportTemplateId;
  generateImportedSectionId(): ReportTemplateSectionId;
  generateImportedBlockId(): ReportTemplateBlockId;
  generateImportedVariableId(): ReportTemplateVariableId;

  // ---------- Versões ----------
  listVersions(templateId: ReportTemplateId): readonly ReportTemplateVersion[];
  getVersion(
    templateId: ReportTemplateId,
    versionId: string,
  ): ReportTemplateVersion | undefined;
  getVersionSnapshot(): ReportTemplateVersionSnapshot;
  subscribeVersions(listener: () => void): () => void;
  createManualVersion(
    templateId: ReportTemplateId,
    reason: string,
    changeSummary?: string,
  ): ReportTemplateVersion;

  // ---------- Histórico ----------
  listHistory(templateId?: ReportTemplateId): readonly ReportTemplateHistoryEvent[];
  getHistorySnapshot(): ReportTemplateHistorySnapshot;
  subscribeHistory(listener: () => void): () => void;
  appendHistoryEvent(input: AppendHistoryInput): ReportTemplateHistoryEvent;

  // ---------- Reset (testes / demo) ----------
  reset(): void;
}
