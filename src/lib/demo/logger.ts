/**
 * LV-17 — Logger local seguro para diagnóstico demonstrativo.
 *
 * Ring buffer em memória. Nunca envia dados para rede, nunca grava conteúdo
 * integral de entrevistas, laudos ou documentos. Aceita apenas categorias
 * enumeradas e um resumo curto (`message`) mais um objeto pequeno (`meta`).
 *
 * Não persiste em storage. Recarregar a aba limpa os logs.
 */

export const DEMO_LOG_CATEGORIES = [
  "navigation",
  "user_action",
  "validation_blocked",
  "error_captured",
  "reset",
  "entity_created",
  "entity_updated",
] as const;

export type DemoLogCategory = (typeof DEMO_LOG_CATEGORIES)[number];

export type DemoLogEntry = Readonly<{
  id: number;
  at: string;
  category: DemoLogCategory;
  message: string;
  meta?: Readonly<Record<string, string | number | boolean | null>>;
}>;

export const DEMO_LOG_MAX_ENTRIES = 200;
const MESSAGE_MAX = 240;

let counter = 0;
let entries: DemoLogEntry[] = [];
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function sanitizeMessage(input: string): string {
  return String(input ?? "").slice(0, MESSAGE_MAX);
}

function sanitizeMeta(
  meta: Record<string, unknown> | undefined,
): DemoLogEntry["meta"] {
  if (!meta) return undefined;
  const out: Record<string, string | number | boolean | null> = {};
  let kept = 0;
  for (const [k, v] of Object.entries(meta)) {
    if (kept >= 8) break;
    if (typeof v === "string") out[k] = v.slice(0, 120);
    else if (typeof v === "number" || typeof v === "boolean" || v === null) out[k] = v;
    // objetos, arrays e funções são descartados
    kept += 1;
  }
  return Object.freeze(out);
}

export function logDemo(
  category: DemoLogCategory,
  message: string,
  meta?: Record<string, unknown>,
): void {
  counter += 1;
  const entry: DemoLogEntry = Object.freeze({
    id: counter,
    at: new Date().toISOString(),
    category,
    message: sanitizeMessage(message),
    meta: sanitizeMeta(meta),
  });
  entries = [...entries, entry].slice(-DEMO_LOG_MAX_ENTRIES);
  notify();
}

export function getDemoLogs(): readonly DemoLogEntry[] {
  return entries;
}

export function clearDemoLogs(): void {
  entries = [];
  notify();
}

export function subscribeDemoLogs(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Uso apenas em testes — restaura contador e limpa entradas. */
export function resetDemoLogsForTests(): void {
  counter = 0;
  entries = [];
  listeners.clear();
}
