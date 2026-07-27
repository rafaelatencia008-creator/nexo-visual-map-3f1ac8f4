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
  REPORT_CHECKLIST_LABEL,
  REPORT_CHECKLIST_ORDER,
  REPORT_SECTION_LABEL,
  REPORT_SECTION_STATUS_LABEL,
  REPORT_TEMPLATE_LABEL,
  REPORT_VERSION_TYPE_LABEL,
  type ReportBlock,
  type ReportBlockOrigin,
  type ReportChecklist,
  type ReportChecklistItemId,
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
  type ReportVersion,
  type ReportVersionListItem,
  type ReportVersionType,
} from "./report-types";
import {
  compareVersions as compareVersionsPure,
  deepFreezeDocument,
  emptyChecklist,
  checklistProgress,
  toggleChecklist,
  watermarkFor,
} from "./report-versions";
import { computePendingItems, computeGeneralStatus } from "./report-review";

// ---------- IDs / clock ----------

let idCounter = 9000;
export function makeReportId(
  prefix: "rep" | "sec" | "blk" | "src" | "hst" | "ver",
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
  reportsSnapshot: readonly ReportListSummary[] | null;
  historySnapshot: readonly ReportHistoryEvent[] | null;
  version: number;
  // LV-16
  versions: Map<string, ReportVersion[]>;
  versionsSnapshot: Map<string, readonly ReportVersion[]>;
  checklists: Map<string, ReportChecklist>;
  frozen: Set<string>;
  versionsListeners: Set<Listener>;
  checklistListeners: Set<Listener>;
  authorLabel: string;
} = {
  documents: new Map(),
  order: [],
  listeners: new Set(),
  history: [],
  historyListeners: new Set(),
  reportsSnapshot: null,
  historySnapshot: null,
  version: 0,
  versions: new Map(),
  versionsSnapshot: new Map(),
  checklists: new Map(),
  frozen: new Set(),
  versionsListeners: new Set(),
  checklistListeners: new Set(),
  authorLabel: "Responsável mock",
};

function invalidateReportsSnapshot(): void {
  state.reportsSnapshot = null;
  state.version += 1;
}
function invalidateHistorySnapshot(): void {
  state.historySnapshot = null;
}
function invalidateVersionsSnapshot(reportId: string): void {
  state.versionsSnapshot.delete(reportId);
}

function notify(): void {
  invalidateReportsSnapshot();
  for (const l of state.listeners) l();
}
function notifyHistory(): void {
  invalidateHistorySnapshot();
  for (const l of state.historyListeners) l();
}
function notifyVersions(): void {
  for (const l of state.versionsListeners) l();
}
function notifyChecklist(): void {
  for (const l of state.checklistListeners) l();
}

export function subscribeReports(listener: Listener): () => void {
  state.listeners.add(listener);
  return () => state.listeners.delete(listener);
}

export function subscribeReportHistory(listener: Listener): () => void {
  state.historyListeners.add(listener);
  return () => state.historyListeners.delete(listener);
}

export function subscribeReportVersions(listener: Listener): () => void {
  state.versionsListeners.add(listener);
  return () => state.versionsListeners.delete(listener);
}

export function subscribeReportChecklist(listener: Listener): () => void {
  state.checklistListeners.add(listener);
  return () => state.checklistListeners.delete(listener);
}

export function resetReportStore(): void {
  state.documents.clear();
  state.order = [];
  state.history = [];
  state.reportsSnapshot = null;
  state.historySnapshot = null;
  state.versions.clear();
  state.versionsSnapshot.clear();
  state.checklists.clear();
  state.frozen.clear();
  state.version += 1;
  notify();
  notifyHistory();
  notifyVersions();
  notifyChecklist();
}

export function getReportsVersion(): number {
  return state.version;
}


// ---------- Histórico (append-only) ----------

function pushHistory(
  reportId: string,
  kind: ReportHistoryEventKind,
  description: string,
  extras: {
    sectionId?: string;
    blockId?: string;
    versionId?: string;
    relatedEventId?: string;
  } = {},
): ReportHistoryEvent {
  const ev: ReportHistoryEvent = Object.freeze({
    id: makeReportId("hst"),
    kind,
    at: reportNow(),
    description,
    reportId,
    sectionId: extras.sectionId,
    blockId: extras.blockId,
    versionId: extras.versionId,
    relatedEventId: extras.relatedEventId,
  });
  state.history.push(ev);
  notifyHistory();
  return ev;

}

export function getReportHistorySnapshot(): readonly ReportHistoryEvent[] {
  if (state.historySnapshot === null) {
    state.historySnapshot = Object.freeze(state.history.slice());
  }
  return state.historySnapshot;
}

export function listReportHistory(
  reportId?: string,
): readonly ReportHistoryEvent[] {
  const all = getReportHistorySnapshot();
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

// ---------- LV-18.5 — Criação a partir de Modelo LV-18 ----------

/**
 * Seção pré-preparada pela camada de aplicação de modelos (LV-18.5).
 * Contém títulos e conteúdos JÁ RESOLVIDOS (placeholders substituídos).
 * A store gera IDs novos e insere o laudo em uma única operação atômica.
 */
export type PreparedSectionForApplication = {
  readonly kind: ReportSectionKind;
  readonly title: string;
  readonly blocks: readonly {
    readonly title: string;
    readonly content: string;
  }[];
};

export type CreateReportFromTemplateInput = {
  readonly title: string;
  readonly caseId: string;
  readonly caseLabel: string;
  readonly sections: readonly PreparedSectionForApplication[];
  readonly origin: import("./report-types").ReportTemplateOrigin;
};

/**
 * Cria um laudo a partir de estrutura pronta oriunda de Modelo LV-18.
 *
 * - Gera IDs próprios para laudo, seções e blocos (nunca reaproveita
 *   os IDs do modelo).
 * - Congela `templateOrigin` para garantir rastreabilidade imutável.
 * - Emite UMA única atualização da store principal.
 * - Emite UM único evento de histórico agregado (sem conteúdo integral).
 */
export function createReportFromTemplateApplication(
  input: CreateReportFromTemplateInput,
): ReportDocument {
  const now = reportNow();
  const sections: ReportSection[] = input.sections.map((sec) => ({
    id: makeReportId("sec"),
    kind: sec.kind,
    title: sec.title,
    status: "nao_iniciada" as ReportSectionStatus,
    blocks: sec.blocks.map<ReportBlock>((b) => ({
      id: makeReportId("blk"),
      title: b.title,
      content: b.content,
      origin: "modelo" as ReportBlockOrigin,
      manuallyEdited: false,
      reviewed: false,
      sources: [],
      lastEditedAt: now,
    })),
  }));

  const doc: ReportDocument = Object.freeze({
    id: makeReportId("rep"),
    title: input.title.trim(),
    // Laudos criados a partir de modelos LV-18 não usam os templates LV-14
    // internos — a estrutura já veio pronta. Marcamos como "personalizado"
    // para preservar compatibilidade com o restante do domínio existente.
    templateId: "personalizado" as ReportTemplateId,
    caseId: input.caseId,
    caseLabel: input.caseLabel,
    createdAt: now,
    updatedAt: now,
    sections,
    templateOrigin: Object.freeze({ ...input.origin }),
  });

  state.documents.set(doc.id, doc);
  state.order.push(doc.id);
  notify();
  pushHistory(
    doc.id,
    "report_created_from_template",
    `Documento "${doc.title}" criado a partir do modelo "${input.origin.templateName}" (versão ${input.origin.templateVersionNumber}) — ${sections.length} seções, ${sections.reduce((n, s) => n + s.blocks.length, 0)} blocos.`,
  );
  return doc;
}

export function getReportsSnapshot(): readonly ReportListSummary[] {
  if (state.reportsSnapshot === null) {
    state.reportsSnapshot = Object.freeze(
      state.order.map((id) => {
        const d = state.documents.get(id)!;
        const total = d.sections.length;
        const done = d.sections.filter(
          (s) => s.status === "revisada" || s.status === "aprovada",
        ).length;
        return Object.freeze({
          id: d.id,
          title: d.title,
          templateId: d.templateId,
          caseLabel: d.caseLabel,
          updatedAt: d.updatedAt,
          reviewProgress: total === 0 ? 0 : done / total,
        });
      }),
    );
  }
  return state.reportsSnapshot;
}

export function listReports(): readonly ReportListSummary[] {
  return getReportsSnapshot();
}


export function getReport(id: string): ReportDocument | undefined {
  return state.documents.get(id);
}

function requireDoc(id: string): ReportDocument {
  const doc = state.documents.get(id);
  if (!doc) throw new Error(`Documento não encontrado: ${id}`);
  return doc;
}

/** LV-16 — guard: rejeita mutação quando documento está congelado. */
export function isReportFrozen(reportId: string): boolean {
  return state.frozen.has(reportId);
}

function assertMutable(reportId: string, action = "editar"): void {
  if (state.frozen.has(reportId)) {
    throw new Error(
      `Documento congelado: ação "${action}" bloqueada. Reabra para editar.`,
    );
  }
}

function requireMutable(reportId: string, action = "editar"): ReportDocument {
  const doc = requireDoc(reportId);
  assertMutable(reportId, action);
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
  const doc = requireMutable(reportId, "trocar modelo");
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
  const doc = requireMutable(reportId, "renomear");
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
  const doc = requireMutable(reportId, "atualizar conteúdo");
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
  const doc = requireMutable(reportId, "atualizar título do bloco");
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
  const doc = requireMutable(reportId, "marcar revisão");
  const next = replaceBlock(doc, sectionId, blockId, (b) => ({ ...b, reviewed }));
  pushHistory(
    reportId,
    reviewed ? "bloco_revisado" : "revisao_retirada",
    reviewed ? "Bloco marcado como revisado." : "Revisão do bloco retirada.",
    { sectionId, blockId },
  );
  return next;
}

// ---------- LV-19.1 — operações atômicas do workspace ----------

/**
 * LV-19.1 — atualização atômica de um bloco.
 *
 * Aceita opcionalmente `title` e/ou `content`. Aplica UMA única mutação
 * lógica no documento, emite UM único evento de histórico
 * (`bloco_atualizado`) e dispara UMA notificação por domínio afetado
 * (reports + history). Em caso de erro (documento/seção/bloco inexistente,
 * congelado, patch vazio ou sem mudança efetiva) nada é alterado.
 *
 * Rebaixa seções `aprovada` para `em_elaboracao` na mesma mutação,
 * preservando a semântica de LV-15. Não emite evento extra para o
 * rebaixamento — ele é parte da mesma alteração atômica.
 */
export type UpdateBlockAtomicPatch = {
  readonly title?: string;
  readonly content?: string;
};

export function updateBlockAtomic(
  reportId: string,
  sectionId: string,
  blockId: string,
  patch: UpdateBlockAtomicPatch,
): ReportDocument {
  const doc = requireMutable(reportId, "atualizar bloco");
  const section = doc.sections.find((s) => s.id === sectionId);
  if (!section) {
    throw new Error(`Seção não encontrada: ${sectionId}`);
  }
  const block = section.blocks.find((b) => b.id === blockId);
  if (!block) {
    throw new Error(`Bloco não encontrado: ${blockId}`);
  }
  const hasTitle = Object.prototype.hasOwnProperty.call(patch, "title");
  const hasContent = Object.prototype.hasOwnProperty.call(patch, "content");
  if (!hasTitle && !hasContent) {
    throw new Error("Patch vazio: informe title e/ou content.");
  }
  const nextTitle = hasTitle ? (patch.title ?? "") : block.title;
  const nextContent = hasContent ? (patch.content ?? "") : block.content;
  const titleChanged = hasTitle && nextTitle !== block.title;
  const contentChanged = hasContent && nextContent !== block.content;
  if (!titleChanged && !contentChanged) {
    throw new Error("Nenhuma alteração efetiva no bloco.");
  }
  const now = reportNow();
  const nextBlock: ReportBlock = {
    ...block,
    title: nextTitle,
    content: nextContent,
    manuallyEdited: true,
    reviewed: contentChanged ? false : block.reviewed,
    lastEditedAt: now,
  };
  const demote = section.status === "aprovada";
  const nextSection: ReportSection = {
    ...section,
    status: demote ? "em_elaboracao" : section.status,
    blocks: section.blocks.map((b) => (b.id === blockId ? nextBlock : b)),
  };
  const nextSections = doc.sections.map((s) => (s.id === sectionId ? nextSection : s));
  const nextDoc: ReportDocument = Object.freeze({
    ...doc,
    sections: nextSections,
    updatedAt: now,
  });
  state.documents.set(nextDoc.id, nextDoc);
  const parts: string[] = [];
  if (titleChanged) parts.push("título");
  if (contentChanged) parts.push("conteúdo");
  pushHistory(
    reportId,
    "bloco_atualizado",
    `Bloco atualizado (${parts.join(" e ")}).`,
    { sectionId, blockId },
  );
  notify();
  return nextDoc;
}

/**
 * LV-19.1 — registra abertura do workspace para edição.
 * Único evento no histórico, sem alteração de documento e sem notificação de reports.
 */
export function logWorkspaceOpened(reportId: string): ReportHistoryEvent {
  requireDoc(reportId);
  return pushHistory(
    reportId,
    "workspace_aberto",
    "Laudo aberto para edição.",
  );
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
  const doc = requireMutable(reportId, "alterar status");
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
  assertMutable(reportId, "aprovar seção");
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
  const doc = requireMutable(reportId, "adicionar bloco");
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
  const doc = requireMutable(reportId, "remover bloco");
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
  const doc = requireMutable(reportId, "duplicar bloco");
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
  const doc = requireMutable(reportId, "mover bloco");
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
  const doc = requireMutable(reportId, "vincular fonte");
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
  const doc = requireMutable(reportId, "desvincular fonte");
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

// ============================================================================
// LV-16 — Versões, Checklist, Fechamento, Reabertura, Comparação
// ============================================================================

// ---------- Autor mock ----------

export function setAuthorLabel(label: string): void {
  state.authorLabel = label || "Responsável mock";
}
export function getAuthorLabel(): string {
  return state.authorLabel;
}

// ---------- Checklist ----------

export function getChecklist(reportId: string): ReportChecklist {
  const c = state.checklists.get(reportId);
  if (c) return c;
  const initial = emptyChecklist();
  state.checklists.set(reportId, initial);
  return initial;
}

export function getChecklistProgress(reportId: string) {
  return checklistProgress(getChecklist(reportId));
}

export function setChecklistItem(
  reportId: string,
  item: ReportChecklistItemId,
  value: boolean,
): ReportChecklist {
  requireDoc(reportId);
  assertMutable(reportId, "atualizar checklist");
  const before = getChecklist(reportId);
  const next = toggleChecklist(before, item, value);
  if (next === before) return before;
  state.checklists.set(reportId, next);
  pushHistory(
    reportId,
    value ? "checklist_marcado" : "checklist_desmarcado",
    `Checklist: ${REPORT_CHECKLIST_LABEL[item]} — ${value ? "marcado" : "desmarcado"}.`,
  );
  notifyChecklist();
  return next;
}

// ---------- Versões ----------

function versionsOf(reportId: string): ReportVersion[] {
  let arr = state.versions.get(reportId);
  if (!arr) {
    arr = [];
    state.versions.set(reportId, arr);
  }
  return arr;
}

export function getReportVersionsSnapshot(
  reportId: string,
): readonly ReportVersion[] {
  const cached = state.versionsSnapshot.get(reportId);
  if (cached) return cached;
  const frozen = Object.freeze(versionsOf(reportId).slice());
  state.versionsSnapshot.set(reportId, frozen);
  return frozen;
}

export function listReportVersions(reportId: string): readonly ReportVersion[] {
  return getReportVersionsSnapshot(reportId);
}

export function listReportVersionItems(
  reportId: string,
): readonly ReportVersionListItem[] {
  return getReportVersionsSnapshot(reportId).map((v) =>
    Object.freeze({
      id: v.id,
      number: v.number,
      type: v.type,
      status: v.status,
      createdAt: v.createdAt,
      authorLabel: v.authorLabel,
      reason: v.reason,
      pendingCount: v.pendingCount,
      generalStatus: v.generalStatus,
    }),
  );
}

export function getReportVersion(
  reportId: string,
  versionId: string,
): ReportVersion | undefined {
  return versionsOf(reportId).find((v) => v.id === versionId);
}

export function getLatestVersion(
  reportId: string,
): ReportVersion | undefined {
  const arr = versionsOf(reportId);
  return arr.length ? arr[arr.length - 1] : undefined;
}

export type CreateVersionResult =
  | { readonly ok: true; readonly version: ReportVersion }
  | { readonly ok: false; readonly reason: string };

export function canCreateReviewedVersion(reportId: string): {
  ok: boolean;
  reason?: string;
} {
  const doc = requireDoc(reportId);
  if (doc.title.trim().length === 0)
    return { ok: false, reason: "Título vazio." };
  if (!doc.caseId) return { ok: false, reason: "Perícia não vinculada." };
  const pendings = computePendingItems(doc);
  const blocking = pendings.filter((p) => p.severity === "impeditivo");
  if (blocking.length > 0)
    return {
      ok: false,
      reason: `Existem ${blocking.length} pendência(s) impeditiva(s).`,
    };
  return { ok: true };
}

export function canCloseReport(reportId: string): {
  ok: boolean;
  reason?: string;
} {
  const pre = canCreateReviewedVersion(reportId);
  if (!pre.ok) return pre;
  const doc = requireDoc(reportId);
  const mandatoryNotApproved = doc.sections.filter(
    (s) =>
      ["identificacao_pericia", "identificacao_partes", "objeto", "historico",
       "metodologia", "quesitos", "fundamentacao", "analise", "conclusao"].includes(s.kind) &&
      s.status !== "aprovada",
  );
  if (mandatoryNotApproved.length > 0)
    return {
      ok: false,
      reason: "Existem seções obrigatórias não aprovadas.",
    };
  const progress = getChecklistProgress(reportId);
  if (!progress.complete)
    return {
      ok: false,
      reason: `Checklist incompleto (${progress.done}/${progress.total}).`,
    };
  return { ok: true };
}

function buildSnapshot(doc: ReportDocument, checklist: ReportChecklist) {
  const frozenDoc = deepFreezeDocument(doc);
  const pendings = Object.freeze(computePendingItems(doc).map((p) => Object.freeze({ ...p })));
  const generalStatus = computeGeneralStatus(doc, pendings);
  return {
    document: frozenDoc,
    checklist: Object.freeze({ ...checklist }) as ReportChecklist,
    pendings,
    generalStatus,
  } as const;
}

function nextVersionNumber(reportId: string): number {
  const arr = versionsOf(reportId);
  return arr.length + 1;
}

export function createReportVersion(
  reportId: string,
  type: ReportVersionType,
  reason: string,
  opts: { authorLabel?: string; confirmClosure?: boolean } = {},
): CreateVersionResult {
  if (!state.documents.has(reportId))
    return { ok: false, reason: "Documento não encontrado." };
  if (reason.trim().length === 0)
    return { ok: false, reason: "Motivo obrigatório." };
  if (state.frozen.has(reportId))
    return { ok: false, reason: "Documento congelado. Reabra antes de criar nova versão." };

  const doc = requireDoc(reportId);

  if (type === "revisada") {
    const g = canCreateReviewedVersion(reportId);
    if (!g.ok) {
      pushHistory(reportId, "versao_revisada_bloqueada", `Versão revisada bloqueada: ${g.reason}`);
      return { ok: false, reason: g.reason ?? "Bloqueado." };
    }
  }
  if (type === "fechada") {
    if (!opts.confirmClosure) {
      pushHistory(reportId, "fechamento_bloqueado", "Fechamento bloqueado: confirmação explícita obrigatória.");
      return { ok: false, reason: "Confirmação explícita obrigatória." };
    }
    const g = canCloseReport(reportId);
    if (!g.ok) {
      pushHistory(reportId, "fechamento_bloqueado", `Fechamento bloqueado: ${g.reason}`);
      return { ok: false, reason: g.reason ?? "Bloqueado." };
    }
  }

  const checklist = getChecklist(reportId);
  const snapshot = buildSnapshot(doc, checklist);
  const number = nextVersionNumber(reportId);
  const authorLabel = opts.authorLabel?.trim() || state.authorLabel;
  const version: ReportVersion = Object.freeze({
    id: makeReportId("ver"),
    number,
    reportId,
    type,
    status: type === "fechada" ? "fechada" : type === "revisada" ? "em_revisao" : "rascunho",
    title: doc.title,
    templateId: doc.templateId,
    caseId: doc.caseId,
    caseLabel: doc.caseLabel,
    createdAt: reportNow(),
    authorLabel,
    reason: reason.trim(),
    pendingCount: snapshot.pendings.length,
    generalStatus: snapshot.generalStatus,
    watermark: watermarkFor(type),
    snapshot,
    demonstrative: true,
  }) as ReportVersion;

  versionsOf(reportId).push(version);
  invalidateVersionsSnapshot(reportId);
  notifyVersions();

  if (type === "trabalho") {
    pushHistory(reportId, "versao_trabalho_criada", `Versão ${number} de trabalho criada.`, { versionId: version.id });
  } else if (type === "revisada") {
    pushHistory(reportId, "versao_revisada_criada", `Versão ${number} revisada criada.`, { versionId: version.id });
  } else {
    // Marcar versão fechada anterior como substituída
    const prevClosed = versionsOf(reportId)
      .slice(0, -1)
      .reverse()
      .find((v) => v.type === "fechada" && v.status === "fechada");
    if (prevClosed) {
      const idx = versionsOf(reportId).indexOf(prevClosed);
      const updated: ReportVersion = Object.freeze({ ...prevClosed, status: "substituida" }) as ReportVersion;
      versionsOf(reportId)[idx] = updated;
      invalidateVersionsSnapshot(reportId);
      pushHistory(reportId, "versao_anterior_substituida",
        `Versão ${prevClosed.number} marcada como substituída pela versão ${number}.`,
        { versionId: prevClosed.id, relatedEventId: version.id });
    }
    pushHistory(reportId, "versao_fechada_criada", `Versão ${number} fechada criada.`, { versionId: version.id });
    // Congelar documento
    state.frozen.add(reportId);
    pushHistory(reportId, "documento_congelado", "Documento congelado após fechamento.");
    notify();
  }
  return { ok: true, version };
}

export function reopenReport(
  reportId: string,
  reason: string,
  opts: { confirm?: boolean } = {},
): { ok: boolean; reason?: string } {
  if (!state.documents.has(reportId))
    return { ok: false, reason: "Documento não encontrado." };
  if (!state.frozen.has(reportId)) {
    pushHistory(reportId, "reabertura_bloqueada", "Reabertura bloqueada: documento não está congelado.");
    return { ok: false, reason: "Documento não está congelado." };
  }
  if (reason.trim().length === 0) {
    pushHistory(reportId, "reabertura_bloqueada", "Reabertura bloqueada: motivo obrigatório.");
    return { ok: false, reason: "Motivo obrigatório." };
  }
  if (!opts.confirm) {
    pushHistory(reportId, "reabertura_bloqueada", "Reabertura bloqueada: confirmação explícita obrigatória.");
    return { ok: false, reason: "Confirmação explícita obrigatória." };
  }
  pushHistory(reportId, "reabertura_solicitada", `Reabertura solicitada. Motivo: ${reason.trim()}`);
  state.frozen.delete(reportId);
  pushHistory(reportId, "documento_reaberto",
    "Documento reaberto. A versão fechada anterior será preservada e não será modificada.");
  notify();
  return { ok: true };
}

// ---------- Comparação ----------

export function compareReportVersions(
  reportId: string,
  versionAId: string,
  versionBId: string,
) {
  const a = getReportVersion(reportId, versionAId);
  const b = getReportVersion(reportId, versionBId);
  if (!a || !b) throw new Error("Versão não encontrada.");
  if (a.reportId !== reportId || b.reportId !== reportId)
    throw new Error("Versões pertencem a documentos diferentes.");
  pushHistory(reportId, "comparacao_aberta",
    `Comparação aberta entre versões ${a.number} e ${b.number}.`);
  return compareVersionsPure(a, b);
}

// ---------- Logs ----------

export function logVersionViewed(reportId: string, versionId: string): void {
  const v = getReportVersion(reportId, versionId);
  if (!v) return;
  pushHistory(reportId, "versao_visualizada",
    `Versão ${v.number} (${REPORT_VERSION_TYPE_LABEL[v.type]}) visualizada.`,
    { versionId });
}

export function logVersionExported(
  reportId: string,
  versionId: string,
  description: string,
): void {
  pushHistory(reportId, "versao_exportada", description, { versionId });
}

export function logVersionPrinted(reportId: string, versionId: string): void {
  const v = getReportVersion(reportId, versionId);
  if (!v) return;
  pushHistory(reportId, "versao_impressa", `Versão ${v.number} impressa localmente.`, { versionId });
}

export function logClosureFlow(
  reportId: string,
  kind: "iniciado" | "cancelado",
): void {
  pushHistory(
    reportId,
    kind === "iniciado" ? "fechamento_iniciado" : "fechamento_cancelado",
    kind === "iniciado" ? "Fluxo de fechamento iniciado." : "Fluxo de fechamento cancelado.",
  );
}
