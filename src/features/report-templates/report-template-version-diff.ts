/**
 * LV-18.2 — Comparação determinística entre dois snapshots de modelos.
 *
 * Não modifica as entradas. Ordena resultados de forma estável (por id).
 * Distingue alterações de conteúdo de simples reordenações.
 */

import type {
  ReportTemplate,
  ReportTemplateBlock,
  ReportTemplateSection,
  ReportTemplateVariable,
} from "./report-template-types";

export interface SectionDelta {
  readonly id: string;
  readonly title: string;
}
export interface SectionRename {
  readonly id: string;
  readonly from: string;
  readonly to: string;
}
export interface SectionReorder {
  readonly id: string;
  readonly fromIndex: number;
  readonly toIndex: number;
}
export interface BlockDelta {
  readonly id: string;
  readonly sectionId: string;
  readonly kind: string;
}
export interface BlockChange {
  readonly id: string;
  readonly sectionId: string;
  readonly fields: readonly ("kind" | "title" | "content" | "variableRefs")[];
}
export interface BlockReorder {
  readonly id: string;
  readonly sectionId: string;
  readonly fromIndex: number;
  readonly toIndex: number;
}
export interface VariableDelta {
  readonly id: string;
  readonly key: string;
}
export interface VariableChange {
  readonly id: string;
  readonly key: string;
  readonly fields: readonly ("label" | "kind" | "required" | "defaultValue" | "key")[];
}
export interface MetadataChange {
  readonly field: "name" | "description" | "specialty";
  readonly from: string;
  readonly to: string;
}

export interface ReportTemplateDiff {
  readonly sectionsAdded: readonly SectionDelta[];
  readonly sectionsRemoved: readonly SectionDelta[];
  readonly sectionsRenamed: readonly SectionRename[];
  readonly sectionsReordered: readonly SectionReorder[];
  readonly blocksAdded: readonly BlockDelta[];
  readonly blocksRemoved: readonly BlockDelta[];
  readonly blocksChanged: readonly BlockChange[];
  readonly blocksReordered: readonly BlockReorder[];
  readonly variablesAdded: readonly VariableDelta[];
  readonly variablesRemoved: readonly VariableDelta[];
  readonly variablesChanged: readonly VariableChange[];
  readonly metadataChanges: readonly MetadataChange[];
  readonly statusChanged: { readonly from: string; readonly to: string } | null;
  readonly summary: string;
  readonly hasChanges: boolean;
}

function byId<T extends { id: string }>(list: readonly T[]): Map<string, { item: T; idx: number }> {
  const m = new Map<string, { item: T; idx: number }>();
  list.forEach((item, idx) => m.set(item.id, { item, idx }));
  return m;
}

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function sectionEqual(a: ReportTemplateSection, b: ReportTemplateSection): boolean {
  return a.title === b.title && a.description === b.description;
}

function blockChanged(a: ReportTemplateBlock, b: ReportTemplateBlock): BlockChange["fields"] {
  const fields: BlockChange["fields"][number][] = [];
  if (a.kind !== b.kind) fields.push("kind");
  if (a.title !== b.title) fields.push("title");
  if (a.content !== b.content) fields.push("content");
  if (!arraysEqual(a.variableRefs, b.variableRefs)) fields.push("variableRefs");
  return fields;
}

function variableChanged(
  a: ReportTemplateVariable,
  b: ReportTemplateVariable,
): VariableChange["fields"] {
  const fields: VariableChange["fields"][number][] = [];
  if (a.key !== b.key) fields.push("key");
  if (a.label !== b.label) fields.push("label");
  if (a.kind !== b.kind) fields.push("kind");
  if (a.required !== b.required) fields.push("required");
  if (a.defaultValue !== b.defaultValue) fields.push("defaultValue");
  return fields;
}

export function compareReportTemplates(
  before: ReportTemplate,
  after: ReportTemplate,
): ReportTemplateDiff {
  const sectionsAdded: SectionDelta[] = [];
  const sectionsRemoved: SectionDelta[] = [];
  const sectionsRenamed: SectionRename[] = [];
  const sectionsReordered: SectionReorder[] = [];
  const blocksAdded: BlockDelta[] = [];
  const blocksRemoved: BlockDelta[] = [];
  const blocksChanged: BlockChange[] = [];
  const blocksReordered: BlockReorder[] = [];
  const variablesAdded: VariableDelta[] = [];
  const variablesRemoved: VariableDelta[] = [];
  const variablesChanged: VariableChange[] = [];
  const metadataChanges: MetadataChange[] = [];

  const beforeSections = byId(before.sections);
  const afterSections = byId(after.sections);

  // seções removidas
  for (const [id, { item }] of beforeSections) {
    if (!afterSections.has(id)) sectionsRemoved.push({ id, title: item.title });
  }
  // seções adicionadas
  for (const [id, { item }] of afterSections) {
    if (!beforeSections.has(id)) sectionsAdded.push({ id, title: item.title });
  }
  // renomeadas / reordenadas
  for (const [id, aEntry] of afterSections) {
    const bEntry = beforeSections.get(id);
    if (!bEntry) continue;
    if (bEntry.item.title !== aEntry.item.title) {
      sectionsRenamed.push({ id, from: bEntry.item.title, to: aEntry.item.title });
    }
    if (bEntry.idx !== aEntry.idx) {
      sectionsReordered.push({ id, fromIndex: bEntry.idx, toIndex: aEntry.idx });
    }

    // blocos
    const beforeBlocks = byId(bEntry.item.blocks);
    const afterBlocks = byId(aEntry.item.blocks);
    for (const [bid, { item }] of beforeBlocks) {
      if (!afterBlocks.has(bid)) {
        blocksRemoved.push({ id: bid, sectionId: id, kind: item.kind });
      }
    }
    for (const [bid, { item }] of afterBlocks) {
      if (!beforeBlocks.has(bid)) {
        blocksAdded.push({ id: bid, sectionId: id, kind: item.kind });
      }
    }
    for (const [bid, aBlk] of afterBlocks) {
      const bBlk = beforeBlocks.get(bid);
      if (!bBlk) continue;
      const fields = blockChanged(bBlk.item, aBlk.item);
      if (fields.length > 0) {
        blocksChanged.push({ id: bid, sectionId: id, fields });
      }
      if (bBlk.idx !== aBlk.idx) {
        blocksReordered.push({ id: bid, sectionId: id, fromIndex: bBlk.idx, toIndex: aBlk.idx });
      }
    }

    void sectionEqual; // reservado para futura extensão de description-diff
  }

  // variáveis
  const beforeVars = byId(before.variables);
  const afterVars = byId(after.variables);
  for (const [id, { item }] of beforeVars) {
    if (!afterVars.has(id)) variablesRemoved.push({ id, key: item.key });
  }
  for (const [id, { item }] of afterVars) {
    if (!beforeVars.has(id)) variablesAdded.push({ id, key: item.key });
  }
  for (const [id, aVar] of afterVars) {
    const bVar = beforeVars.get(id);
    if (!bVar) continue;
    const fields = variableChanged(bVar.item, aVar.item);
    if (fields.length > 0) {
      variablesChanged.push({ id, key: aVar.item.key, fields });
    }
  }

  // metadados
  if (before.name !== after.name) {
    metadataChanges.push({ field: "name", from: before.name, to: after.name });
  }
  if (before.description !== after.description) {
    metadataChanges.push({ field: "description", from: before.description, to: after.description });
  }
  if (before.specialty !== after.specialty) {
    metadataChanges.push({ field: "specialty", from: before.specialty, to: after.specialty });
  }

  const statusChanged = before.status !== after.status
    ? { from: before.status, to: after.status }
    : null;

  // ordenação estável por id / field
  sectionsAdded.sort((a, b) => a.id.localeCompare(b.id));
  sectionsRemoved.sort((a, b) => a.id.localeCompare(b.id));
  sectionsRenamed.sort((a, b) => a.id.localeCompare(b.id));
  sectionsReordered.sort((a, b) => a.id.localeCompare(b.id));
  blocksAdded.sort((a, b) => a.id.localeCompare(b.id));
  blocksRemoved.sort((a, b) => a.id.localeCompare(b.id));
  blocksChanged.sort((a, b) => a.id.localeCompare(b.id));
  blocksReordered.sort((a, b) => a.id.localeCompare(b.id));
  variablesAdded.sort((a, b) => a.id.localeCompare(b.id));
  variablesRemoved.sort((a, b) => a.id.localeCompare(b.id));
  variablesChanged.sort((a, b) => a.id.localeCompare(b.id));
  metadataChanges.sort((a, b) => a.field.localeCompare(b.field));

  const totals =
    sectionsAdded.length +
    sectionsRemoved.length +
    sectionsRenamed.length +
    sectionsReordered.length +
    blocksAdded.length +
    blocksRemoved.length +
    blocksChanged.length +
    blocksReordered.length +
    variablesAdded.length +
    variablesRemoved.length +
    variablesChanged.length +
    metadataChanges.length +
    (statusChanged ? 1 : 0);

  const parts: string[] = [];
  if (sectionsAdded.length) parts.push(`${sectionsAdded.length} seção(ões) adicionada(s)`);
  if (sectionsRemoved.length) parts.push(`${sectionsRemoved.length} seção(ões) removida(s)`);
  if (sectionsRenamed.length) parts.push(`${sectionsRenamed.length} seção(ões) renomeada(s)`);
  if (sectionsReordered.length) parts.push(`${sectionsReordered.length} seção(ões) reordenada(s)`);
  if (blocksAdded.length) parts.push(`${blocksAdded.length} bloco(s) adicionado(s)`);
  if (blocksRemoved.length) parts.push(`${blocksRemoved.length} bloco(s) removido(s)`);
  if (blocksChanged.length) parts.push(`${blocksChanged.length} bloco(s) alterado(s)`);
  if (blocksReordered.length) parts.push(`${blocksReordered.length} bloco(s) reordenado(s)`);
  if (variablesAdded.length) parts.push(`${variablesAdded.length} variável(is) adicionada(s)`);
  if (variablesRemoved.length) parts.push(`${variablesRemoved.length} variável(is) removida(s)`);
  if (variablesChanged.length) parts.push(`${variablesChanged.length} variável(is) alterada(s)`);
  if (metadataChanges.length) parts.push(`${metadataChanges.length} metadado(s) alterado(s)`);
  if (statusChanged) parts.push(`status: ${statusChanged.from} → ${statusChanged.to}`);
  const summary = parts.length === 0 ? "Sem alterações." : parts.join("; ") + ".";

  return Object.freeze({
    sectionsAdded: Object.freeze(sectionsAdded),
    sectionsRemoved: Object.freeze(sectionsRemoved),
    sectionsRenamed: Object.freeze(sectionsRenamed),
    sectionsReordered: Object.freeze(sectionsReordered),
    blocksAdded: Object.freeze(blocksAdded),
    blocksRemoved: Object.freeze(blocksRemoved),
    blocksChanged: Object.freeze(blocksChanged),
    blocksReordered: Object.freeze(blocksReordered),
    variablesAdded: Object.freeze(variablesAdded),
    variablesRemoved: Object.freeze(variablesRemoved),
    variablesChanged: Object.freeze(variablesChanged),
    metadataChanges: Object.freeze(metadataChanges),
    statusChanged: statusChanged ? Object.freeze(statusChanged) : null,
    summary,
    hasChanges: totals > 0,
  });
}
