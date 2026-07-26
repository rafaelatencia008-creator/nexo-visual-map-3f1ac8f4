/**
 * LV-14 — Store em memória para documentos periciais (laudos).
 *
 * Regras:
 *  - Nenhuma persistência (sem localStorage, sem rede, sem banco).
 *  - IDs determinísticos por contador local, reiniciáveis nos testes.
 *  - Retornos imutáveis (Readonly + Object.freeze onde relevante).
 */

import { getTemplate } from "./report-templates";
import {
  REPORT_SECTION_LABEL,
  type ReportBlock,
  type ReportBlockOrigin,
  type ReportDocument,
  type ReportListSummary,
  type ReportSection,
  type ReportSectionKind,
  type ReportSectionStatus,
  type ReportSourceKind,
  type ReportSourceRef,
  type ReportTemplateId,
} from "./report-types";

// ---------- IDs / clock ----------

let idCounter = 9000;
export function makeReportId(prefix: "rep" | "sec" | "blk" | "src"): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}
export function resetReportIdCounter(seed = 9000): void {
  idCounter = seed;
}

let clockIso = "2026-07-25T12:00:00.000Z";
export function reportNow(): string {
  return clockIso;
}
export function advanceReportClockSeconds(seconds: number): string {
  const next = new Date(new Date(clockIso).getTime() + seconds * 1000).toISOString();
  clockIso = next;
  return next;
}
export function resetReportClock(iso = "2026-07-25T12:00:00.000Z"): void {
  clockIso = iso;
}

// ---------- Estado ----------

type Listener = () => void;

const state: {
  documents: Map<string, ReportDocument>;
  order: string[];
  listeners: Set<Listener>;
} = {
  documents: new Map(),
  order: [],
  listeners: new Set(),
};

function notify(): void {
  for (const l of state.listeners) l();
}

export function subscribeReports(listener: Listener): () => void {
  state.listeners.add(listener);
  return () => state.listeners.delete(listener);
}

export function resetReportStore(): void {
  state.documents.clear();
  state.order = [];
  notify();
}

// ---------- Construção a partir do modelo ----------

function buildSectionsFromTemplate(
  templateId: ReportTemplateId,
): readonly ReportSection[] {
  const template = getTemplate(templateId);
  return template.sections.map<ReportSection>((seed) => ({
    id: makeReportId("sec"),
    kind: seed.kind,
    title: REPORT_SECTION_LABEL[seed.kind],
    status: "nao_iniciada",
    blocks: seed.blocks.map<ReportBlock>((b) => ({
      id: makeReportId("blk"),
      title: b.title,
      content: b.content,
      origin: "modelo",
      manuallyEdited: false,
      reviewed: false,
      sources: [],
    })),
  }));
}

// ---------- CRUD ----------

export type CreateReportInput = {
  readonly title: string;
  readonly templateId: ReportTemplateId;
  readonly caseId: string;
  readonly caseLabel: string;
};

export function createReport(input: CreateReportInput): ReportDocument {
  const now = reportNow();
  const doc: ReportDocument = Object.freeze({
    id: makeReportId("rep"),
    title: input.title.trim(),
    templateId: input.templateId,
    caseId: input.caseId,
    caseLabel: input.caseLabel,
    createdAt: now,
    updatedAt: now,
    sections: buildSectionsFromTemplate(input.templateId),
  });
  state.documents.set(doc.id, doc);
  state.order.push(doc.id);
  notify();
  return doc;
}

export function listReports(): readonly ReportListSummary[] {
  return state.order.map((id) => {
    const d = state.documents.get(id)!;
    const total = d.sections.length;
    const done = d.sections.filter(
      (s) => s.status === "revisada" || s.status === "aprovada",
    ).length;
    return {
      id: d.id,
      title: d.title,
      templateId: d.templateId,
      caseLabel: d.caseLabel,
      updatedAt: d.updatedAt,
      reviewProgress: total === 0 ? 0 : done / total,
    };
  });
}

export function getReport(id: string): ReportDocument | undefined {
  return state.documents.get(id);
}

function touch(doc: ReportDocument, patch: Partial<ReportDocument>): ReportDocument {
  const next = Object.freeze({ ...doc, ...patch, updatedAt: reportNow() });
  state.documents.set(next.id, next);
  notify();
  return next;
}

function replaceSection(
  doc: ReportDocument,
  sectionId: string,
  transform: (s: ReportSection) => ReportSection,
): ReportDocument {
  const sections = doc.sections.map((s) => (s.id === sectionId ? transform(s) : s));
  return touch(doc, { sections });
}

function replaceBlock(
  doc: ReportDocument,
  sectionId: string,
  blockId: string,
  transform: (b: ReportBlock) => ReportBlock,
): ReportDocument {
  return replaceSection(doc, sectionId, (s) => ({
    ...s,
    blocks: s.blocks.map((b) => (b.id === blockId ? transform(b) : b)),
  }));
}

/** Troca de modelo — substitui somente a estrutura inicial das seções. */
export function changeTemplate(
  reportId: string,
  templateId: ReportTemplateId,
): ReportDocument {
  const doc = state.documents.get(reportId);
  if (!doc) throw new Error(`Documento não encontrado: ${reportId}`);
  return touch(doc, {
    templateId,
    sections: buildSectionsFromTemplate(templateId),
  });
}

export function renameReport(reportId: string, title: string): ReportDocument {
  const doc = state.documents.get(reportId);
  if (!doc) throw new Error(`Documento não encontrado: ${reportId}`);
  return touch(doc, { title: title.trim() });
}

export function updateBlockContent(
  reportId: string,
  sectionId: string,
  blockId: string,
  content: string,
): ReportDocument {
  const doc = state.documents.get(reportId);
  if (!doc) throw new Error(`Documento não encontrado: ${reportId}`);
  return replaceBlock(doc, sectionId, blockId, (b) => ({
    ...b,
    content,
    manuallyEdited: true,
    reviewed: false,
  }));
}

export function updateBlockTitle(
  reportId: string,
  sectionId: string,
  blockId: string,
  title: string,
): ReportDocument {
  const doc = state.documents.get(reportId);
  if (!doc) throw new Error(`Documento não encontrado: ${reportId}`);
  return replaceBlock(doc, sectionId, blockId, (b) => ({
    ...b,
    title,
    manuallyEdited: true,
  }));
}

export function markBlockReviewed(
  reportId: string,
  sectionId: string,
  blockId: string,
  reviewed: boolean,
): ReportDocument {
  const doc = state.documents.get(reportId);
  if (!doc) throw new Error(`Documento não encontrado: ${reportId}`);
  return replaceBlock(doc, sectionId, blockId, (b) => ({ ...b, reviewed }));
}

export function setSectionStatus(
  reportId: string,
  sectionId: string,
  status: ReportSectionStatus,
): ReportDocument {
  const doc = state.documents.get(reportId);
  if (!doc) throw new Error(`Documento não encontrado: ${reportId}`);
  return replaceSection(doc, sectionId, (s) => ({ ...s, status }));
}

export function addBlock(
  reportId: string,
  sectionId: string,
  input: { title: string; content: string; origin?: ReportBlockOrigin },
): ReportDocument {
  const doc = state.documents.get(reportId);
  if (!doc) throw new Error(`Documento não encontrado: ${reportId}`);
  return replaceSection(doc, sectionId, (s) => ({
    ...s,
    blocks: [
      ...s.blocks,
      {
        id: makeReportId("blk"),
        title: input.title.trim() || "Novo bloco",
        content: input.content,
        origin: input.origin ?? "manual",
        manuallyEdited: input.origin !== "modelo",
        reviewed: false,
        sources: [],
      },
    ],
  }));
}

export function removeBlock(
  reportId: string,
  sectionId: string,
  blockId: string,
): ReportDocument {
  const doc = state.documents.get(reportId);
  if (!doc) throw new Error(`Documento não encontrado: ${reportId}`);
  return replaceSection(doc, sectionId, (s) => ({
    ...s,
    blocks: s.blocks.filter((b) => b.id !== blockId),
  }));
}

// ---------- Fontes ----------

export function linkSourceToBlock(
  reportId: string,
  sectionId: string,
  blockId: string,
  source: { kind: ReportSourceKind; refId: string; label: string },
): ReportDocument {
  const doc = state.documents.get(reportId);
  if (!doc) throw new Error(`Documento não encontrado: ${reportId}`);
  return replaceBlock(doc, sectionId, blockId, (b) => {
    if (b.sources.some((s) => s.kind === source.kind && s.refId === source.refId)) {
      return b;
    }
    const ref: ReportSourceRef = {
      id: makeReportId("src"),
      kind: source.kind,
      refId: source.refId,
      label: source.label,
    };
    return { ...b, sources: [...b.sources, ref] };
  });
}

export function unlinkSourceFromBlock(
  reportId: string,
  sectionId: string,
  blockId: string,
  sourceId: string,
): ReportDocument {
  const doc = state.documents.get(reportId);
  if (!doc) throw new Error(`Documento não encontrado: ${reportId}`);
  return replaceBlock(doc, sectionId, blockId, (b) => ({
    ...b,
    sources: b.sources.filter((s) => s.id !== sourceId),
  }));
}

// ---------- Utilitário para findSection/findBlock (usado nos testes) ----------

export function findSection(
  doc: ReportDocument,
  kind: ReportSectionKind,
): ReportSection | undefined {
  return doc.sections.find((s) => s.kind === kind);
}
