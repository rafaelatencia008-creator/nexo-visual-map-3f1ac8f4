/**
 * LV-18.6 — Implementações de `ReportTemplateRepository`.
 *
 * - `createInMemoryReportTemplateRepository()`: adaptador de produção que
 *   delega para as stores globais existentes (fonte única de verdade).
 * - `createIsolatedReportTemplateRepository()`: implementação fake em
 *   memória, isolada entre instâncias, para testes de contrato e de
 *   casos de uso sem depender do singleton global.
 *
 * 100% frontend/mock. Sem persistência, backend, Supabase ou rede.
 */

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
import type {
  AppendHistoryInput,
  ReportTemplateHistoryEvent,
  ReportTemplateHistorySnapshot,
  ReportTemplateHistoryAction,
  ReportTemplateHistoryResult,
} from "./report-template-history-store";
import type {
  ReportTemplateSnapshot,
} from "./report-template-store";
import type {
  ReportTemplateVersion,
  ReportTemplateVersionSnapshot,
} from "./report-template-version-store";
import type {
  ReportTemplateEntityIdIndex,
  ReportTemplateListFilters,
  ReportTemplateRepository,
} from "./report-template-repository";

// ---------- Adaptador de produção (delega para stores globais) ----------

import {
  addBlock,
  addSection,
  addVariable,
  archiveTemplate,
  bulkInsertImportedTemplates,
  createManualTemplateVersion,
  createTemplate,
  duplicateTemplate,
  generateImportedBlockId,
  generateImportedSectionId,
  generateImportedTemplateId,
  generateImportedVariableId,
  getExistingReportTemplateIds,
  getSnapshot,
  getTemplate,
  isVariableInUse,
  listTemplates,
  moveBlock,
  moveSection,
  publishTemplate,
  reactivateTemplate,
  removeBlock,
  removeSection,
  removeVariable,
  resetReportTemplateStore,
  returnTemplateToDraft,
  subscribe,
  updateBlock,
  updateSection,
  updateTemplateMetadata,
  updateVariable,
} from "./report-template-store";
import {
  appendTemplateHistoryEvent,
  getTemplateHistorySnapshot,
  listTemplateHistory,
  subscribeTemplateHistory,
} from "./report-template-history-store";
import {
  createTemplateVersion,
  getTemplateVersion,
  getTemplateVersionsSnapshot,
  listTemplateVersions,
  subscribeTemplateVersions,
} from "./report-template-version-store";

export function createInMemoryReportTemplateRepository(): ReportTemplateRepository {
  return Object.freeze({
    getSnapshot,
    subscribe,
    getById: (id) => getTemplate(id) ?? undefined,
    list: (filters) => {
      const summaries = listTemplates();
      if (!filters) return summaries;
      return summaries.filter((s) => {
        if (filters.status && s.status !== filters.status) return false;
        if (filters.specialty && s.specialty !== filters.specialty) return false;
        return true;
      });
    },
    create: createTemplate,
    updateMetadata: updateTemplateMetadata,
    duplicate: duplicateTemplate,
    archive: archiveTemplate,
    reactivate: reactivateTemplate,
    publish: publishTemplate,
    returnToDraft: returnTemplateToDraft,
    addSection,
    updateSection,
    removeSection,
    moveSection,
    addBlock,
    updateBlock,
    removeBlock,
    moveBlock,
    addVariable,
    updateVariable,
    removeVariable,
    isVariableInUse,
    getExistingIds: (): ReportTemplateEntityIdIndex => {
      const existing = getExistingReportTemplateIds();
      return {
        templateIds: new Set(existing.templates) as ReadonlySet<string>,
        sectionIds: new Set(existing.sections) as ReadonlySet<string>,
        blockIds: new Set(existing.blocks) as ReadonlySet<string>,
        variableIds: new Set(existing.variables) as ReadonlySet<string>,
      };
    },
    bulkInsertImported: bulkInsertImportedTemplates,
    generateImportedTemplateId,
    generateImportedSectionId,
    generateImportedBlockId,
    generateImportedVariableId,
    listVersions: listTemplateVersions,
    getVersion: (templateId, versionId) => {
      const v = getTemplateVersion(versionId);
      if (!v || v.templateId !== templateId) return undefined;
      return v;
    },
    getVersionSnapshot: getTemplateVersionsSnapshot,
    subscribeVersions: subscribeTemplateVersions,
    createManualVersion: createManualTemplateVersion,
    listHistory: listTemplateHistory,
    getHistorySnapshot: getTemplateHistorySnapshot,
    subscribeHistory: subscribeTemplateHistory,
    appendHistoryEvent: appendTemplateHistoryEvent,
    reset: resetReportTemplateStore,
  } as ReportTemplateRepository);
}

// ---------- Fake isolado (estado próprio, determinístico) ----------

const DEFAULT_ACTOR = "usr-demo";
const FIXED_ISO = "2026-07-25T12:00:00.000Z";

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function deepFreeze<T>(v: T): T {
  if (v === null || typeof v !== "object") return v;
  if (Object.isFrozen(v)) return v;
  Object.freeze(v);
  for (const k of Object.keys(v as Record<string, unknown>)) {
    deepFreeze((v as Record<string, unknown>)[k]);
  }
  return v;
}

export function createIsolatedReportTemplateRepository(): ReportTemplateRepository {
  let templates: ReportTemplate[] = [];
  let versions: ReportTemplateVersion[] = [];
  let history: ReportTemplateHistoryEvent[] = [];

  let templateIdCounter = 1000;
  let sectionIdCounter = 2000;
  let blockIdCounter = 3000;
  let variableIdCounter = 4000;
  let versionIdCounter = 7000;
  let historyIdCounter = 9000;
  let templateMutationVersion = 0;
  let versionMutationVersion = 0;
  let historyMutationVersion = 0;
  let clock = new Date(FIXED_ISO).getTime();

  const templateListeners = new Set<() => void>();
  const versionListeners = new Set<() => void>();
  const historyListeners = new Set<() => void>();

  const nextTemplateId = (): ReportTemplateId => {
    templateIdCounter += 1;
    return `rtpl-${templateIdCounter}` as ReportTemplateId;
  };
  const nextSectionId = (): ReportTemplateSectionId => {
    sectionIdCounter += 1;
    return `rsec-${sectionIdCounter}` as ReportTemplateSectionId;
  };
  const nextBlockId = (): ReportTemplateBlockId => {
    blockIdCounter += 1;
    return `rblk-${blockIdCounter}` as ReportTemplateBlockId;
  };
  const nextVariableId = (): ReportTemplateVariableId => {
    variableIdCounter += 1;
    return `rvar-${variableIdCounter}` as ReportTemplateVariableId;
  };
  const nextVersionId = (): string => {
    versionIdCounter += 1;
    return `rtver-${versionIdCounter}`;
  };
  const nextHistoryId = (): string => {
    historyIdCounter += 1;
    return `rthist-${historyIdCounter}`;
  };
  const nextClock = (): string => {
    clock += 1000;
    return new Date(clock).toISOString();
  };

  const emitTemplates = () => {
    for (const l of Array.from(templateListeners)) {
      try {
        l();
      } catch {
        /* isolado */
      }
    }
  };
  const emitVersions = () => {
    for (const l of Array.from(versionListeners)) {
      try {
        l();
      } catch {
        /* isolado */
      }
    }
  };
  const emitHistory = () => {
    for (const l of Array.from(historyListeners)) {
      try {
        l();
      } catch {
        /* isolado */
      }
    }
  };

  const buildTemplateSnapshot = (): ReportTemplateSnapshot => {
    templateMutationVersion += 1;
    return deepFreeze({
      templates: templates.map((t) => deepFreeze(deepClone(t))),
      version: templateMutationVersion,
    }) as ReportTemplateSnapshot;
  };
  const buildVersionSnapshot = (): ReportTemplateVersionSnapshot => {
    versionMutationVersion += 1;
    return deepFreeze({
      versions: versions.map((v) => deepFreeze(deepClone(v))),
      version: versionMutationVersion,
    }) as ReportTemplateVersionSnapshot;
  };
  const buildHistorySnapshot = (): ReportTemplateHistorySnapshot => {
    historyMutationVersion += 1;
    return deepFreeze({
      events: history.map((e) => deepFreeze(deepClone(e))),
      version: historyMutationVersion,
    }) as ReportTemplateHistorySnapshot;
  };

  let templateSnapshot = buildTemplateSnapshot();
  let versionSnapshot = buildVersionSnapshot();
  let historySnapshot = buildHistorySnapshot();

  const commitTemplates = () => {
    templateSnapshot = buildTemplateSnapshot();
    emitTemplates();
  };
  const commitVersions = () => {
    versionSnapshot = buildVersionSnapshot();
    emitVersions();
  };
  const commitHistory = () => {
    historySnapshot = buildHistorySnapshot();
    emitHistory();
  };

  const requireTemplate = (id: ReportTemplateId): ReportTemplate => {
    const t = templates.find((x) => x.id === id);
    if (!t) {
      throw new ReportTemplateError("template_not_found", `Modelo ${id} não encontrado.`);
    }
    return t;
  };

  const requireMutable = (id: ReportTemplateId, operation: string): number => {
    const idx = templates.findIndex((t) => t.id === id);
    if (idx === -1) {
      throw new ReportTemplateError("template_not_found", `Modelo ${id} não encontrado.`);
    }
    const status = templates[idx]!.status;
    if (status === "arquivado") {
      throw new ReportTemplateError(
        "template_archived",
        `Modelo ${id} está arquivado e não pode ser editado.`,
        { operation },
      );
    }
    if (status === "publicado") {
      throw new ReportTemplateError(
        "template_published",
        `Modelo ${id} está publicado — retorne para rascunho antes de editar.`,
        { operation },
      );
    }
    return idx;
  };

  const replaceTemplate = (idx: number, next: ReportTemplate): void => {
    templates = templates.map((t, i) => (i === idx ? next : t));
  };

  const normalizePositions = <T extends { position: number }>(arr: readonly T[]): T[] => {
    return arr.map((item, i) => ({ ...item, position: i }));
  };

  const appendHistory = (
    templateId: ReportTemplateId,
    action: ReportTemplateHistoryAction,
    description: string,
    metadata?: Record<string, unknown>,
    result: ReportTemplateHistoryResult = "success",
  ): ReportTemplateHistoryEvent => {
    const ev: ReportTemplateHistoryEvent = deepFreeze({
      id: nextHistoryId(),
      templateId,
      action,
      description,
      result,
      actor: DEFAULT_ACTOR,
      createdAt: nextClock(),
      metadata: deepFreeze(sanitizeMetadata(metadata)),
    }) as ReportTemplateHistoryEvent;
    history = [...history, ev];
    commitHistory();
    return ev;
  };

  const createVersion = (
    template: ReportTemplate,
    reason: string,
    changeSummary: string,
  ): ReportTemplateVersion => {
    const num = versions.filter((v) => v.templateId === template.id).length + 1;
    const ver: ReportTemplateVersion = deepFreeze({
      id: nextVersionId(),
      templateId: template.id,
      versionNumber: num,
      snapshot: deepFreeze(deepClone(template)),
      reason: reason.trim(),
      author: DEFAULT_ACTOR,
      createdAt: nextClock(),
      statusAtCreation: template.status,
      changeSummary: changeSummary ?? "",
    }) as ReportTemplateVersion;
    versions = [...versions, ver];
    commitVersions();
    return ver;
  };

  return Object.freeze({
    getSnapshot: () => templateSnapshot,
    subscribe: (listener) => {
      templateListeners.add(listener);
      return () => {
        templateListeners.delete(listener);
      };
    },

    getById: (id) => {
      const t = templates.find((x) => x.id === id);
      return t ? deepFreeze(deepClone(t)) : undefined;
    },
    list: (filters) => {
      const out: ReportTemplateSummary[] = templates.map((t) => ({
        id: t.id,
        name: t.name,
        specialty: t.specialty,
        status: t.status,
        sectionsCount: t.sections.length,
        variablesCount: t.variables.length,
        updatedAt: t.updatedAt,
      }));
      if (!filters) return out;
      return out.filter((s) => {
        if (filters.status && s.status !== filters.status) return false;
        if (filters.specialty && s.specialty !== filters.specialty) return false;
        return true;
      });
    },

    create: (input) => {
      const name = input.name.trim();
      if (name.length === 0) {
        throw new ReportTemplateError("empty_name", "Nome do modelo é obrigatório.");
      }
      const t: ReportTemplate = {
        id: nextTemplateId(),
        name,
        description: input.description?.trim() ?? "",
        specialty: input.specialty ?? "geral",
        status: "rascunho",
        createdAt: nextClock(),
        updatedAt: nextClock(),
        createdBy: DEFAULT_ACTOR,
        sections: [],
        variables: [],
        duplicatedFrom: null,
      };
      templates = [...templates, t];
      commitTemplates();
      appendHistory(t.id, "template_created", `Modelo criado: ${t.name}.");
      return deepFreeze(deepClone(t));
    },

    updateMetadata: (id, patch) => {
      const idx = requireMutable(id, "update_metadata");
      const t = templates[idx]!;
      const next: ReportTemplate = {
        ...t,
        name: patch.name?.trim() ?? t.name,
        description: patch.description?.trim() ?? t.description,
        specialty: patch.specialty ?? t.specialty,
        updatedAt: nextClock(),
      };
      replaceTemplate(idx, next);
      commitTemplates();
      appendHistory(id, "template_metadata_updated", "Metadados atualizados.");
      return deepFreeze(deepClone(next));
    },

    duplicate: (id) => {
      const original = requireTemplate(id);
      const copy: ReportTemplate = {
        ...deepClone(original),
        id: nextTemplateId(),
        name: `${original.name} (cópia)`,
        status: "rascunho",
        createdAt: nextClock(),
        updatedAt: nextClock(),
        createdBy: DEFAULT_ACTOR,
        duplicatedFrom: original.id,
      };
      templates = [...templates, copy];
      commitTemplates();
      appendHistory(id, "template_duplicated", `Modelo duplicado para ${copy.id}.`, {
        duplicatedFrom: original.id,
      });
      return deepFreeze(deepClone(copy));
    },

    archive: (id) => {
      const idx = templates.findIndex((t) => t.id === id);
      if (idx === -1) throw new ReportTemplateError("template_not_found", `Modelo ${id} não encontrado.`);
      const next: ReportTemplate = { ...templates[idx]!, status: "arquivado", updatedAt: nextClock() };
      replaceTemplate(idx, next);
      commitTemplates();
      appendHistory(id, "template_archived", "Modelo arquivado.");
      return deepFreeze(deepClone(next));
    },

    reactivate: (id) => {
      const idx = templates.findIndex((t) => t.id === id);
      if (idx === -1) throw new ReportTemplateError("template_not_found", `Modelo ${id} não encontrado.`);
      const next: ReportTemplate = { ...templates[idx]!, status: "rascunho", updatedAt: nextClock() };
      replaceTemplate(idx, next);
      commitTemplates();
      appendHistory(id, "template_reactivated", "Modelo reativado.");
      return deepFreeze(deepClone(next));
    },

    publish: (id, reason) => {
      const idx = templates.findIndex((t) => t.id === id);
      if (idx === -1) throw new ReportTemplateError("template_not_found", `Modelo ${id} não encontrado.`);
      const t = templates[idx]!;
      if (t.status === "arquivado") {
        throw new ReportTemplateError("template_archived", `Modelo ${id} está arquivado.`);
      }
      if (t.status === "publicado") {
        throw new ReportTemplateError("invalid_transition", "Modelo já está publicado.");
      }
      const next: ReportTemplate = { ...t, status: "publicado", updatedAt: nextClock() };
      replaceTemplate(idx, next);
      commitTemplates();
      createVersion(next, reason?.trim() || "Publicação", "Versão gerada pela publicação.");
      appendHistory(id, "template_published", "Modelo publicado.");
      return deepFreeze(deepClone(next));
    },

    returnToDraft: (id) => {
      const idx = templates.findIndex((t) => t.id === id);
      if (idx === -1) throw new ReportTemplateError("template_not_found", `Modelo ${id} não encontrado.`);
      const t = templates[idx]!;
      if (t.status === "arquivado") {
        throw new ReportTemplateError("template_archived", `Modelo ${id} está arquivado.`);
      }
      if (t.status === "rascunho") return deepFreeze(deepClone(t));
      const next: ReportTemplate = { ...t, status: "rascunho", updatedAt: nextClock() };
      replaceTemplate(idx, next);
      commitTemplates();
      appendHistory(id, "template_returned_to_draft", "Modelo retornado ao rascunho.");
      return deepFreeze(deepClone(next));
    },

    addSection: (templateId, input) => {
      const idx = requireMutable(templateId, "add_section");
      const t = templates[idx]!;
      const position =
        input.position === undefined || input.position < 0 || input.position > t.sections.length
          ? t.sections.length
          : input.position;
      const section: ReportTemplateSection = {
        id: nextSectionId(),
        title: input.title.trim(),
        description: input.description?.trim() ?? "",
        position,
        blocks: [],
      };
      const reordered = normalizePositions([
        ...t.sections.slice(0, position),
        section,
        ...t.sections.slice(position),
      ]);
      const next: ReportTemplate = { ...t, sections: reordered, updatedAt: nextClock() };
      replaceTemplate(idx, next);
      commitTemplates();
      appendHistory(templateId, "section_added", `Seção adicionada: ${section.title}.");
      return deepFreeze(deepClone(section));
    },

    updateSection: (templateId, sectionId, input) => {
      const idx = requireMutable(templateId, "update_section");
      const t = templates[idx]!;
      const sIdx = t.sections.findIndex((s) => s.id === sectionId);
      if (sIdx === -1) throw new ReportTemplateError("section_not_found", "Seção não encontrada.");
      const updated: ReportTemplateSection = {
        ...t.sections[sIdx]!,
        title: input.title?.trim() ?? t.sections[sIdx]!.title,
        description: input.description?.trim() ?? t.sections[sIdx]!.description,
      };
      const next: ReportTemplate = {
        ...t,
        sections: t.sections.map((s, i) => (i === sIdx ? updated : s)),
        updatedAt: nextClock(),
      };
      replaceTemplate(idx, next);
      commitTemplates();
      appendHistory(templateId, "section_updated", "Seção atualizada.");
      return deepFreeze(deepClone(updated));
    },

    removeSection: (templateId, sectionId) => {
      const idx = requireMutable(templateId, "remove_section");
      const t = templates[idx]!;
      if (!t.sections.some((s) => s.id === sectionId)) {
        throw new ReportTemplateError("section_not_found", "Seção não encontrada.");
      }
      const next: ReportTemplate = {
        ...t,
        sections: normalizePositions(t.sections.filter((s) => s.id !== sectionId)),
        updatedAt: nextClock(),
      };
      replaceTemplate(idx, next);
      commitTemplates();
      appendHistory(templateId, "section_removed", "Seção removida.");
    },

    moveSection: (templateId, sectionId, direction) => {
      const idx = requireMutable(templateId, "move_section");
      const t = templates[idx]!;
      const sIdx = t.sections.findIndex((s) => s.id === sectionId);
      if (sIdx === -1) throw new ReportTemplateError("section_not_found", "Seção não encontrada.");
      const swap = direction === "up" ? sIdx - 1 : sIdx + 1;
      if (swap < 0 || swap >= t.sections.length) return;
      const reordered = t.sections.slice();
      const tmp = reordered[sIdx]!;
      reordered[sIdx] = reordered[swap]!;
      reordered[swap] = tmp;
      const next: ReportTemplate = {
        ...t,
        sections: normalizePositions(reordered),
        updatedAt: nextClock(),
      };
      replaceTemplate(idx, next);
      commitTemplates();
      appendHistory(templateId, "section_reordered", "Seção reordenada.");
    },

    addBlock: (templateId, sectionId, input) => {
      const idx = requireMutable(templateId, "add_block");
      const t = templates[idx]!;
      const sIdx = t.sections.findIndex((s) => s.id === sectionId);
      if (sIdx === -1) throw new ReportTemplateError("section_not_found", "Seção não encontrada.");
      const section = t.sections[sIdx]!;
      const position =
        input.position === undefined || input.position < 0 || input.position > section.blocks.length
          ? section.blocks.length
          : input.position;
      const block: ReportTemplateBlock = {
        id: nextBlockId(),
        kind: input.kind,
        title: input.title?.trim() ?? "",
        content: input.content?.trim() ?? "",
        position,
        variableRefs: input.variableRefs ? [...input.variableRefs] : [],
      };
      const reordered = normalizePositions([
        ...section.blocks.slice(0, position),
        block,
        ...section.blocks.slice(position),
      ]);
      const nextSection: ReportTemplateSection = { ...section, blocks: reordered };
      const next: ReportTemplate = {
        ...t,
        sections: t.sections.map((s, i) => (i === sIdx ? nextSection : s)),
        updatedAt: nextClock(),
      };
      replaceTemplate(idx, next);
      commitTemplates();
      appendHistory(templateId, "block_added", "Bloco adicionado.");
      return deepFreeze(deepClone(block));
    },

    updateBlock: (templateId, sectionId, blockId, input) => {
      const idx = requireMutable(templateId, "update_block");
      const t = templates[idx]!;
      const sIdx = t.sections.findIndex((s) => s.id === sectionId);
      if (sIdx === -1) throw new ReportTemplateError("section_not_found", "Seção não encontrada.");
      const section = t.sections[sIdx]!;
      const bIdx = section.blocks.findIndex((b) => b.id === blockId);
      if (bIdx === -1) throw new ReportTemplateError("block_not_found", "Bloco não encontrado.");
      const updated: ReportTemplateBlock = {
        ...section.blocks[bIdx]!,
        kind: input.kind ?? section.blocks[bIdx]!.kind,
        title: input.title?.trim() ?? section.blocks[bIdx]!.title,
        content: input.content?.trim() ?? section.blocks[bIdx]!.content,
        variableRefs: input.variableRefs
          ? [...input.variableRefs]
          : section.blocks[bIdx]!.variableRefs,
      };
      const nextSection: ReportTemplateSection = {
        ...section,
        blocks: section.blocks.map((b, i) => (i === bIdx ? updated : b)),
      };
      const next: ReportTemplate = {
        ...t,
        sections: t.sections.map((s, i) => (i === sIdx ? nextSection : s)),
        updatedAt: nextClock(),
      };
      replaceTemplate(idx, next);
      commitTemplates();
      appendHistory(templateId, "block_updated", "Bloco atualizado.");
      return deepFreeze(deepClone(updated));
    },

    removeBlock: (templateId, sectionId, blockId) => {
      const idx = requireMutable(templateId, "remove_block");
      const t = templates[idx]!;
      const sIdx = t.sections.findIndex((s) => s.id === sectionId);
      if (sIdx === -1) throw new ReportTemplateError("section_not_found", "Seção não encontrada.");
      const section = t.sections[sIdx]!;
      if (!section.blocks.some((b) => b.id === blockId)) {
        throw new ReportTemplateError("block_not_found", "Bloco não encontrado.");
      }
      const nextSection: ReportTemplateSection = {
        ...section,
        blocks: normalizePositions(section.blocks.filter((b) => b.id !== blockId)),
      };
      const next: ReportTemplate = {
        ...t,
        sections: t.sections.map((s, i) => (i === sIdx ? nextSection : s)),
        updatedAt: nextClock(),
      };
      replaceTemplate(idx, next);
      commitTemplates();
      appendHistory(templateId, "block_removed", "Bloco removido.");
    },

    moveBlock: (templateId, sectionId, blockId, direction) => {
      const idx = requireMutable(templateId, "move_block");
      const t = templates[idx]!;
      const sIdx = t.sections.findIndex((s) => s.id === sectionId);
      if (sIdx === -1) throw new ReportTemplateError("section_not_found", "Seção não encontrada.");
      const section = t.sections[sIdx]!;
      const bIdx = section.blocks.findIndex((b) => b.id === blockId);
      if (bIdx === -1) throw new ReportTemplateError("block_not_found", "Bloco não encontrado.");
      const swap = direction === "up" ? bIdx - 1 : bIdx + 1;
      if (swap < 0 || swap >= section.blocks.length) return;
      const reordered = section.blocks.slice();
      const tmp = reordered[bIdx]!;
      reordered[bIdx] = reordered[swap]!;
      reordered[swap] = tmp;
      const nextSection: ReportTemplateSection = {
        ...section,
        blocks: normalizePositions(reordered),
      };
      const next: ReportTemplate = {
        ...t,
        sections: t.sections.map((s, i) => (i === sIdx ? nextSection : s)),
        updatedAt: nextClock(),
      };
      replaceTemplate(idx, next);
      commitTemplates();
      appendHistory(templateId, "block_reordered", "Bloco reordenado.");
    },

    addVariable: (templateId, input) => {
      const idx = requireMutable(templateId, "add_variable");
      const t = templates[idx]!;
      const key = input.key.trim();
      if (key.length === 0) {
        throw new ReportTemplateError("empty_variable_key", "Chave da variável é obrigatória.");
      }
      if (t.variables.some((v) => v.key === key)) {
        throw new ReportTemplateError("duplicate_variable_key", `Chave '${key}' já existe.");
      }
      const variable: ReportTemplateVariable = {
        id: nextVariableId(),
        key,
        label: input.label.trim() || key,
        kind: input.kind ?? "texto",
        required: input.required ?? false,
        defaultValue: input.defaultValue?.trim() ?? "",
      };
      const next: ReportTemplate = {
        ...t,
        variables: [...t.variables, variable],
        updatedAt: nextClock(),
      };
      replaceTemplate(idx, next);
      commitTemplates();
      appendHistory(templateId, "variable_added", `Variável adicionada: ${key}.");
      return deepFreeze(deepClone(variable));
    },

    updateVariable: (templateId, variableId, input) => {
      const idx = requireMutable(templateId, "update_variable");
      const t = templates[idx]!;
      const vIdx = t.variables.findIndex((v) => v.id === variableId);
      if (vIdx === -1) throw new ReportTemplateError("variable_not_found", "Variável não encontrada.");
      const updated: ReportTemplateVariable = {
        ...t.variables[vIdx]!,
        label: input.label?.trim() ?? t.variables[vIdx]!.label,
        kind: input.kind ?? t.variables[vIdx]!.kind,
        required: input.required ?? t.variables[vIdx]!.required,
        defaultValue: input.defaultValue?.trim() ?? t.variables[vIdx]!.defaultValue,
      };
      const next: ReportTemplate = {
        ...t,
        variables: t.variables.map((v, i) => (i === vIdx ? updated : v)),
        updatedAt: nextClock(),
      };
      replaceTemplate(idx, next);
      commitTemplates();
      appendHistory(templateId, "variable_updated", "Variável atualizada.");
      return deepFreeze(deepClone(updated));
    },

    removeVariable: (templateId, variableId, options) => {
      const idx = requireMutable(templateId, "remove_variable");
      const t = templates[idx]!;
      const vIdx = t.variables.findIndex((v) => v.id === variableId);
      if (vIdx === -1) throw new ReportTemplateError("variable_not_found", "Variável não encontrada.");
      const key = t.variables[vIdx]!.key;
      if (!options?.force && t.sections.some((s) => s.blocks.some((b) => b.variableRefs.includes(key)))) {
        throw new ReportTemplateError("variable_in_use", "Variável está em uso.");
      }
      const next: ReportTemplate = {
        ...t,
        variables: t.variables.filter((_, i) => i !== vIdx),
        updatedAt: nextClock(),
      };
      replaceTemplate(idx, next);
      commitTemplates();
      appendHistory(templateId, "variable_removed", `Variável removida: ${key}.");
    },

    isVariableInUse: (templateId, variableId) => {
      const t = requireTemplate(templateId);
      const variable = t.variables.find((v) => v.id === variableId);
      if (!variable) return false;
      return t.sections.some((s) => s.blocks.some((b) => b.variableRefs.includes(variable.key)));
    },

    getExistingIds: () => {
      const templateIds = new Set<string>();
      const sectionIds = new Set<string>();
      const blockIds = new Set<string>();
      const variableIds = new Set<string>();
      for (const t of templates) {
        templateIds.add(t.id);
        for (const v of t.variables) variableIds.add(v.id);
        for (const s of t.sections) {
          sectionIds.add(s.id);
          for (const b of s.blocks) blockIds.add(b.id);
        }
      }
      return {
        templateIds: templateIds as ReadonlySet<string>,
        sectionIds: sectionIds as ReadonlySet<string>,
        blockIds: blockIds as ReadonlySet<string>,
        variableIds: variableIds as ReadonlySet<string>,
      };
    },

    bulkInsertImported: (incoming) => {
      if (incoming.length === 0) return [];
      const existing = repo.getExistingIds();
      const batchTpl = new Set<string>();
      const batchSec = new Set<string>();
      const batchBlk = new Set<string>();
      const batchVar = new Set<string>();
      for (const t of incoming) {
        if (existing.templateIds.has(t.id)) {
          throw new ReportTemplateError("import_conflict", `ID de modelo já existe: ${t.id}`);
        }
        if (batchTpl.has(t.id)) {
          throw new ReportTemplateError("import_duplicate_id", `ID de modelo duplicado no lote: ${t.id}`);
        }
        batchTpl.add(t.id);
        for (const v of t.variables) {
          if (existing.variableIds.has(v.id)) {
            throw new ReportTemplateError("import_conflict", `ID de variável já existe: ${v.id}`);
          }
          if (batchVar.has(v.id)) {
            throw new ReportTemplateError("import_duplicate_id", `ID de variável duplicado no lote: ${v.id}`);
          }
          batchVar.add(v.id);
        }
        for (const s of t.sections) {
          if (existing.sectionIds.has(s.id)) {
            throw new ReportTemplateError("import_conflict", `ID de seção já existe: ${s.id}`);
          }
          if (batchSec.has(s.id)) {
            throw new ReportTemplateError("import_duplicate_id", `ID de seção duplicado no lote: ${s.id}`);
          }
          batchSec.add(s.id);
          for (const b of s.blocks) {
            if (existing.blockIds.has(b.id)) {
              throw new ReportTemplateError("import_conflict", `ID de bloco já existe: ${b.id}`);
            }
            if (batchBlk.has(b.id)) {
              throw new ReportTemplateError("import_duplicate_id", `ID de bloco duplicado no lote: ${b.id}`);
            }
            batchBlk.add(b.id);
          }
        }
      }
      const clones = incoming.map((t) => deepClone(t));
      templates = [...templates, ...clones];
      commitTemplates();
      return clones.map((t) => deepFreeze(deepClone(t)));
    },

    generateImportedTemplateId: nextTemplateId,
    generateImportedSectionId: nextSectionId,
    generateImportedBlockId: nextBlockId,
    generateImportedVariableId: nextVariableId,

    listVersions: (templateId) => {
      return deepFreeze(versions.filter((v) => v.templateId === templateId).map(deepClone));
    },
    getVersion: (templateId, versionId) => {
      const v = versions.find((x) => x.id === versionId);
      if (!v || v.templateId !== templateId) return undefined;
      return deepFreeze(deepClone(v));
    },
    getVersionSnapshot: () => versionSnapshot,
    subscribeVersions: (listener) => {
      versionListeners.add(listener);
      return () => {
        versionListeners.delete(listener);
      };
    },
    createManualVersion: (templateId, reason, changeSummary) => {
      const t = requireTemplate(templateId);
      const trimmed = reason.trim();
      if (trimmed.length === 0) {
        throw new ReportTemplateError("version_reason_required", "Motivo é obrigatório.");
      }
      const ver = createVersion(t, trimmed, changeSummary ?? "");
      appendHistory(templateId, "version_created", `Versão ${ver.versionNumber} criada manualmente.");
      return ver;
    },

    listHistory: (templateId) => {
      const list = templateId ? history.filter((e) => e.templateId === templateId) : history.slice();
      return deepFreeze(list.map(deepClone));
    },
    getHistorySnapshot: () => historySnapshot,
    subscribeHistory: (listener) => {
      historyListeners.add(listener);
      return () => {
        historyListeners.delete(listener);
      };
    },
    appendHistoryEvent: (input) => {
      return appendHistory(
        input.templateId,
        input.action,
        input.description,
        input.metadata,
        input.result,
      );
    },

    reset: () => {
      templates = [];
      versions = [];
      history = [];
      templateIdCounter = 1000;
      sectionIdCounter = 2000;
      blockIdCounter = 3000;
      variableIdCounter = 4000;
      versionIdCounter = 7000;
      historyIdCounter = 9000;
      templateMutationVersion = 0;
      versionMutationVersion = 0;
      historyMutationVersion = 0;
      clock = new Date(FIXED_ISO).getTime();
      templateSnapshot = buildTemplateSnapshot();
      versionSnapshot = buildVersionSnapshot();
      historySnapshot = buildHistorySnapshot();
      emitTemplates();
      emitVersions();
      emitHistory();
    },
  } as ReportTemplateRepository);

  const repo = result; // referência interna para métodos que se chamam
  return result;

  function sanitizeMetadata(
    meta: Record<string, unknown> | undefined,
  ): Record<string, string | number | boolean | null> {
    const out: Record<string, string | number | boolean | null> = {};
    if (!meta) return out;
    for (const k of Object.keys(meta)) {
      const v = meta[k];
      if (v === null) out[k] = null;
      else if (typeof v === "string") out[k] = v.length > 200 ? v.slice(0, 200) : v;
      else if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
      else if (typeof v === "boolean") out[k] = v;
    }
    return out;
  }
}
