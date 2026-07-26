/**
 * LV-18.1 / LV-18.6 — Fachada de casos de uso de Modelos de Laudo.
 *
 * Esta camada fina desacopla componentes e rotas das stores concretas.
 * Todas as operações delegam para o `ReportTemplateRepository` padrão
 * (injeção de dependência com fallback); testes e componentes podem
 * importar `reportTemplateRepository` de `report-template-composition` para
 * acessar o contrato diretamente.
 */

import { reportTemplateRepository } from "./report-template-composition";
import type { ReportTemplateRepository } from "./report-template-repository";

export type { ReportTemplateRepository };

export const repository = reportTemplateRepository;

// ---------- Re-exports semânticos delegados ao repositório padrão ----------

import type {
  AddBlockInput,
  AddSectionInput,
  AddVariableInput,
  CreateTemplateInput,
  ReportTemplateId,
  UpdateBlockInput,
  UpdateSectionInput,
  UpdateTemplateMetadataInput,
  UpdateVariableInput,
} from "./report-template-types";

export type { ReportTemplateSnapshot } from "./report-template-store";
export type { ReportTemplateVersion } from "./report-template-version-store";
export type {
  ReportTemplateHistoryAction,
  ReportTemplateHistoryEvent,
  ReportTemplateHistoryResult,
} from "./report-template-history-store";

export { compareReportTemplates } from "./report-template-version-diff";
export type { ReportTemplateDiff } from "./report-template-version-diff";

export { validateReportTemplate } from "./report-template-validation";
export type {
  ReportTemplateValidationCode,
  ReportTemplateValidationIssue,
  ReportTemplateValidationResult,
  ReportTemplateValidationSeverity,
} from "./report-template-validation";

export {
  exportReportTemplate,
  exportReportTemplates,
  serializeReportTemplate,
  serializeReportTemplates,
  toExportedTemplate,
} from "./report-template-export";
export type { ExportOptions } from "./report-template-export";

export { parseReportTemplateImport } from "./report-template-import-schema";
export type { ParsedImportResult } from "./report-template-import-schema";

export {
  importReportTemplate,
  importReportTemplates,
  previewReportTemplateImport,
} from "./report-template-import";
export type {
  ImportConflict,
  ImportConflictStrategy,
  ImportIdMapping,
  ImportOptions,
  ImportPreview,
  ImportWarning,
  ImportedTemplateSummary,
  ReportTemplateImportReport,
} from "./report-template-import";

export {
  canonicalStringify,
  MAX_BLOCK_CONTENT_LENGTH,
  MAX_BLOCKS_PER_SECTION,
  MAX_IMPORT_BYTES,
  MAX_SECTIONS_PER_TEMPLATE,
  MAX_STRING_LENGTH,
  MAX_TEMPLATES_PER_IMPORT,
  MAX_VARIABLES_PER_TEMPLATE,
  REPORT_TEMPLATE_EXPORT_FORMAT,
  REPORT_TEMPLATE_SCHEMA_VERSION,
} from "./report-template-serialization";
export type {
  ExportedReportTemplate,
  ExportedReportTemplateBlock,
  ExportedReportTemplateSection,
  ExportedReportTemplateVariable,
  ReportTemplateExportEnvelope,
} from "./report-template-serialization";

// ---------- Wrappers com repositório padrão ----------

export function getSnapshot() {
  return reportTemplateRepository.getSnapshot();
}

export function subscribe(listener: () => void) {
  return reportTemplateRepository.subscribe(listener);
}

export function getTemplate(id: ReportTemplateId) {
  return reportTemplateRepository.getById(id);
}

export function listTemplates(...args: Parameters<ReportTemplateRepository["list"]>) {
  return reportTemplateRepository.list(...args);
}

export function createTemplate(...args: Parameters<ReportTemplateRepository["create"]>) {
  return reportTemplateRepository.create(...args);
}

export function updateTemplateMetadata(
  ...args: Parameters<ReportTemplateRepository["updateMetadata"]>
) {
  return reportTemplateRepository.updateMetadata(...args);
}

export function duplicateTemplate(...args: Parameters<ReportTemplateRepository["duplicate"]>) {
  return reportTemplateRepository.duplicate(...args);
}

export function archiveTemplate(...args: Parameters<ReportTemplateRepository["archive"]>) {
  return reportTemplateRepository.archive(...args);
}

export function reactivateTemplate(...args: Parameters<ReportTemplateRepository["reactivate"]>) {
  return reportTemplateRepository.reactivate(...args);
}

export function publishTemplate(...args: Parameters<ReportTemplateRepository["publish"]>) {
  return reportTemplateRepository.publish(...args);
}

export function returnTemplateToDraft(
  ...args: Parameters<ReportTemplateRepository["returnToDraft"]>
) {
  return reportTemplateRepository.returnToDraft(...args);
}

export function addSection(
  ...args: Parameters<ReportTemplateRepository["addSection"]>
) {
  return reportTemplateRepository.addSection(...args);
}

export function updateSection(
  ...args: Parameters<ReportTemplateRepository["updateSection"]>
) {
  return reportTemplateRepository.updateSection(...args);
}

export function removeSection(
  ...args: Parameters<ReportTemplateRepository["removeSection"]>
) {
  return reportTemplateRepository.removeSection(...args);
}

export function moveSection(
  ...args: Parameters<ReportTemplateRepository["moveSection"]>
) {
  return reportTemplateRepository.moveSection(...args);
}

export function addBlock(
  ...args: Parameters<ReportTemplateRepository["addBlock"]>
) {
  return reportTemplateRepository.addBlock(...args);
}

export function updateBlock(
  ...args: Parameters<ReportTemplateRepository["updateBlock"]>
) {
  return reportTemplateRepository.updateBlock(...args);
}

export function removeBlock(
  ...args: Parameters<ReportTemplateRepository["removeBlock"]>
) {
  return reportTemplateRepository.removeBlock(...args);
}

export function moveBlock(
  ...args: Parameters<ReportTemplateRepository["moveBlock"]>
) {
  return reportTemplateRepository.moveBlock(...args);
}

export function addVariable(
  ...args: Parameters<ReportTemplateRepository["addVariable"]>
) {
  return reportTemplateRepository.addVariable(...args);
}

export function updateVariable(
  ...args: Parameters<ReportTemplateRepository["updateVariable"]>
) {
  return reportTemplateRepository.updateVariable(...args);
}

export function removeVariable(
  ...args: Parameters<ReportTemplateRepository["removeVariable"]>
) {
  return reportTemplateRepository.removeVariable(...args);
}

export function isVariableInUse(
  ...args: Parameters<ReportTemplateRepository["isVariableInUse"]>
) {
  return reportTemplateRepository.isVariableInUse(...args);
}

export function getExistingReportTemplateIds() {
  return reportTemplateRepository.getExistingIds();
}

export function bulkInsertImportedTemplates(
  ...args: Parameters<ReportTemplateRepository["bulkInsertImported"]>
) {
  return reportTemplateRepository.bulkInsertImported(...args);
}

export function generateImportedTemplateId() {
  return reportTemplateRepository.generateImportedTemplateId();
}

export function generateImportedSectionId() {
  return reportTemplateRepository.generateImportedSectionId();
}

export function generateImportedBlockId() {
  return reportTemplateRepository.generateImportedBlockId();
}

export function generateImportedVariableId() {
  return reportTemplateRepository.generateImportedVariableId();
}

export function listTemplateVersions(
  ...args: Parameters<ReportTemplateRepository["listVersions"]>
) {
  return reportTemplateRepository.listVersions(...args);
}

export function getTemplateVersion(
  ...args: Parameters<ReportTemplateRepository["getVersion"]>
) {
  return reportTemplateRepository.getVersion(...args);
}

export function createTemplateVersion(
  ...args: Parameters<ReportTemplateRepository["createManualVersion"]>
) {
  return reportTemplateRepository.createManualVersion(...args);
}

export function getTemplateVersionsSnapshot() {
  return reportTemplateRepository.getVersionSnapshot();
}

export function subscribeTemplateVersions(listener: () => void) {
  return reportTemplateRepository.subscribeVersions(listener);
}

export function listTemplateHistory(
  ...args: Parameters<ReportTemplateRepository["listHistory"]>
) {
  return reportTemplateRepository.listHistory(...args);
}

export function appendTemplateHistoryEvent(
  ...args: Parameters<ReportTemplateRepository["appendHistoryEvent"]>
) {
  return reportTemplateRepository.appendHistoryEvent(...args);
}

export function getTemplateHistorySnapshot() {
  return reportTemplateRepository.getHistorySnapshot();
}

export function subscribeTemplateHistory(listener: () => void) {
  return reportTemplateRepository.subscribeHistory(listener);
}

export function resetReportTemplateStore() {
  return reportTemplateRepository.reset();
}

export function resetTemplateVersionStore() {
  return reportTemplateRepository.reset();
}

export function resetTemplateHistoryStore() {
  return reportTemplateRepository.reset();
}

export function createManualTemplateVersion(
  ...args: Parameters<ReportTemplateRepository["createManualVersion"]>
) {
  return reportTemplateRepository.createManualVersion(...args);
}
