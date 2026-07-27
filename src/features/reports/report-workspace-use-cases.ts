/**
 * LV-19.1 — Casos de uso do workspace de laudo.
 *
 * Fachada fina sobre `ReportWorkspaceRepository`. Toda a validação e a
 * derivação canônica ficam aqui; a UI (LV-19.2+) deve importar somente
 * deste módulo (ou do repositório injetado) — nunca da store concreta.
 *
 * Todas as operações são atômicas: emitem no máximo UMA mutação lógica,
 * UM evento de histórico e UMA notificação por domínio afetado.
 */

import { reportWorkspaceRepository } from "./report-workspace-composition";
import {
  deriveReportProgress,
  deriveSectionProgress,
  deriveSectionStatus,
  deriveWorkspaceSnapshot,
} from "./report-workspace-derivation";
import type {
  ApproveSectionResult,
  ReportWorkspaceListener,
  ReportWorkspaceRepository,
  UpdateBlockAtomicPatch,
} from "./report-workspace-repository";
import type {
  ReportDocument,
  ReportHistoryEvent,
} from "./report-types";
import {
  ReportWorkspaceError,
  type ReportSectionProgress,
  type ReportWorkspaceProgress,
  type ReportWorkspaceSnapshot,
  type SectionDerivedStatus,
} from "./report-workspace-types";

// ---------- Re-exports semânticos ----------

export type {
  ApproveSectionResult,
  ReportSectionProgress,
  ReportWorkspaceListener,
  ReportWorkspaceProgress,
  ReportWorkspaceRepository,
  ReportWorkspaceSnapshot,
  SectionDerivedStatus,
  UpdateBlockAtomicPatch,
};

export {
  deriveReportProgress,
  deriveSectionProgress,
  deriveSectionStatus,
  deriveWorkspaceSnapshot,
  ReportWorkspaceError,
};

// ---------- Localização e validação ----------

/** Localiza um laudo pelo ID. Lança `report_not_found` se inexistente. */
export function locateReport(
  reportId: string,
  repo: ReportWorkspaceRepository = reportWorkspaceRepository,
): ReportDocument {
  const doc = repo.locateReport(reportId);
  if (!doc) throw new ReportWorkspaceError("report_not_found");
  return doc;
}

export function tryLocateReport(
  reportId: string,
  repo: ReportWorkspaceRepository = reportWorkspaceRepository,
): ReportDocument | undefined {
  return repo.locateReport(reportId);
}

function requireSection(doc: ReportDocument, sectionId: string) {
  const section = doc.sections.find((s) => s.id === sectionId);
  if (!section) throw new ReportWorkspaceError("report_section_not_found");
  return section;
}

function requireBlock(
  doc: ReportDocument,
  sectionId: string,
  blockId: string,
) {
  const section = requireSection(doc, sectionId);
  const block = section.blocks.find((b) => b.id === blockId);
  if (!block) throw new ReportWorkspaceError("report_block_not_found");
  return { section, block };
}

// ---------- Snapshots ----------

/** Snapshot congelado com derivações determinísticas. */
export function getWorkspaceSnapshot(
  reportId: string,
  repo: ReportWorkspaceRepository = reportWorkspaceRepository,
): ReportWorkspaceSnapshot {
  const doc = locateReport(reportId, repo);
  return deriveWorkspaceSnapshot(doc);
}

/** Assina o domínio de laudos (uma notificação por mutação). */
export function subscribeWorkspace(
  listener: ReportWorkspaceListener,
  repo: ReportWorkspaceRepository = reportWorkspaceRepository,
): () => void {
  return repo.subscribeReports(listener);
}

/** Assina o domínio de histórico (uma notificação por evento). */
export function subscribeWorkspaceHistory(
  listener: ReportWorkspaceListener,
  repo: ReportWorkspaceRepository = reportWorkspaceRepository,
): () => void {
  return repo.subscribeHistory(listener);
}

export function listWorkspaceHistory(
  reportId: string,
  repo: ReportWorkspaceRepository = reportWorkspaceRepository,
): readonly ReportHistoryEvent[] {
  return repo.listHistory(reportId);
}

// ---------- Mutações atômicas ----------

export function renameReportTitle(
  reportId: string,
  title: string,
  repo: ReportWorkspaceRepository = reportWorkspaceRepository,
): ReportDocument {
  const normalized = title.trim();
  if (normalized.length === 0) {
    throw new ReportWorkspaceError("report_workspace_invalid_title");
  }
  locateReport(reportId, repo);
  if (repo.isFrozen(reportId)) {
    throw new ReportWorkspaceError("report_workspace_frozen");
  }
  return repo.renameReport(reportId, normalized);
}

/**
 * Atualiza título e/ou conteúdo de um bloco em UMA operação atômica.
 * A camada de UI (LV-19.2+) deve chamar apenas este caso de uso;
 * jamais chamar `updateBlockTitle` + `updateBlockContent` em sequência.
 */
export function updateBlock(
  reportId: string,
  sectionId: string,
  blockId: string,
  patch: UpdateBlockAtomicPatch,
  repo: ReportWorkspaceRepository = reportWorkspaceRepository,
): ReportDocument {
  const hasTitle = Object.prototype.hasOwnProperty.call(patch, "title");
  const hasContent = Object.prototype.hasOwnProperty.call(patch, "content");
  if (!hasTitle && !hasContent) {
    throw new ReportWorkspaceError("report_workspace_empty_patch");
  }
  const doc = locateReport(reportId, repo);
  requireBlock(doc, sectionId, blockId);
  if (repo.isFrozen(reportId)) {
    throw new ReportWorkspaceError("report_workspace_frozen");
  }
  try {
    return repo.updateBlock(reportId, sectionId, blockId, patch);
  } catch (err) {
    if (err instanceof Error && /Nenhuma alteração efetiva/.test(err.message)) {
      throw new ReportWorkspaceError("report_workspace_no_change");
    }
    throw err;
  }
}

/**
 * Marca a seção como concluída (aprovada). Explícito por design: a ação NÃO
 * é automática ao preencher/revisar todos os blocos. Retorna resultado com
 * motivo em caso de rejeição pelas regras da store (blocos vazios ou não
 * revisados).
 */
export function markSectionComplete(
  reportId: string,
  sectionId: string,
  repo: ReportWorkspaceRepository = reportWorkspaceRepository,
): ApproveSectionResult {
  const doc = locateReport(reportId, repo);
  requireSection(doc, sectionId);
  if (repo.isFrozen(reportId)) {
    throw new ReportWorkspaceError("report_workspace_frozen");
  }
  return repo.markSectionComplete(reportId, sectionId);
}

export function reopenSection(
  reportId: string,
  sectionId: string,
  repo: ReportWorkspaceRepository = reportWorkspaceRepository,
): ReportDocument {
  const doc = locateReport(reportId, repo);
  requireSection(doc, sectionId);
  if (repo.isFrozen(reportId)) {
    throw new ReportWorkspaceError("report_workspace_frozen");
  }
  return repo.reopenSection(reportId, sectionId);
}

export function logWorkspaceOpened(
  reportId: string,
  repo: ReportWorkspaceRepository = reportWorkspaceRepository,
): ReportHistoryEvent {
  locateReport(reportId, repo);
  return repo.logWorkspaceOpened(reportId);
}
