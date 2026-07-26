/**
 * LV-16 — Motor puro de versões, checklist e comparação.
 *
 * Nenhum efeito colateral. Snapshots profundamente congelados.
 * Comparações determinísticas, sem HTML arbitrário.
 */

import {
  REPORT_CHECKLIST_ORDER,
  REPORT_SECTION_LABEL,
  type ReportBlock,
  type ReportBlockDiff,
  type ReportChecklist,
  type ReportChecklistItemId,
  type ReportDocument,
  type ReportSection,
  type ReportSectionDiff,
  type ReportSectionKind,
  type ReportVersion,
  type ReportVersionDiff,
  type ReportVersionType,
} from "./report-types";

// ---------- Checklist ----------

export function emptyChecklist(): ReportChecklist {
  const base = {} as Record<ReportChecklistItemId, boolean>;
  for (const k of REPORT_CHECKLIST_ORDER) base[k] = false;
  return Object.freeze(base);
}

export function checklistProgress(cl: ReportChecklist): {
  readonly total: number;
  readonly done: number;
  readonly remaining: readonly ReportChecklistItemId[];
  readonly complete: boolean;
} {
  const total = REPORT_CHECKLIST_ORDER.length;
  const remaining = REPORT_CHECKLIST_ORDER.filter((k) => !cl[k]);
  const done = total - remaining.length;
  return { total, done, remaining, complete: remaining.length === 0 };
}

export function toggleChecklist(
  cl: ReportChecklist,
  item: ReportChecklistItemId,
  value: boolean,
): ReportChecklist {
  if (cl[item] === value) return cl;
  const next = { ...cl, [item]: value } as Record<ReportChecklistItemId, boolean>;
  return Object.freeze(next);
}

// ---------- Deep-freeze helpers ----------

function freezeBlock(b: ReportBlock): ReportBlock {
  return Object.freeze({
    ...b,
    sources: Object.freeze(b.sources.map((s) => Object.freeze({ ...s }))),
  }) as ReportBlock;
}
function freezeSection(s: ReportSection): ReportSection {
  return Object.freeze({
    ...s,
    blocks: Object.freeze(s.blocks.map(freezeBlock)),
  }) as ReportSection;
}
export function deepFreezeDocument(doc: ReportDocument): ReportDocument {
  return Object.freeze({
    ...doc,
    sections: Object.freeze(doc.sections.map(freezeSection)),
  }) as ReportDocument;
}

// ---------- Watermark helpers ----------

export function watermarkFor(type: ReportVersionType): string {
  if (type === "trabalho")
    return "VERSÃO DE TRABALHO — DOCUMENTO DEMONSTRATIVO — SEM VALIDADE";
  if (type === "revisada") return "VERSÃO REVISADA DEMONSTRATIVA — SEM VALIDADE";
  return "VERSÃO FECHADA DEMONSTRATIVA — SEM VALIDADE OFICIAL";
}

// ---------- Comparação ----------

function valueChange<T>(a: T, b: T): { changed: boolean; before: T; after: T } {
  return { changed: a !== b, before: a, after: b };
}

function sourcesDiff(a: ReportBlock, b: ReportBlock): {
  added: string[];
  removed: string[];
} {
  const keyA = new Set(a.sources.map((s) => `${s.kind}:${s.refId}`));
  const keyB = new Set(b.sources.map((s) => `${s.kind}:${s.refId}`));
  const added: string[] = [];
  const removed: string[] = [];
  for (const s of b.sources) {
    const k = `${s.kind}:${s.refId}`;
    if (!keyA.has(k)) added.push(`${s.kind}: ${s.label}`);
  }
  for (const s of a.sources) {
    const k = `${s.kind}:${s.refId}`;
    if (!keyB.has(k)) removed.push(`${s.kind}: ${s.label}`);
  }
  return { added, removed };
}

function diffBlocks(
  before: readonly ReportBlock[],
  after: readonly ReportBlock[],
): readonly ReportBlockDiff[] {
  // Casamento por id. Blocos sem correspondência = adicionado/removido.
  const beforeMap = new Map(before.map((b, i) => [b.id, { b, i }]));
  const afterMap = new Map(after.map((b, i) => [b.id, { b, i }]));
  const out: ReportBlockDiff[] = [];
  for (let i = 0; i < before.length; i += 1) {
    const b = before[i]!;
    const match = afterMap.get(b.id);
    if (!match) {
      out.push({
        kind: "removido",
        blockIdBefore: b.id,
        titleBefore: b.title,
        contentBefore: b.content,
        indexBefore: i,
        sourcesAdded: [],
        sourcesRemoved: b.sources.map((s) => `${s.kind}: ${s.label}`),
      });
    }
  }
  for (let j = 0; j < after.length; j += 1) {
    const a = after[j]!;
    const match = beforeMap.get(a.id);
    if (!match) {
      out.push({
        kind: "adicionado",
        blockIdAfter: a.id,
        titleAfter: a.title,
        contentAfter: a.content,
        indexAfter: j,
        sourcesAdded: a.sources.map((s) => `${s.kind}: ${s.label}`),
        sourcesRemoved: [],
      });
      continue;
    }
    const b = match.b;
    const titleChanged = b.title !== a.title;
    const contentChanged = b.content !== a.content;
    const moved = match.i !== j;
    const { added, removed } = sourcesDiff(b, a);
    const anyChange =
      titleChanged || contentChanged || moved || added.length > 0 || removed.length > 0;
    out.push({
      kind: !anyChange
        ? "sem_alteracao"
        : titleChanged || contentChanged || added.length || removed.length
          ? "alterado"
          : "movido",
      blockIdBefore: b.id,
      blockIdAfter: a.id,
      titleBefore: b.title,
      titleAfter: a.title,
      contentBefore: b.content,
      contentAfter: a.content,
      indexBefore: match.i,
      indexAfter: j,
      sourcesAdded: added,
      sourcesRemoved: removed,
    });
  }
  return Object.freeze(out);
}

function diffSections(
  before: readonly ReportSection[],
  after: readonly ReportSection[],
): readonly ReportSectionDiff[] {
  const kinds = new Set<ReportSectionKind>();
  before.forEach((s) => kinds.add(s.kind));
  after.forEach((s) => kinds.add(s.kind));
  const list: ReportSectionDiff[] = [];
  for (const kind of kinds) {
    const a = before.find((s) => s.kind === kind);
    const b = after.find((s) => s.kind === kind);
    list.push({
      kind,
      title: REPORT_SECTION_LABEL[kind],
      statusChanged: a?.status !== b?.status,
      statusBefore: a?.status,
      statusAfter: b?.status,
      blocksBefore: a?.blocks.length ?? 0,
      blocksAfter: b?.blocks.length ?? 0,
      blocks: diffBlocks(a?.blocks ?? [], b?.blocks ?? []),
    });
  }
  return Object.freeze(list);
}

export function compareVersions(
  a: ReportVersion,
  b: ReportVersion,
): ReportVersionDiff {
  if (a.reportId !== b.reportId) {
    throw new Error("Comparação entre versões de documentos diferentes é proibida.");
  }
  const checklistChanged: ReportChecklistItemId[] = [];
  for (const k of REPORT_CHECKLIST_ORDER) {
    if (a.snapshot.checklist[k] !== b.snapshot.checklist[k]) checklistChanged.push(k);
  }
  return Object.freeze({
    reportId: a.reportId,
    versionAId: a.id,
    versionBId: b.id,
    numberA: a.number,
    numberB: b.number,
    title: valueChange(a.title, b.title),
    template: valueChange(a.templateId, b.templateId),
    generalStatus: valueChange(a.generalStatus, b.generalStatus),
    reason: valueChange(a.reason, b.reason),
    createdAt: valueChange(a.createdAt, b.createdAt),
    checklistChanged: Object.freeze(checklistChanged),
    pendingCount: valueChange(a.pendingCount, b.pendingCount),
    sections: diffSections(a.snapshot.document.sections, b.snapshot.document.sections),
  });
}
