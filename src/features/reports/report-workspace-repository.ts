/**
 * LV-19.1 — Contrato `ReportWorkspaceRepository`.
 *
 * Interface pública para os casos de uso do workspace de laudo. Casos de uso
 * e (na LV-19.2+) componentes devem depender apenas deste contrato, nunca
 * das stores concretas. Adaptador de produção in-memory e composição vivem
 * em módulos separados (padrão LV-18.6).
 */

import type {
  ApproveSectionResult,
  UpdateBlockAtomicPatch,
} from "./report-mock-store";
import type {
  ReportDocument,
  ReportHistoryEvent,
  ReportListSummary,
} from "./report-types";

export type ReportWorkspaceListener = () => void;

export interface ReportWorkspaceRepository {
  // ---- leitura ----
  getSnapshot(): readonly ReportListSummary[];
  locateReport(reportId: string): ReportDocument | undefined;
  listHistory(reportId: string): readonly ReportHistoryEvent[];
  isFrozen(reportId: string): boolean;

  // ---- assinaturas (uma por domínio afetado) ----
  subscribeReports(listener: ReportWorkspaceListener): () => void;
  subscribeHistory(listener: ReportWorkspaceListener): () => void;

  // ---- mutações atômicas ----
  renameReport(reportId: string, title: string): ReportDocument;
  updateBlock(
    reportId: string,
    sectionId: string,
    blockId: string,
    patch: UpdateBlockAtomicPatch,
  ): ReportDocument;
  markSectionComplete(
    reportId: string,
    sectionId: string,
  ): ApproveSectionResult;
  reopenSection(reportId: string, sectionId: string): ReportDocument;

  // ---- eventos ----
  logWorkspaceOpened(reportId: string): ReportHistoryEvent;
}

export type { ApproveSectionResult, UpdateBlockAtomicPatch };
