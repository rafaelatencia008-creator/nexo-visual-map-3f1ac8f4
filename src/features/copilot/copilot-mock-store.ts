/**
 * LV-13 — Store apenas em memória (sem localStorage, sem backend).
 */
import type {
  CopilotAuditEvent,
  CopilotAuditEventType,
  CopilotFeedback,
  CopilotMessage,
  CopilotProposedAction,
  CopilotReference,
  CopilotThread,
} from "./copilot-types";
import { DEFAULT_ACTOR_LABEL } from "./copilot-labels";

let counter = 0;
export function makeCopilotId(prefix: string): string {
  counter += 1;
  return `${prefix}-${String(counter).padStart(4, "0")}`;
}
export function resetCopilotIdCounter(seed = 0): void {
  counter = seed;
}

let clockMs = Date.UTC(2026, 0, 1, 12, 0, 0);
export function copilotNow(): string {
  clockMs += 1000;
  return new Date(clockMs).toISOString();
}
export function resetCopilotClock(baseMs = Date.UTC(2026, 0, 1, 12, 0, 0)): void {
  clockMs = baseMs;
}

let threads: CopilotThread[] = [];
let audit: CopilotAuditEvent[] = [];
type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  for (const fn of listeners) fn();
}

export function subscribeCopilotStore(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetCopilotStore(): void {
  threads = [];
  audit = [];
  resetCopilotIdCounter(0);
  resetCopilotClock();
  notify();
}

export function listThreads(): readonly CopilotThread[] {
  return threads;
}

export function getThread(id: string): CopilotThread | undefined {
  return threads.find((t) => t.id === id);
}

export function listAudit(): readonly CopilotAuditEvent[] {
  return audit;
}

function pushAudit(
  threadId: string,
  eventType: CopilotAuditEventType,
  summary: string,
  extra?: { messageId?: string; actionId?: string; outcome?: string },
): CopilotAuditEvent {
  const ev: CopilotAuditEvent = {
    id: makeCopilotId("aud"),
    threadId,
    eventType,
    summary,
    actorLabel: DEFAULT_ACTOR_LABEL,
    createdAt: copilotNow(),
    messageId: extra?.messageId,
    actionId: extra?.actionId,
    outcome: extra?.outcome,
  };
  audit = [...audit, ev];
  return ev;
}

export function createThread(title = "Nova conversa"): CopilotThread {
  const t: CopilotThread = {
    id: makeCopilotId("thr"),
    title,
    status: "active",
    messages: [],
    createdAt: copilotNow(),
    updatedAt: copilotNow(),
  };
  threads = [...threads, t];
  pushAudit(t.id, "conversation_created", `Conversa "${t.title}" criada.`);
  notify();
  return t;
}

function replaceThread(next: CopilotThread): void {
  threads = threads.map((t) => (t.id === next.id ? next : t));
  notify();
}

export function renameThread(id: string, title: string): CopilotThread | undefined {
  const t = getThread(id);
  if (!t) return undefined;
  const next = { ...t, title, updatedAt: copilotNow() };
  replaceThread(next);
  return next;
}

export function archiveThread(id: string): CopilotThread | undefined {
  const t = getThread(id);
  if (!t) return undefined;
  const next = { ...t, status: "archived" as const, updatedAt: copilotNow() };
  replaceThread(next);
  pushAudit(id, "conversation_archived", `Conversa "${t.title}" arquivada.`);
  return next;
}

export function clearThread(id: string): CopilotThread | undefined {
  const t = getThread(id);
  if (!t) return undefined;
  const next = { ...t, messages: [], updatedAt: copilotNow() };
  replaceThread(next);
  pushAudit(id, "conversation_cleared", `Conversa "${t.title}" limpa.`);
  return next;
}

export function appendMessage(threadId: string, msg: CopilotMessage): CopilotThread | undefined {
  const t = getThread(threadId);
  if (!t) return undefined;
  const next = {
    ...t,
    messages: [...t.messages, msg],
    updatedAt: copilotNow(),
  };
  replaceThread(next);
  return next;
}

export function updateMessage(
  threadId: string,
  messageId: string,
  patch: Partial<CopilotMessage>,
): CopilotThread | undefined {
  const t = getThread(threadId);
  if (!t) return undefined;
  const next = {
    ...t,
    messages: t.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
    updatedAt: copilotNow(),
  };
  replaceThread(next);
  return next;
}

export function updateActionStatus(
  threadId: string,
  messageId: string,
  actionId: string,
  status: CopilotProposedAction["status"],
  reason?: string,
): CopilotThread | undefined {
  const t = getThread(threadId);
  if (!t) return undefined;
  const next = {
    ...t,
    messages: t.messages.map((m) => {
      if (m.id !== messageId) return m;
      return {
        ...m,
        proposedActions: m.proposedActions.map((a) =>
          a.id === actionId ? { ...a, status, reason } : a,
        ),
      };
    }),
    updatedAt: copilotNow(),
  };
  replaceThread(next);
  return next;
}

export function setMessageFeedback(
  threadId: string,
  messageId: string,
  fb: CopilotFeedback,
): CopilotThread | undefined {
  return updateMessage(threadId, messageId, { feedback: fb });
}

export function logAudit(
  threadId: string,
  eventType: CopilotAuditEventType,
  summary: string,
  extra?: { messageId?: string; actionId?: string; outcome?: string },
): CopilotAuditEvent {
  const ev = pushAudit(threadId, eventType, summary, extra);
  notify();
  return ev;
}

/** Helper para montar mensagens de forma padronizada. */
export function makeAssistantMessage(opts: {
  text: string;
  status?: CopilotMessage["status"];
  intent?: CopilotMessage["intent"];
  references?: readonly CopilotReference[];
  proposedActions?: readonly CopilotProposedAction[];
}): CopilotMessage {
  return {
    id: makeCopilotId("msg"),
    role: "assistant",
    text: opts.text,
    status: opts.status ?? "completed",
    intent: opts.intent,
    references: opts.references ?? [],
    proposedActions: opts.proposedActions ?? [],
    createdAt: copilotNow(),
  };
}

export function makeUserMessage(text: string): CopilotMessage {
  return {
    id: makeCopilotId("msg"),
    role: "user",
    text,
    status: "completed",
    references: [],
    proposedActions: [],
    createdAt: copilotNow(),
  };
}
