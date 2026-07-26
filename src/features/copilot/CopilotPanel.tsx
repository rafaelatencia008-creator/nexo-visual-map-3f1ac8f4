import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Send,
  Square,
  Plus,
  Archive,
  Trash2,
  BookOpen,
  History,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Copy,
  ExternalLink,
} from "lucide-react";
import { useCopilotContext } from "./copilot-context";
import {
  appendMessage,
  createThread,
  clearThread,
  archiveThread,
  listAudit,
  listThreads,
  logAudit,
  makeAssistantMessage,
  makeUserMessage,
  renameThread,
  setMessageFeedback,
  subscribeCopilotStore,
  updateActionStatus,
  updateMessage,
  copilotNow,
} from "./copilot-mock-store";
import { runCopilot, suggestionsForContext } from "./copilot-engine";
import { collectAvailableSources } from "./copilot-action-adapters";
import { applyAction } from "./copilot-apply";
import {
  AUDIT_EVENT_LABEL,
  EPHEMERAL_WARNING,
  SIMULATION_BANNER,
  SIMULATION_DESCRIPTION,
  SOURCE_TYPE_LABEL,
  STALE_MESSAGE,
} from "./copilot-labels";
import {
  COPILOT_PROMPT_LIBRARY,
  PROMPT_CATEGORIES,
  searchPrompts,
  type PromptCategory,
} from "./copilot-prompt-library";
import type { CopilotProposedAction, CopilotReference, CopilotThread } from "./copilot-types";
import { toast } from "sonner";

const THINKING_DELAY_MS = 450;

export function CopilotPanel() {
  const { open, setOpen, routeContext } = useCopilotContext();
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => subscribeCopilotStore(force), []);

  const threads = listThreads();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const active = threads.find((t) => t.id === activeId && t.status === "active");

  const composerRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [input, setInput] = React.useState("");
  const [processing, setProcessing] = React.useState<null | { messageId: string; cancel: () => void }>(null);
  const [confirmAction, setConfirmAction] = React.useState<
    | null
    | {
        threadId: string;
        messageId: string;
        action: CopilotProposedAction;
        references: readonly CopilotReference[];
        targetLabel?: string;
        ackHighRisk: boolean;
      }
  >(null);
  const [auditOpen, setAuditOpen] = React.useState(false);

  const suggestions = suggestionsForContext(routeContext);

  // Ensure a thread exists whenever panel opens
  React.useEffect(() => {
    if (!open) return;
    if (!active) {
      const activeThread = threads.find((t) => t.status === "active");
      if (activeThread) setActiveId(activeThread.id);
      else {
        const t = createThread("Nova conversa");
        setActiveId(t.id);
      }
    }
    // focus composer
    setTimeout(() => composerRef.current?.focus(), 60);
  }, [open, threads, active]);

  const send = React.useCallback(
    (text: string) => {
      if (!active) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      const userMsg = makeUserMessage(trimmed);
      appendMessage(active.id, userMsg);
      logAudit(active.id, "message_sent", `Pergunta: ${trimmed.slice(0, 80)}`, {
        messageId: userMsg.id,
      });

      const pendingId = makeAssistantMessage({ text: "", status: "pending" }).id;
      appendMessage(
        active.id,
        {
          id: pendingId,
          role: "assistant",
          text: "",
          status: "pending",
          references: [],
          proposedActions: [],
          createdAt: copilotNow(),
        },
      );

      let cancelled = false;
      const timer = window.setTimeout(() => {
        if (cancelled) return;
        const sources = collectAvailableSources();
        const out = runCopilot({
          text: trimmed,
          context: routeContext,
          availableSources: sources,
          threadHistory: active.messages,
        });
        updateMessage(active.id, pendingId, {
          text: out.responseText,
          status: "completed",
          intent: out.intent,
          references: out.references,
          proposedActions: out.proposedActions,
        });
        logAudit(active.id, "response_produced", `Intent: ${out.intent}`, {
          messageId: pendingId,
        });
        for (const a of out.proposedActions) {
          logAudit(active.id, "suggestion_created", `${a.label}`, {
            messageId: pendingId,
            actionId: a.id,
          });
        }
        setProcessing(null);
      }, THINKING_DELAY_MS);

      setProcessing({
        messageId: pendingId,
        cancel: () => {
          cancelled = true;
          window.clearTimeout(timer);
          updateMessage(active.id, pendingId, {
            text: "Resposta cancelada.",
            status: "failed",
          });
          logAudit(active.id, "response_cancelled", "Resposta cancelada pelo usuário.", {
            messageId: pendingId,
          });
          setProcessing(null);
        },
      });
      setInput("");
    },
    [active, routeContext],
  );

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (processing) return;
    send(input);
  };

  const openConfirm = (
    threadId: string,
    messageId: string,
    action: CopilotProposedAction,
    references: readonly CopilotReference[],
  ) => {
    updateActionStatus(threadId, messageId, action.id, "awaiting_confirmation");
    logAudit(threadId, "confirmation_opened", action.label, { messageId, actionId: action.id });
    const targetRef = references.find(
      (r) => r.sourceType === action.targetType && r.sourceId === action.targetId,
    );
    setConfirmAction({
      threadId,
      messageId,
      action,
      references,
      targetLabel: targetRef?.label,
      ackHighRisk: false,
    });
  };

  const confirmApply = () => {
    if (!confirmAction) return;
    const { threadId, messageId, action } = confirmAction;
    if (action.risk === "high" && !confirmAction.ackHighRisk) return;
    const sources = collectAvailableSources();
    const outcome = applyAction(action, sources);
    if (outcome.ok) {
      updateActionStatus(threadId, messageId, action.id, "applied");
      logAudit(threadId, "suggestion_confirmed", action.label, { messageId, actionId: action.id });
      logAudit(threadId, "action_applied", outcome.summary, { messageId, actionId: action.id, outcome: "ok" });
      toast.success(outcome.summary);
    } else if (outcome.reason === "stale") {
      updateActionStatus(threadId, messageId, action.id, "stale", STALE_MESSAGE);
      logAudit(threadId, "action_stale", STALE_MESSAGE, { messageId, actionId: action.id });
      toast.error(STALE_MESSAGE);
    } else {
      updateActionStatus(threadId, messageId, action.id, "failed", outcome.summary);
      logAudit(threadId, "action_failed", outcome.summary, { messageId, actionId: action.id });
      toast.error(outcome.summary);
    }
    setConfirmAction(null);
  };

  const rejectAction = (threadId: string, messageId: string, action: CopilotProposedAction) => {
    updateActionStatus(threadId, messageId, action.id, "rejected");
    logAudit(threadId, "suggestion_rejected", action.label, { messageId, actionId: action.id });
    setConfirmAction(null);
  };

  const handleOpenSource = (threadId: string, messageId: string, ref: CopilotReference) => {
    if (!ref.route || !ref.route.startsWith("/app")) {
      toast.error("Fonte sem rota interna válida.");
      return;
    }
    logAudit(threadId, "source_opened", `${ref.label}`, { messageId });
    setOpen(false);
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", ref.route);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl flex flex-col p-0"
        aria-describedby="copilot-desc"
      >
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            Copiloto Nexo
          </SheetTitle>
          <SheetDescription id="copilot-desc" className="text-xs">
            <span className="block font-semibold text-primary">{SIMULATION_BANNER}</span>
            <span className="block">{SIMULATION_DESCRIPTION}</span>
            <span className="mt-1 block text-muted-foreground">{EPHEMERAL_WARNING}</span>
          </SheetDescription>
          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
            <Badge variant="secondary">{routeContext.moduleLabel}</Badge>
            {routeContext.entityLabel && (
              <Badge variant="outline">{routeContext.entityLabel}</Badge>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                const t = createThread("Nova conversa");
                setActiveId(t.id);
              }}
              className="ml-auto h-7"
            >
              <Plus className="h-3 w-3 mr-1" /> Nova
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setAuditOpen(true)}
              className="h-7"
              aria-label="Abrir histórico do copiloto"
            >
              <History className="h-3 w-3 mr-1" /> Histórico
            </Button>
          </div>
        </SheetHeader>

        <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-3 self-start">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="library"><BookOpen className="h-3 w-3 mr-1" /> Biblioteca</TabsTrigger>
            <TabsTrigger value="threads">Conversas</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden mt-0">
            <ScrollArea className="flex-1 px-4 py-4" aria-live="polite" aria-label="Mensagens do copiloto">
              {!active || active.messages.length === 0 ? (
                <EmptyState suggestions={suggestions} onPick={send} />
              ) : (
                <div className="space-y-4">
                  {active.messages.map((m) => (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      onAction={(a) => openConfirm(active.id, m.id, a, m.references)}
                      onOpenSource={(ref) => handleOpenSource(active.id, m.id, ref)}
                      onReject={(a) => rejectAction(active.id, m.id, a)}
                      onFeedback={(helpful, reason) =>
                        setMessageFeedback(active.id, m.id, { helpful, reason, createdAt: copilotNow() })
                      }
                      onCopy={() => {
                        void navigator.clipboard?.writeText(m.text);
                        logAudit(active.id, "text_copied", "Texto copiado", { messageId: m.id });
                        toast.success("Texto copiado.");
                      }}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>

            <form onSubmit={handleSubmit} className="border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <label htmlFor="copilot-input" className="sr-only">
                Pergunte ao Copiloto Nexo
              </label>
              <Textarea
                id="copilot-input"
                ref={composerRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 2000))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={`Pergunte sobre ${routeContext.moduleLabel.toLowerCase()}…`}
                rows={2}
                aria-describedby="copilot-counter"
                className="mb-2 resize-none"
              />
              <div className="flex items-center gap-2">
                <span id="copilot-counter" className="text-xs text-muted-foreground">
                  {input.length}/2000
                </span>
                {processing ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="ml-auto"
                    onClick={() => processing.cancel()}
                  >
                    <Square className="h-3 w-3 mr-1" /> Parar
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="sm"
                    className="ml-auto"
                    disabled={!input.trim()}
                    aria-label="Enviar pergunta"
                  >
                    <Send className="h-3 w-3 mr-1" /> Enviar
                  </Button>
                )}
              </div>
            </form>
          </TabsContent>

          <TabsContent value="library" className="flex-1 overflow-hidden mt-0">
            <PromptLibrary onPick={(text) => setInput(text)} onSend={(t) => send(t)} />
          </TabsContent>

          <TabsContent value="threads" className="flex-1 overflow-hidden mt-0">
            <ThreadList
              threads={threads}
              activeId={active?.id ?? null}
              onSelect={(id) => setActiveId(id)}
              onRename={(id) => {
                const nome = window.prompt("Novo nome da conversa:");
                if (nome && nome.trim()) renameThread(id, nome.trim());
              }}
              onArchive={(id) => archiveThread(id)}
              onClear={(id) => {
                if (window.confirm("Limpar mensagens desta conversa?")) clearThread(id);
              }}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>

      <AlertDialog open={!!confirmAction} onOpenChange={(v) => !v && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar ação proposta</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong className="text-foreground">Ação:</strong> {confirmAction?.action.label}</p>
                <p><strong className="text-foreground">Registro afetado:</strong> {confirmAction?.action.targetType} · {confirmAction?.action.targetId}</p>
                <p><strong className="text-foreground">Alterações previstas:</strong> {confirmAction?.action.description}</p>
                <p><strong className="text-foreground">Risco:</strong> {confirmAction?.action.risk}</p>
                <p className="text-xs italic">Fontes utilizadas foram exibidas na mensagem original.</p>
                {confirmAction?.action.risk === "high" && (
                  <label className="flex items-center gap-2 rounded border p-2 mt-2">
                    <Checkbox
                      checked={confirmAction.ackHighRisk}
                      onCheckedChange={(v) =>
                        setConfirmAction((s) => (s ? { ...s, ackHighRisk: Boolean(v) } : s))
                      }
                    />
                    <span className="text-xs">
                      Revisei a alteração e desejo aplicá-la.
                    </span>
                  </label>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (!confirmAction) return;
                rejectAction(confirmAction.threadId, confirmAction.messageId, confirmAction.action);
              }}
            >
              Rejeitar sugestão
            </Button>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmApply();
              }}
              disabled={confirmAction?.action.risk === "high" && !confirmAction.ackHighRisk}
            >
              Confirmar e aplicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AuditDialog open={auditOpen} onOpenChange={setAuditOpen} />
    </Sheet>
  );
}

function EmptyState({
  suggestions,
  onPick,
}: {
  suggestions: readonly string[];
  onPick: (text: string) => void;
}) {
  const { routeContext } = useCopilotContext();
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Como posso ajudar neste contexto?</h3>
        <p className="text-xs text-muted-foreground">
          Módulo atual: {routeContext.moduleLabel}
          {routeContext.entityLabel ? ` — ${routeContext.entityLabel}` : ""}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {suggestions.map((s) => (
          <Button
            key={s}
            type="button"
            variant="outline"
            size="sm"
            className="justify-start text-left"
            onClick={() => onPick(s)}
          >
            {s}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground border-t pt-3">
        <strong>{SIMULATION_BANNER}.</strong> {SIMULATION_DESCRIPTION}
      </p>
    </div>
  );
}

function MessageBubble({
  message,
  onAction,
  onOpenSource,
  onReject,
  onFeedback,
  onCopy,
}: {
  message: import("./copilot-types").CopilotMessage;
  onAction: (a: CopilotProposedAction) => void;
  onOpenSource: (r: CopilotReference) => void;
  onReject: (a: CopilotProposedAction) => void;
  onFeedback: (helpful: boolean, reason?: string) => void;
  onCopy: () => void;
}) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : ""}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm"
            : "max-w-[95%] text-sm"
        }
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <span>{isUser ? "Você" : "Copiloto Nexo"}</span>
          <span aria-hidden="true">·</span>
          <time>{new Date(message.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time>
          {message.status === "pending" && <span role="status">Processando…</span>}
          {message.status === "failed" && <span role="alert">Falhou</span>}
        </div>
        <div className="whitespace-pre-wrap">{message.text}</div>

        {!isUser && message.references.length > 0 && (
          <div className="mt-3 rounded border bg-muted/30 p-2">
            <p className="text-xs font-semibold text-muted-foreground">Fontes consultadas</p>
            <ul className="mt-2 space-y-2">
              {message.references.map((r) => {
                const canOpen = !!r.route && r.route.startsWith("/app");
                return (
                  <li key={r.id} className="rounded border bg-background p-2 text-xs">
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant="outline">{SOURCE_TYPE_LABEL[r.sourceType]}</Badge>
                      <span className="font-medium">{r.label.slice(0, 120)}</span>
                    </div>
                    {r.excerpt && (
                      <p className="mt-1 text-muted-foreground line-clamp-3">"{r.excerpt}"</p>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Módulo: {SOURCE_TYPE_LABEL[r.sourceType]}
                    </p>
                    {canOpen ? (
                      <Button
                        size="sm"
                        variant="link"
                        className="mt-1 h-6 p-0"
                        onClick={() => onOpenSource(r)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" /> Abrir fonte
                      </Button>
                    ) : (
                      <p className="mt-1 text-[10px] italic text-muted-foreground">
                        Fonte disponível apenas como referência nesta etapa.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {!isUser && message.proposedActions.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.proposedActions.map((a) => (
              <div key={a.id} className="rounded border bg-muted/40 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Risco: {a.risk} · Estado: {a.status}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAction(a)}
                      disabled={a.status === "applied" || a.status === "rejected" || a.status === "stale"}
                    >
                      Revisar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onReject(a)}>
                      Rejeitar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isUser && message.status === "completed" && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            <Button size="sm" variant="ghost" onClick={onCopy} aria-label="Copiar resposta">
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant={message.feedback?.helpful === true ? "default" : "ghost"}
              onClick={() => onFeedback(true)}
              aria-label="Marcar como útil"
            >
              <ThumbsUp className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant={message.feedback?.helpful === false ? "default" : "ghost"}
              onClick={() => {
                const reason = window.prompt("Motivo (opcional):", "Dados insuficientes");
                onFeedback(false, reason ?? undefined);
              }}
              aria-label="Marcar como não útil"
            >
              <ThumbsDown className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function PromptLibrary({
  onPick,
  onSend,
}: {
  onPick: (text: string) => void;
  onSend: (text: string) => void;
}) {
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState<PromptCategory | "all">("all");
  const results = searchPrompts(q, cat === "all" ? undefined : cat);
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 flex gap-2 border-b">
        <Input
          placeholder="Buscar perguntas…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar biblioteca de perguntas"
        />
        <Select value={cat} onValueChange={(v) => setCat(v as PromptCategory | "all")}>
          <SelectTrigger className="w-44" aria-label="Filtrar categoria">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {PROMPT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {results.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum resultado na biblioteca.</p>
          )}
          {results.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded border p-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm">{p.text}</p>
                <p className="text-xs text-muted-foreground">{p.category}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => onPick(p.text)}>
                Inserir
              </Button>
              <Button size="sm" onClick={() => onSend(p.text)}>
                Enviar
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
      <p className="text-xs text-muted-foreground p-3 border-t">
        Total: {COPILOT_PROMPT_LIBRARY.length} perguntas.
      </p>
    </div>
  );
}

function ThreadList({
  threads,
  activeId,
  onSelect,
  onRename,
  onArchive,
  onClear,
}: {
  threads: readonly CopilotThread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string) => void;
  onArchive: (id: string) => void;
  onClear: (id: string) => void;
}) {
  const active = threads.filter((t) => t.status === "active");
  const archived = threads.filter((t) => t.status === "archived");
  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        {active.length === 0 && archived.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma conversa.</p>
        )}
        {active.map((t) => (
          <div
            key={t.id}
            className={`rounded border p-2 ${t.id === activeId ? "bg-muted" : ""}`}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelect(t.id)}
                className="flex-1 text-left"
              >
                <p className="text-sm font-medium">{t.title}</p>
                <p className="text-xs text-muted-foreground">
                  {t.messages.length} mensagens
                </p>
              </button>
              <Button size="icon" variant="ghost" onClick={() => onRename(t.id)} aria-label="Renomear conversa">
                <ExternalLink className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => onClear(t.id)} aria-label="Limpar conversa">
                <Trash2 className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => onArchive(t.id)} aria-label="Arquivar conversa">
                <Archive className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
        {archived.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mt-4">Arquivadas</p>
            {archived.map((t) => (
              <div key={t.id} className="rounded border p-2 opacity-60 mt-1">
                <p className="text-sm">{t.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function AuditDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const events = listAudit();
  const [q, setQ] = React.useState("");
  const [type, setType] = React.useState<string>("all");
  const filtered = events.filter((e) => {
    if (type !== "all" && e.eventType !== type) return false;
    if (!q.trim()) return true;
    return (e.summary + e.eventType).toLowerCase().includes(q.toLowerCase());
  });
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Histórico do copiloto</SheetTitle>
          <SheetDescription>Registro append-only dos eventos.</SheetDescription>
        </SheetHeader>
        <div className="flex gap-2 my-3">
          <Input placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os eventos</SelectItem>
              {Object.keys(AUDIT_EVENT_LABEL).map((k) => (
                <SelectItem key={k} value={k}>{AUDIT_EVENT_LABEL[k as keyof typeof AUDIT_EVENT_LABEL]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ScrollArea className="h-[70vh]">
          <div className="space-y-2">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum evento de auditoria.</p>
            )}
            {filtered.map((e) => (
              <div key={e.id} className="rounded border p-2 text-xs">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{AUDIT_EVENT_LABEL[e.eventType]}</Badge>
                  <time className="text-muted-foreground">{new Date(e.createdAt).toLocaleString("pt-BR")}</time>
                </div>
                <p className="mt-1">{e.summary}</p>
                {e.outcome && <p className="text-muted-foreground">Resultado: {e.outcome}</p>}
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
