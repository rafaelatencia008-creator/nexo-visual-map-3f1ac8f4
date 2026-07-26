/**
 * LV-18.1 — Store observável em memória de Modelos de Laudo.
 *
 * Regras:
 *  - Estado somente em memória. Sem storage persistente, sem rede, sem IA.
 *  - Snapshot referencialmente estável: `getSnapshot()` retorna a MESMA
 *    referência enquanto não houver mudança real. No-ops não emitem.
 *  - Clonagem profunda em toda entrada e saída pública — nenhuma referência
 *    mutável cruza a fronteira da store.
 *  - IDs internos únicos; posições normalizadas 0..N-1 automaticamente.
 *  - Modelos arquivados bloqueiam operações comuns (exceto reativar).
 */

import {
  buildInitialTemplates,
  INITIAL_TEMPLATE_COUNT,
} from "./report-template-fixtures";
import {
  appendTemplateHistoryEvent,
  resetTemplateHistoryStore,
  type ReportTemplateHistoryAction,
} from "./report-template-history-store";
import {
  createTemplateVersion,
  resetTemplateVersionStore,
} from "./report-template-version-store";
import { validateReportTemplate } from "./report-template-validation";
import {
  ReportTemplateError,
  type AddBlockInput,
  type AddSectionInput,
  type AddVariableInput,
  type CreateTemplateInput,
  type ReportTemplate,
  type ReportTemplateBlock,
  type ReportTemplateBlockId,
  type ReportTemplateId,
  type ReportTemplateSection,
  type ReportTemplateSectionId,
  type ReportTemplateSummary,
  type ReportTemplateVariable,
  type ReportTemplateVariableId,
  type UpdateBlockInput,
  type UpdateSectionInput,
  type UpdateTemplateMetadataInput,
  type UpdateVariableInput,
} from "./report-template-types";

// ---------- IDs / relógio ----------

let idCounter = 5000;
function nextId(prefix: "rtpl" | "rsec" | "rblk" | "rvar"): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}
function resetIdCounter(): void {
  idCounter = 5000;
}

let clockIso = "2026-07-25T12:00:00.000Z";
function now(): string {
  return clockIso;
}
/** Avança o relógio determinístico interno (útil em testes). */
export function advanceTemplateClockSeconds(seconds: number): string {
  clockIso = new Date(new Date(clockIso).getTime() + seconds * 1000).toISOString();
  return clockIso;
}
/** Reinicia o relógio determinístico. */
export function resetTemplateClock(iso = "2026-07-25T12:00:00.000Z"): void {
  clockIso = iso;
}

// ---------- Snapshot ----------

export interface ReportTemplateSnapshot {
  readonly templates: readonly ReportTemplate[];
  readonly version: number;
}

// Estado interno mutável — nunca escapa da store.
let internalTemplates: ReportTemplate[] = [];
let currentSnapshot: ReportTemplateSnapshot = { templates: [], version: 0 };
let listeners: Array<() => void> = [];
let mutationVersion = 0;

/** Clonagem profunda determinística — imune a Date/Map, pois só há POJOs. */
function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function freezeTemplate(t: ReportTemplate): ReportTemplate {
  for (const sec of t.sections) {
    for (const blk of sec.blocks) {
      Object.freeze(blk.variableRefs);
      Object.freeze(blk);
    }
    Object.freeze(sec.blocks);
    Object.freeze(sec);
  }
  Object.freeze(t.sections);
  for (const v of t.variables) Object.freeze(v);
  Object.freeze(t.variables);
  return Object.freeze(t);
}

function rebuildSnapshot(): void {
  const frozenList = internalTemplates.map((t) => freezeTemplate(deepClone(t)));
  Object.freeze(frozenList);
  currentSnapshot = Object.freeze({
    templates: frozenList,
    version: mutationVersion,
  });
}

function emit(): void {
  for (const l of listeners.slice()) {
    try {
      l();
    } catch {
      // isolamos falhas de listeners — a store não pode ficar inconsistente.
    }
  }
}

function commit(): void {
  mutationVersion += 1;
  rebuildSnapshot();
  emit();
}

// ---------- Inicialização ----------

function seedInitial(): void {
  resetIdCounter();
  resetTemplateClock();
  internalTemplates = buildInitialTemplates().map((t) => deepClone(t)) as ReportTemplate[];
  mutationVersion = 1;
  rebuildSnapshot();
}
seedInitial();

// ---------- API pública ----------

export function getSnapshot(): ReportTemplateSnapshot {
  return currentSnapshot;
}

export function subscribe(listener: () => void): () => void {
  if (typeof listener !== "function") {
    throw new ReportTemplateError("template_not_found", "Listener inválido.");
  }
  listeners.push(listener);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function listTemplates(): readonly ReportTemplateSummary[] {
  return currentSnapshot.templates.map(
    (t): ReportTemplateSummary => ({
      id: t.id,
      name: t.name,
      specialty: t.specialty,
      status: t.status,
      sectionsCount: t.sections.length,
      variablesCount: t.variables.length,
      updatedAt: t.updatedAt,
    }),
  );
}

export function getTemplate(id: ReportTemplateId): ReportTemplate | null {
  return currentSnapshot.templates.find((t) => t.id === id) ?? null;
}

function findInternalIndex(id: ReportTemplateId): number {
  return internalTemplates.findIndex((t) => t.id === id);
}

function requireInternal(id: ReportTemplateId): { idx: number; t: ReportTemplate } {
  const idx = findInternalIndex(id);
  if (idx === -1) {
    throw new ReportTemplateError("template_not_found", `Modelo ${id} não encontrado.`);
  }
  return { idx, t: internalTemplates[idx]! };
}

function requireMutable(id: ReportTemplateId): { idx: number; t: ReportTemplate } {
  const found = requireInternal(id);
  if (found.t.status === "arquivado") {
    throw new ReportTemplateError(
      "template_archived",
      `Modelo ${id} está arquivado e não pode ser editado.`,
    );
  }
  return found;
}

function replaceInternal(idx: number, next: ReportTemplate): void {
  internalTemplates = internalTemplates.map((t, i) => (i === idx ? next : t));
}

function normalizeSections(sections: readonly ReportTemplateSection[]): ReportTemplateSection[] {
  return sections.map((s, i) => ({
    ...s,
    position: i,
    blocks: s.blocks.map((b, j) => ({ ...b, position: j })),
  }));
}

function validateUniqueSectionIds(sections: readonly ReportTemplateSection[]): void {
  const seen = new Set<string>();
  for (const s of sections) {
    if (seen.has(s.id)) {
      throw new ReportTemplateError("duplicate_id", `ID de seção duplicado: ${s.id}`);
    }
    seen.add(s.id);
    const bSeen = new Set<string>();
    for (const b of s.blocks) {
      if (bSeen.has(b.id)) {
        throw new ReportTemplateError("duplicate_id", `ID de bloco duplicado: ${b.id}`);
      }
      bSeen.add(b.id);
    }
  }
}

// ---------- Modelos ----------

export function createTemplate(input: CreateTemplateInput): ReportTemplate {
  const name = (input.name ?? "").trim();
  if (name.length === 0) {
    throw new ReportTemplateError("empty_name", "Nome do modelo é obrigatório.");
  }
  const id = nextId("rtpl") as ReportTemplateId;
  const iso = now();
  const next: ReportTemplate = {
    id,
    name,
    description: input.description?.trim() ?? "",
    specialty: input.specialty ?? "geral",
    status: "rascunho",
    createdAt: iso,
    updatedAt: iso,
    createdBy: "usr-demo",
    sections: [],
    variables: [],
    duplicatedFrom: null,
  };
  internalTemplates = [...internalTemplates, next];
  commit();
  return getTemplate(id)!;
}

export function updateTemplateMetadata(
  id: ReportTemplateId,
  input: UpdateTemplateMetadataInput,
): ReportTemplate {
  const { idx, t } = requireMutable(id);
  const nextName = input.name !== undefined ? input.name.trim() : t.name;
  if (nextName.length === 0) {
    throw new ReportTemplateError("empty_name", "Nome não pode ficar vazio.");
  }
  const changed =
    nextName !== t.name ||
    (input.description !== undefined && input.description.trim() !== t.description) ||
    (input.specialty !== undefined && input.specialty !== t.specialty);
  if (!changed) return getTemplate(id)!;
  const next: ReportTemplate = {
    ...t,
    name: nextName,
    description: input.description !== undefined ? input.description.trim() : t.description,
    specialty: input.specialty ?? t.specialty,
    updatedAt: now(),
  };
  replaceInternal(idx, next);
  commit();
  return getTemplate(id)!;
}

export function duplicateTemplate(id: ReportTemplateId): ReportTemplate {
  const { t } = requireInternal(id);
  const source = deepClone(t);
  const newId = nextId("rtpl") as ReportTemplateId;
  const iso = now();
  // Regenera IDs de seções, blocos e variáveis — evita colisão.
  const sections = source.sections.map((s) => ({
    ...s,
    id: nextId("rsec") as ReportTemplateSectionId,
    blocks: s.blocks.map((b) => ({
      ...b,
      id: nextId("rblk") as ReportTemplateBlockId,
      variableRefs: [...b.variableRefs],
    })),
  }));
  const variables = source.variables.map((v) => ({
    ...v,
    id: nextId("rvar") as ReportTemplateVariableId,
  }));
  const dup: ReportTemplate = {
    id: newId,
    name: `${source.name} (cópia)`,
    description: source.description,
    specialty: source.specialty,
    status: "rascunho",
    createdAt: iso,
    updatedAt: iso,
    createdBy: "usr-demo",
    sections: normalizeSections(sections),
    variables,
    duplicatedFrom: t.id,
  };
  internalTemplates = [...internalTemplates, dup];
  commit();
  return getTemplate(newId)!;
}

export function archiveTemplate(id: ReportTemplateId): ReportTemplate {
  const { idx, t } = requireInternal(id);
  if (t.status === "arquivado") return getTemplate(id)!;
  replaceInternal(idx, { ...t, status: "arquivado", updatedAt: now() });
  commit();
  return getTemplate(id)!;
}

export function reactivateTemplate(id: ReportTemplateId): ReportTemplate {
  const { idx, t } = requireInternal(id);
  if (t.status !== "arquivado") return getTemplate(id)!;
  replaceInternal(idx, { ...t, status: "rascunho", updatedAt: now() });
  commit();
  return getTemplate(id)!;
}

// ---------- Seções ----------

export function addSection(
  templateId: ReportTemplateId,
  input: AddSectionInput,
): ReportTemplateSection {
  const { idx, t } = requireMutable(templateId);
  const title = (input.title ?? "").trim();
  if (title.length === 0) {
    throw new ReportTemplateError("empty_name", "Título da seção é obrigatório.");
  }
  if (input.position !== undefined && input.position < 0) {
    throw new ReportTemplateError("invalid_position", "Posição não pode ser negativa.");
  }
  const newSection: ReportTemplateSection = {
    id: nextId("rsec") as ReportTemplateSectionId,
    title,
    description: input.description?.trim() ?? "",
    position: 0,
    blocks: [],
  };
  const insertAt = Math.min(input.position ?? t.sections.length, t.sections.length);
  const arr = [...t.sections];
  arr.splice(insertAt, 0, newSection);
  const next: ReportTemplate = {
    ...t,
    sections: normalizeSections(arr),
    updatedAt: now(),
  };
  validateUniqueSectionIds(next.sections);
  replaceInternal(idx, next);
  commit();
  return getTemplate(templateId)!.sections.find((s) => s.id === newSection.id)!;
}

export function updateSection(
  templateId: ReportTemplateId,
  sectionId: ReportTemplateSectionId,
  input: UpdateSectionInput,
): ReportTemplateSection {
  const { idx, t } = requireMutable(templateId);
  const sIdx = t.sections.findIndex((s) => s.id === sectionId);
  if (sIdx === -1) throw new ReportTemplateError("section_not_found", "Seção não encontrada.");
  const cur = t.sections[sIdx]!;
  const nextTitle = input.title !== undefined ? input.title.trim() : cur.title;
  if (nextTitle.length === 0) {
    throw new ReportTemplateError("empty_name", "Título da seção é obrigatório.");
  }
  const changed =
    nextTitle !== cur.title ||
    (input.description !== undefined && input.description.trim() !== cur.description);
  if (!changed) return getTemplate(templateId)!.sections[sIdx]!;
  const nextSection: ReportTemplateSection = {
    ...cur,
    title: nextTitle,
    description: input.description !== undefined ? input.description.trim() : cur.description,
  };
  const sections = t.sections.map((s, i) => (i === sIdx ? nextSection : s));
  replaceInternal(idx, {
    ...t,
    sections: normalizeSections(sections),
    updatedAt: now(),
  });
  commit();
  return getTemplate(templateId)!.sections[sIdx]!;
}

export function removeSection(
  templateId: ReportTemplateId,
  sectionId: ReportTemplateSectionId,
): void {
  const { idx, t } = requireMutable(templateId);
  const filtered = t.sections.filter((s) => s.id !== sectionId);
  if (filtered.length === t.sections.length) {
    throw new ReportTemplateError("section_not_found", "Seção não encontrada.");
  }
  replaceInternal(idx, {
    ...t,
    sections: normalizeSections(filtered),
    updatedAt: now(),
  });
  commit();
}

export function moveSection(
  templateId: ReportTemplateId,
  sectionId: ReportTemplateSectionId,
  direction: "up" | "down",
): void {
  const { idx, t } = requireMutable(templateId);
  const sIdx = t.sections.findIndex((s) => s.id === sectionId);
  if (sIdx === -1) throw new ReportTemplateError("section_not_found", "Seção não encontrada.");
  const target = direction === "up" ? sIdx - 1 : sIdx + 1;
  if (target < 0 || target >= t.sections.length) return; // no-op silencioso
  const arr = [...t.sections];
  const [it] = arr.splice(sIdx, 1);
  arr.splice(target, 0, it!);
  replaceInternal(idx, {
    ...t,
    sections: normalizeSections(arr),
    updatedAt: now(),
  });
  commit();
}

// ---------- Blocos ----------

export function addBlock(
  templateId: ReportTemplateId,
  sectionId: ReportTemplateSectionId,
  input: AddBlockInput,
): ReportTemplateBlock {
  const { idx, t } = requireMutable(templateId);
  const sIdx = t.sections.findIndex((s) => s.id === sectionId);
  if (sIdx === -1) throw new ReportTemplateError("section_not_found", "Seção não encontrada.");
  if (input.position !== undefined && input.position < 0) {
    throw new ReportTemplateError("invalid_position", "Posição não pode ser negativa.");
  }
  const section = t.sections[sIdx]!;
  const newBlock: ReportTemplateBlock = {
    id: nextId("rblk") as ReportTemplateBlockId,
    kind: input.kind,
    title: input.title?.trim() ?? "",
    content: input.content ?? "",
    position: 0,
    variableRefs: [...(input.variableRefs ?? [])],
  };
  const arr = [...section.blocks];
  const insertAt = Math.min(input.position ?? arr.length, arr.length);
  arr.splice(insertAt, 0, newBlock);
  const nextSection: ReportTemplateSection = { ...section, blocks: arr };
  const sections = t.sections.map((s, i) => (i === sIdx ? nextSection : s));
  replaceInternal(idx, {
    ...t,
    sections: normalizeSections(sections),
    updatedAt: now(),
  });
  validateUniqueSectionIds(internalTemplates[idx]!.sections);
  commit();
  const savedSection = getTemplate(templateId)!.sections[sIdx]!;
  return savedSection.blocks.find((b) => b.id === newBlock.id)!;
}

export function updateBlock(
  templateId: ReportTemplateId,
  sectionId: ReportTemplateSectionId,
  blockId: ReportTemplateBlockId,
  input: UpdateBlockInput,
): ReportTemplateBlock {
  const { idx, t } = requireMutable(templateId);
  const sIdx = t.sections.findIndex((s) => s.id === sectionId);
  if (sIdx === -1) throw new ReportTemplateError("section_not_found", "Seção não encontrada.");
  const section = t.sections[sIdx]!;
  const bIdx = section.blocks.findIndex((b) => b.id === blockId);
  if (bIdx === -1) throw new ReportTemplateError("block_not_found", "Bloco não encontrado.");
  const cur = section.blocks[bIdx]!;
  const nextBlock: ReportTemplateBlock = {
    ...cur,
    kind: input.kind ?? cur.kind,
    title: input.title !== undefined ? input.title.trim() : cur.title,
    content: input.content !== undefined ? input.content : cur.content,
    variableRefs: input.variableRefs !== undefined ? [...input.variableRefs] : [...cur.variableRefs],
  };
  const same =
    nextBlock.kind === cur.kind &&
    nextBlock.title === cur.title &&
    nextBlock.content === cur.content &&
    nextBlock.variableRefs.length === cur.variableRefs.length &&
    nextBlock.variableRefs.every((r, i) => r === cur.variableRefs[i]);
  if (same) return getTemplate(templateId)!.sections[sIdx]!.blocks[bIdx]!;
  const blocks = section.blocks.map((b, i) => (i === bIdx ? nextBlock : b));
  const nextSection: ReportTemplateSection = { ...section, blocks };
  const sections = t.sections.map((s, i) => (i === sIdx ? nextSection : s));
  replaceInternal(idx, {
    ...t,
    sections: normalizeSections(sections),
    updatedAt: now(),
  });
  commit();
  return getTemplate(templateId)!.sections[sIdx]!.blocks[bIdx]!;
}

export function removeBlock(
  templateId: ReportTemplateId,
  sectionId: ReportTemplateSectionId,
  blockId: ReportTemplateBlockId,
): void {
  const { idx, t } = requireMutable(templateId);
  const sIdx = t.sections.findIndex((s) => s.id === sectionId);
  if (sIdx === -1) throw new ReportTemplateError("section_not_found", "Seção não encontrada.");
  const section = t.sections[sIdx]!;
  const filtered = section.blocks.filter((b) => b.id !== blockId);
  if (filtered.length === section.blocks.length) {
    throw new ReportTemplateError("block_not_found", "Bloco não encontrado.");
  }
  const sections = t.sections.map((s, i) => (i === sIdx ? { ...s, blocks: filtered } : s));
  replaceInternal(idx, {
    ...t,
    sections: normalizeSections(sections),
    updatedAt: now(),
  });
  commit();
}

export function moveBlock(
  templateId: ReportTemplateId,
  sectionId: ReportTemplateSectionId,
  blockId: ReportTemplateBlockId,
  direction: "up" | "down",
): void {
  const { idx, t } = requireMutable(templateId);
  const sIdx = t.sections.findIndex((s) => s.id === sectionId);
  if (sIdx === -1) throw new ReportTemplateError("section_not_found", "Seção não encontrada.");
  const section = t.sections[sIdx]!;
  const bIdx = section.blocks.findIndex((b) => b.id === blockId);
  if (bIdx === -1) throw new ReportTemplateError("block_not_found", "Bloco não encontrado.");
  const target = direction === "up" ? bIdx - 1 : bIdx + 1;
  if (target < 0 || target >= section.blocks.length) return;
  const arr = [...section.blocks];
  const [it] = arr.splice(bIdx, 1);
  arr.splice(target, 0, it!);
  const sections = t.sections.map((s, i) => (i === sIdx ? { ...s, blocks: arr } : s));
  replaceInternal(idx, {
    ...t,
    sections: normalizeSections(sections),
    updatedAt: now(),
  });
  commit();
}

// ---------- Variáveis ----------

const KEY_RE = /^[a-z][a-z0-9_]*$/;

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

export function addVariable(
  templateId: ReportTemplateId,
  input: AddVariableInput,
): ReportTemplateVariable {
  const { idx, t } = requireMutable(templateId);
  const key = normalizeKey(input.key ?? "");
  if (key.length === 0) {
    throw new ReportTemplateError("empty_variable_key", "Chave da variável é obrigatória.");
  }
  if (!KEY_RE.test(key)) {
    throw new ReportTemplateError(
      "empty_variable_key",
      "Chave inválida — use letras minúsculas, dígitos e '_'.",
    );
  }
  if (t.variables.some((v) => v.key === key)) {
    throw new ReportTemplateError(
      "duplicate_variable_key",
      `Chave de variável duplicada: ${key}`,
    );
  }
  const nv: ReportTemplateVariable = {
    id: nextId("rvar") as ReportTemplateVariableId,
    key,
    label: input.label?.trim() ?? key,
    kind: input.kind ?? "texto",
    required: input.required ?? false,
    defaultValue: input.defaultValue ?? "",
  };
  replaceInternal(idx, {
    ...t,
    variables: [...t.variables, nv],
    updatedAt: now(),
  });
  commit();
  return getTemplate(templateId)!.variables.find((v) => v.id === nv.id)!;
}

export function updateVariable(
  templateId: ReportTemplateId,
  variableId: ReportTemplateVariableId,
  input: UpdateVariableInput,
): ReportTemplateVariable {
  const { idx, t } = requireMutable(templateId);
  const vIdx = t.variables.findIndex((v) => v.id === variableId);
  if (vIdx === -1) throw new ReportTemplateError("variable_not_found", "Variável não encontrada.");
  const cur = t.variables[vIdx]!;
  const next: ReportTemplateVariable = {
    ...cur,
    label: input.label !== undefined ? input.label.trim() : cur.label,
    kind: input.kind ?? cur.kind,
    required: input.required ?? cur.required,
    defaultValue: input.defaultValue !== undefined ? input.defaultValue : cur.defaultValue,
  };
  const same =
    next.label === cur.label &&
    next.kind === cur.kind &&
    next.required === cur.required &&
    next.defaultValue === cur.defaultValue;
  if (same) return getTemplate(templateId)!.variables[vIdx]!;
  const vars = t.variables.map((v, i) => (i === vIdx ? next : v));
  replaceInternal(idx, { ...t, variables: vars, updatedAt: now() });
  commit();
  return getTemplate(templateId)!.variables[vIdx]!;
}

export function isVariableInUse(
  templateId: ReportTemplateId,
  variableId: ReportTemplateVariableId,
): boolean {
  const t = getTemplate(templateId);
  if (!t) return false;
  const v = t.variables.find((x) => x.id === variableId);
  if (!v) return false;
  return t.sections.some((s) =>
    s.blocks.some(
      (b) => b.variableRefs.includes(v.key) || b.content.includes(`{{${v.key}}}`),
    ),
  );
}

export function removeVariable(
  templateId: ReportTemplateId,
  variableId: ReportTemplateVariableId,
  options?: { readonly force?: boolean },
): void {
  const { idx, t } = requireMutable(templateId);
  const vIdx = t.variables.findIndex((v) => v.id === variableId);
  if (vIdx === -1) throw new ReportTemplateError("variable_not_found", "Variável não encontrada.");
  if (!options?.force && isVariableInUse(templateId, variableId)) {
    throw new ReportTemplateError(
      "variable_in_use",
      "Variável está referenciada por blocos — use force=true para remover mesmo assim.",
    );
  }
  replaceInternal(idx, {
    ...t,
    variables: t.variables.filter((_, i) => i !== vIdx),
    updatedAt: now(),
  });
  commit();
}

// ---------- Reset ----------

/**
 * Restaura o estado inicial exatamente como as fixtures determinísticas.
 * Emite UMA única notificação para todos os assinantes.
 */
export function resetReportTemplateStore(): void {
  seedInitial();
  // seedInitial redefine mutationVersion=1; forçamos uma emissão única.
  emit();
}

/** Total esperado inicial (para asserções externas). */
export function initialTemplateCount(): number {
  return INITIAL_TEMPLATE_COUNT;
}
