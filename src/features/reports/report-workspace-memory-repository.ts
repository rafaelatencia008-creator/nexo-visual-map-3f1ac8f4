/**
 * LV-19.1 — Adaptador in-memory de `ReportWorkspaceRepository`.
 *
 * Delega todas as operações para a store mock oficial (`report-mock-store`),
 * que continua sendo a fonte única de verdade. Não introduz estado paralelo.
 * Segue o padrão do adaptador de LV-18.6.
 */

import {
  approveSection,
  getReport,
  getReportsSnapshot,
  isReportFrozen,
  listReportHistory,
  logWorkspaceOpened,
  renameReport,
  setSectionStatus,
  subscribeReportHistory,
  subscribeReports,
  updateBlockAtomic,
} from "./report-mock-store";
import type { ReportWorkspaceRepository } from "./report-workspace-repository";

export function createInMemoryReportWorkspaceRepository(): ReportWorkspaceRepository {
  return {
    getSnapshot: () => getReportsSnapshot(),
    locateReport: (reportId) => getReport(reportId),
    listHistory: (reportId) => listReportHistory(reportId),
    isFrozen: (reportId) => isReportFrozen(reportId),

    subscribeReports: (listener) => subscribeReports(listener),
    subscribeHistory: (listener) => subscribeReportHistory(listener),

    renameReport: (reportId, title) => renameReport(reportId, title),
    updateBlock: (reportId, sectionId, blockId, patch) =>
      updateBlockAtomic(reportId, sectionId, blockId, patch),
    markSectionComplete: (reportId, sectionId) =>
      approveSection(reportId, sectionId),
    reopenSection: (reportId, sectionId) =>
      setSectionStatus(reportId, sectionId, "em_elaboracao"),

    logWorkspaceOpened: (reportId) => logWorkspaceOpened(reportId),
  };
}
