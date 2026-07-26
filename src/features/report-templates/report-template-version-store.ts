/**
 * LV-18.2 — Store append-only de versões imutáveis de modelos de laudo.
 *
 * Cada versão é um snapshot profundo e congelado do modelo, numerada
 * sequencialmente por `templateId`. Não é possível atualizar ou remover
 * versões existentes; alterações posteriores no modelo não afetam versões
 * já registradas.
 */

import { ReportTemplateError, type ReportTemplate, type ReportTemplateId, type ReportTemplateStatus } from "./report-template-types";

export interface ReportTemplateVersion {
  readonly id: string;
  readonly templateId: ReportTemplateId;
  readonly versionNumber: number;
  readonly snapshot: ReportTemplate;
  readonly reason: string;
  readonly author: string;
  readonly createdAt: string;
  readonly statusAtCreation: ReportTemplateStatus;
  readonly changeSummary: string;
}

export interface ReportTemplateVersionSnapshot {
  readonly versions: readonly ReportTemplateVersion[];
  readonly version: number;
}

// -------- estado --------

let versions: ReportTemplateVersion[] = [];
let counters = new Map<ReportTemplateId, number>();
let currentSnapshot: ReportTemplateVersionSnapshot = Object.freeze({
  versions: Object.freeze([]) as readonly ReportTemplateVersion[],
  version: 0,
});
let listeners: Array<() => void> = [];
let idCounter = 7000;
let clockIso = "2026-07-25T12:00:00.000Z";
let mutationVersion = 0;

function nextId(): string {
  idCounter += 1;
  return `rtver-${idCounter}`;
}

function tick(): string {
  clockIso = new Date(new Date(clockIso).getTime() + 1000).toISOString();
  return clockIso;
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

function cloneAndFreeze(t: ReportTemplate): ReportTemplate {
  const cloned = JSON.parse(JSON.stringify(t)) as ReportTemplate;
  return deepFreeze(cloned);
}

function rebuildSnapshot(): void {
  mutationVersion += 1;
  currentSnapshot = Object.freeze({
    versions: Object.freeze(versions.slice()),
    version: mutationVersion,
  });
}

function emit(): void {
  for (const l of listeners.slice()) {
    try {
      l();
    } catch {
      /* isolado */
    }
  }
}

// -------- API pública --------

export interface CreateVersionInput {
  readonly template: ReportTemplate;
  readonly reason: string;
  readonly author?: string;
  readonly changeSummary?: string;
}

export function createTemplateVersion(input: CreateVersionInput): ReportTemplateVersion {
  const reason = input.reason?.trim() ?? "";
  if (reason.length === 0) {
    throw new ReportTemplateError(
      "version_reason_required",
      "Motivo é obrigatório para criar uma versão.",
    );
  }
  const t = input.template;
  const num = (counters.get(t.id) ?? 0) + 1;
  counters.set(t.id, num);
  const ver: ReportTemplateVersion = Object.freeze({
    id: nextId(),
    templateId: t.id,
    versionNumber: num,
    snapshot: cloneAndFreeze(t),
    reason,
    author: input.author ?? "usr-demo",
    createdAt: tick(),
    statusAtCreation: t.status,
    changeSummary: input.changeSummary ?? "",
  });
  versions = [...versions, ver];
  rebuildSnapshot();
  emit();
  return ver;
}

export function listTemplateVersions(
  templateId?: ReportTemplateId,
): readonly ReportTemplateVersion[] {
  if (!templateId) return currentSnapshot.versions;
  return currentSnapshot.versions.filter((v) => v.templateId === templateId);
}

export function getTemplateVersion(id: string): ReportTemplateVersion | null {
  return currentSnapshot.versions.find((v) => v.id === id) ?? null;
}

export function getTemplateVersionsSnapshot(): ReportTemplateVersionSnapshot {
  return currentSnapshot;
}

export function subscribeTemplateVersions(listener: () => void): () => void {
  if (typeof listener !== "function") {
    throw new Error("Listener inválido.");
  }
  listeners.push(listener);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function resetTemplateVersionStore(): void {
  versions = [];
  counters = new Map();
  idCounter = 7000;
  clockIso = "2026-07-25T12:00:00.000Z";
  mutationVersion = 0;
  currentSnapshot = Object.freeze({
    versions: Object.freeze([]) as readonly ReportTemplateVersion[],
    version: 0,
  });
  emit();
}
