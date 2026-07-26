/**
 * LV-14 / LV-15 — Store em memória para documentos periciais (laudos).
 *
 * Regras gerais:
 *  - Nenhuma persistência (sem localStorage, sem rede, sem banco).
 *  - IDs determinísticos por contador local, reiniciáveis nos testes.
 *  - Retornos imutáveis (Readonly + Object.freeze onde relevante).
 *
 * LV-15:
 *  - Ações extras: mover / duplicar bloco.
 *  - Auto-rebaixamento de seção aprovada quando conteúdo é editado.
 *  - Validação para aprovação de seção.
 *  - Histórico local append-only (com subscribe próprio).
 */

import { getTemplate } from "./report-templates";
import {
  REPORT_SECTION_LABEL,
  REPORT_SECTION_STATUS_LABEL,
  REPORT_TEMPLATE_LABEL,
  type ReportBlock,
  type ReportBlockOrigin,
  type ReportDocument,
  type ReportHistoryEvent,
  type ReportHistoryEventKind,
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
export function makeReportId(
  prefix: "rep" | "sec" | "blk" | "src" | "hst",
): string {
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
  history: ReportHistoryEvent[];
  historyListeners: Set<Listener>;
} = {
  documents: new Map(),
  order: [],
  listeners: new Set(),
  history: [],
  historyListeners: new Set(),
};

function notify(): void {
  for (const l of state.listeners) l();
}
function notifyHistory(): void {
  for (const l of state.historyListeners) l();
}

export function subscribeReports(listener: Listener): () => void {
  state.listeners.add(listener);
  return () => state.listeners.delete(listener);
}

export function subscribeReportHistory(listener: Listener): () => void {
  state.historyListeners.add(listener);
  return () => state.historyListeners.delete(listener);
}

export function resetReportStore(): void {
  state.documents.clear();
  state.order = [];
  state.history = [];
  notify();
  notifyHistory();
}

// ---------- Histórico (append-only) ----------

function pushHistory(
  reportId: string,
  kind: ReportHistoryEventKind,
  description: string,
  extras: { sectionId?: string; blockId?: string } = {},
): ReportHistoryEvent {
  const ev: ReportHistoryEvent = Object.freeze({
    id: makeReportId("hst"),
    kind,
    at: reportNow(),
    description,
    reportId,
    sectionId: extras.sectionId,
    blockId: extras.blockId,
  });
  state.history.push(ev);
  notifyHistory();
  return ev;
}

export function listReportHistory(
  reportId?: string,
): readonly ReportHistoryEvent[] {
  const all = state.history.slice();
  return reportId ? all.filter((e) => e.reportId === reportId) : all;
}

// ---------- Construção a partir do modelo ----------

function buildSectionsFromTemplate(
  templateId: ReportTemplateId,
): readonly ReportSection[] {
  const template = getTemplate(templateId);
  const now = reportNow();
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
      lastEditedAt: now,
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
  pushHistory(
    doc.id,
    "documento_criado",
    `Documento "${doc.title}" criado a partir do modelo ${REPORT_TEMPLATE_LABEL[doc.templateId]}.`,
  );
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

function requireDoc(id: string): ReportDocument {
  const doc = state.documents.get(id);
  if (!doc) throw new Error(`Documento não encontrado: ${id}`);
  return doc;
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

/** LV-15 — rebaixa seção aprovada quando o conteúdo é editado. */
function demoteApprovedSection(
  doc: ReportDocument,
  sectionId: string,
): ReportDocument {
  const sec = doc.sections.find((s) => s.id === sectionId);
  if (!sec || sec.status !== "aprovada") return doc;
  return replaceSection(doc, sectionId, (s) => ({ ...s, status: "em_elaboracao" }));
}

/** Troca de modelo — substitui a estrutura inicial das seções. */
export function changeTemplate(
  reportId: string,
  templateId: ReportTemplateId,
): ReportDocument {
  const doc = requireDoc(reportId);
  const next = touch(doc, {
    templateId,
    sections: buildSectionsFromTemplate(templateId),
  });
  pushHistory(
    reportId,
    "modelo_alterado",
    `Modelo alterado para ${REPORT_TEMPLATE_LABEL[templateId]}. Estrutura das seções recriada.`,
  );
  return next;
}

export function renameReport(reportId: string, title: string): ReportDocument {
  const doc = requireDoc(reportId);
  const next = touch(doc, { title: title.trim() });
  pushHistory(reportId, "titulo_alterado", `Título alterado para "${next.title}".`);
  return next;
}

export function updateBlockContent(
  reportId: string,
  sectionId: string,
  blockId: string,
  content: string,
): ReportDocument {
  const doc = requireDoc(reportId);
  const now = reportNow();
  let next = replaceBlock(doc, sectionId, blockId, (b) => ({
    ...b,
    content,
    manuallyEdited: true,
    reviewed: false,
    lastEditedAt: now,
  }));
  next = demoteApprovedSection(next, sectionId);
  pushHistory(reportId, "conteudo_alterado", `Conteúdo do bloco atualizado.`, {
    sectionId,
    blockId,
  });
  return next;
}

export function updateBlockTitle(
  reportId: string,
  sectionId: string,
  blockId: string,
  title: string,
): ReportDocument {
  const doc = requireDoc(reportId);
  const now = reportNow();
  let next = replaceBlock(doc, sectionId, blockId, (b) => ({
    ...b,
    title,
    manuallyEdited: true,
    lastEditedAt: now,
  }));
  next = demoteApprovedSection(next, sectionId);
  pushHistory(
    reportId,
    "titulo_bloco_alterado",
    `Título do bloco atualizado.`,
    { sectionId, blockId },
  );
  return next;
}

export function markBlockReviewed(
  reportId: string,
  sectionId: string,
  blockId: string,
  reviewed: boolean,
): ReportDocument {
  const doc = requireDoc(reportId);
  const next = replaceBlock(doc, sectionId, blockId, (b) => ({ ...b, reviewed }));
  pushHistory(
    reportId,
    reviewed ? "bloco_revisado" : "revisao_retirada",
    reviewed ? "Bloco marcado como revisado." : "Revisão do bloco retirada.",
    { sectionId, blockId },
  );
  return next;
}

/**
 * LV-15 (correção) — mutação interna privada para alterar status.
 * Não faz validação: usada por `setSectionStatus` (com bloqueio de "aprovada")
 * e por `approveSection` (após validação completa).
 */
function applySectionStatusInternal(
  reportId: string,
  sectionId: string,
  status: ReportSectionStatus,
): ReportDocument {
  const doc = requireDoc(reportId);
  const next = replaceSection(doc, sectionId, (s) => ({ ...s, status }));
  pushHistory(
    reportId,
    "status_secao_alterado",
    `Status da seção alterado para "${REPORT_SECTION_STATUS_LABEL[status]}".`,
    { sectionId },
  );
  return next;
}

/**
 * LV-15 (correção) — rejeita explicitamente `"aprovada"`.
 * A aprovação só pode ocorrer via `approveSection`, que valida conteúdo e revisão.
 */
export function setSectionStatus(
  reportId: string,
  sectionId: string,
  status: ReportSectionStatus,
): ReportDocument {
  if (status === "aprovada") {
    throw new Error(
      "setSectionStatus não pode aplicar \"aprovada\" diretamente. Use approveSection.",
    );
  }
  return applySectionStatusInternal(reportId, sectionId, status);
}

/**
 * LV-15 — aprovação de seção com validação determinística.
 * Regras:
 *  - seção precisa ter pelo menos 1 bloco;
 *  - todos os blocos precisam ter conteúdo (após trim);
 *  - todos os blocos precisam estar marcados como revisados.
 */
export type ApproveSectionResult =
  | { readonly ok: true; readonly document: ReportDocument }
  | { readonly ok: false; readonly reason: string };

export function approveSection(
  reportId: string,
  sectionId: string,
): ApproveSectionResult {
  const doc = requireDoc(reportId);
  const sec = doc.sections.find((s) => s.id === sectionId);
  if (!sec) return { ok: false, reason: "Seção não encontrada." };
  if (sec.blocks.length === 0)
    return { ok: false, reason: "Seção vazia não pode ser aprovada." };
  const emptyBlock = sec.blocks.find((b) => b.content.trim().length === 0);
  if (emptyBlock)
    return {
      ok: false,
      reason: "Existem blocos sem conteúdo. Preencha antes de aprovar.",
    };
  const unreviewed = sec.blocks.find((b) => !b.reviewed);
  if (unreviewed)
    return {
      ok: false,
      reason: "Existem blocos não revisados. Revise antes de aprovar.",
    };
  const next = applySectionStatusInternal(reportId, sectionId, "aprovada");
  return { ok: true, document: next };
}


export function addBlock(
  reportId: string,
  sectionId: string,
  input: { title: string; content: string; origin?: ReportBlockOrigin },
): ReportDocument {
  const doc = requireDoc(reportId);
  const now = reportNow();
  let newBlockId = "";
  const next = replaceSection(doc, sectionId, (s) => {
    const id = makeReportId("blk");
    newBlockId = id;
    return {
      ...s,
      blocks: [
        ...s.blocks,
        {
          id,
          title: input.title.trim() || "Novo bloco",
          content: input.content,
          origin: input.origin ?? "manual",
          manuallyEdited: input.origin !== "modelo",
          reviewed: false,
          sources: [],
          lastEditedAt: now,
        },
      ],
    };
  });
  pushHistory(reportId, "bloco_criado", "Novo bloco adicionado.", {
    sectionId,
    blockId: newBlockId,
  });
  return next;
}

export function removeBlock(
  reportId: string,
  sectionId: string,
  blockId: string,
): ReportDocument {
  const doc = requireDoc(reportId);
  const next = replaceSection(doc, sectionId, (s) => ({
    ...s,
    blocks: s.blocks.filter((b) => b.id !== blockId),
  }));
  pushHistory(reportId, "bloco_removido", "Bloco removido.", {
    sectionId,
    blockId,
  });
  return next;
}

/** LV-15 — duplica um bloco imediatamente após ele. */
export function duplicateBlock(
  reportId: string,
  sectionId: string,
  blockId: string,
): ReportDocument {
  const doc = requireDoc(reportId);
  const now = reportNow();
  let newId = "";
  const next = replaceSection(doc, sectionId, (s) => {
    const idx = s.blocks.findIndex((b) => b.id === blockId);
    if (idx < 0) return s;
    const src = s.blocks[idx];
    const clone: ReportBlock = {
      id: makeReportId("blk"),
      title: `${src.title} (cópia)`,
      content: src.content,
      origin: "manual",
      manuallyEdited: true,
      reviewed: false,
      sources: src.sources.map((r) => ({ ...r, id: makeReportId("src") })),
      lastEditedAt: now,
    };
    newId = clone.id;
    const blocks = [...s.blocks.slice(0, idx + 1), clone, ...s.blocks.slice(idx + 1)];
    return { ...s, blocks };
  });
  pushHistory(reportId, "bloco_duplicado", "Bloco duplicado.", {
    sectionId,
    blockId: newId,
  });
  return next;
}

/** LV-15 — move um bloco na direção indicada. */
export function moveBlock(
  reportId: string,
  sectionId: string,
  blockId: string,
  direction: "up" | "down",
): ReportDocument {
  const doc = requireDoc(reportId);
  const next = replaceSection(doc, sectionId, (s) => {
    const idx = s.blocks.findIndex((b) => b.id === blockId);
    if (idx < 0) return s;
    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= s.blocks.length) return s;
    const blocks = s.blocks.slice();
    [blocks[idx], blocks[target]] = [blocks[target], blocks[idx]];
    return { ...s, blocks };
  });
  pushHistory(reportId, "bloco_movido", `Bloco movido para ${direction === "up" ? "cima" : "baixo"}.`, {
    sectionId,
    blockId,
  });
  return next;
}

// ---------- Fontes ----------

export function linkSourceToBlock(
  reportId: string,
  sectionId: string,
  blockId: string,
  source: { kind: ReportSourceKind; refId: string; label: string },
): ReportDocument {
  const doc = requireDoc(reportId);
  const next = replaceBlock(doc, sectionId, blockId, (b) => {
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
  pushHistory(reportId, "fonte_vinculada", `Fonte vinculada (${source.kind}).`, {
    sectionId,
    blockId,
  });
  return next;
}

export function unlinkSourceFromBlock(
  reportId: string,
  sectionId: string,
  blockId: string,
  sourceId: string,
): ReportDocument {
  const doc = requireDoc(reportId);
  const next = replaceBlock(doc, sectionId, blockId, (b) => ({
    ...b,
    sources: b.sources.filter((s) => s.id !== sourceId),
  }));
  pushHistory(reportId, "fonte_removida", "Fonte removida do bloco.", {
    sectionId,
    blockId,
  });
  return next;
}

// ---------- Utilitários ----------

export function findSection(
  doc: ReportDocument,
  kind: ReportSectionKind,
): ReportSection | undefined {
  return doc.sections.find((s) => s.kind === kind);
}

/** LV-15 — registra eventos de prévia/exportação. */
export function logPreviewOpened(reportId: string): ReportHistoryEvent {
  return pushHistory(reportId, "previa_aberta", "Prévia do documento aberta.");
}

export function logExportPerformed(
  reportId: string,
  description: string,
): ReportHistoryEvent {
  return pushHistory(reportId, "exportacao_realizada", description);
}

export function logExportBlocked(
  reportId: string,
  reason: string,
): ReportHistoryEvent {
  return pushHistory(reportId, "exportacao_bloqueada", reason);
}
