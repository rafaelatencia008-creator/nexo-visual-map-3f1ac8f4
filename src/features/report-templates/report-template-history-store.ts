/**
 * LV-18.2 — Histórico append-only de modelos de laudo.
 *
 * Store observável em memória. Nenhum evento pode ser editado ou removido.
 * Metadata é congelada e sanitizada — nunca guarda o snapshot integral do
 * modelo (isso é responsabilidade do version-store).
 */

import type { ReportTemplateId } from "./report-template-types";

export type ReportTemplateHistoryAction =
  | "template_created"
  | "template_metadata_updated"
  | "template_duplicated"
  | "template_archived"
  | "template_reactivated"
  | "template_published"
  | "template_returned_to_draft"
  | "template_validated"
  | "template_publication_blocked"
  | "template_transition_blocked"
  | "template_operation_blocked"
  | "section_added"
  | "section_updated"
  | "section_removed"
  | "section_reordered"
  | "block_added"
  | "block_updated"
  | "block_removed"
  | "block_reordered"
  | "variable_added"
  | "variable_updated"
  | "variable_removed"
  | "version_created";

export type ReportTemplateHistoryResult = "success" | "blocked" | "failure";

export interface ReportTemplateHistoryEvent {
  readonly id: string;
  readonly templateId: ReportTemplateId;
  readonly action: ReportTemplateHistoryAction;
  readonly description: string;
  readonly result: ReportTemplateHistoryResult;
  readonly actor: string;
  readonly createdAt: string;
  readonly metadata: Readonly<Record<string, string | number | boolean | null>>;
}

export interface ReportTemplateHistorySnapshot {
  readonly events: readonly ReportTemplateHistoryEvent[];
  readonly version: number;
}

// -------- estado interno --------

let events: ReportTemplateHistoryEvent[] = [];
let currentSnapshot: ReportTemplateHistorySnapshot = Object.freeze({
  events: Object.freeze([]) as readonly ReportTemplateHistoryEvent[],
  version: 0,
});
let listeners: Array<() => void> = [];
let idCounter = 9000;
let clockIso = "2026-07-25T12:00:00.000Z";
let mutationVersion = 0;

function nextId(): string {
  idCounter += 1;
  return `rthist-${idCounter}`;
}

function tick(): string {
  const t = new Date(clockIso).getTime() + 1000;
  clockIso = new Date(t).toISOString();
  return clockIso;
}

const FORBIDDEN_META_KEYS = new Set([
  "password",
  "senha",
  "token",
  "secret",
  "apiKey",
  "accessToken",
  "refreshToken",
]);

function sanitizeMetadata(
  meta: Record<string, unknown> | undefined,
): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  if (!meta) return out;
  for (const k of Object.keys(meta)) {
    if (FORBIDDEN_META_KEYS.has(k)) continue;
    const v = meta[k];
    if (v === null) out[k] = null;
    else if (typeof v === "string") out[k] = v.length > 200 ? v.slice(0, 200) : v;
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "boolean") out[k] = v;
    // demais tipos são descartados
  }
  return out;
}

function rebuildSnapshot(): void {
  mutationVersion += 1;
  const list = Object.freeze(events.slice());
  currentSnapshot = Object.freeze({ events: list, version: mutationVersion });
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

export interface AppendHistoryInput {
  readonly templateId: ReportTemplateId;
  readonly action: ReportTemplateHistoryAction;
  readonly description: string;
  readonly result?: ReportTemplateHistoryResult;
  readonly actor?: string;
  readonly metadata?: Record<string, unknown>;
}

export function appendTemplateHistoryEvent(
  input: AppendHistoryInput,
): ReportTemplateHistoryEvent {
  const ev: ReportTemplateHistoryEvent = Object.freeze({
    id: nextId(),
    templateId: input.templateId,
    action: input.action,
    description: input.description,
    result: input.result ?? "success",
    actor: input.actor ?? "usr-demo",
    createdAt: tick(),
    metadata: Object.freeze(sanitizeMetadata(input.metadata)),
  });
  events = [...events, ev];
  rebuildSnapshot();
  emit();
  return ev;
}

export function listTemplateHistory(
  templateId?: ReportTemplateId,
): readonly ReportTemplateHistoryEvent[] {
  if (!templateId) return currentSnapshot.events;
  return currentSnapshot.events.filter((e) => e.templateId === templateId);
}

export function getTemplateHistorySnapshot(): ReportTemplateHistorySnapshot {
  return currentSnapshot;
}

export function subscribeTemplateHistory(listener: () => void): () => void {
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

export function resetTemplateHistoryStore(): void {
  events = [];
  idCounter = 9000;
  clockIso = "2026-07-25T12:00:00.000Z";
  mutationVersion = 0;
  currentSnapshot = Object.freeze({
    events: Object.freeze([]) as readonly ReportTemplateHistoryEvent[],
    version: 0,
  });
  emit();
}
