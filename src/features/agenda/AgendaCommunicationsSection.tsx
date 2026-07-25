/**
 * LV-09.2B2 — Seção de Comunicações e presença dentro do detalhe do
 * compromisso. Renderiza as cinco ações rápidas e o histórico completo
 * paginado (append-only).
 *
 * Regras principais:
 *  - Todo o histórico é obtido via
 *    `environment.services.communications.listByAppointment`.
 *  - Percorre todas as páginas até `nextCursor` ausente, com teto de
 *    `COMMUNICATION_HISTORY_MAX_PAGES` e detecção de cursor repetido.
 *  - Rejeita respostas obsoletas via token monotônico.
 *  - Invalida requisições em voo ao desativar a seção ou desmontar.
 *  - Nenhuma alteração automática do compromisso é feita a partir daqui.
 */

import * as React from "react";
import {
  CalendarPlus,
  CheckCircle2,
  MessageSquare,
  PhoneOff,
  UserX,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import type { Communication } from "@/domain/core/communication";
import {
  isCommunicationChannel,
  isCommunicationDirection,
  isCommunicationKind,
  isCommunicationOutcome,
} from "@/domain/core/communication";
import type { AppointmentId, CaseId } from "@/domain/core/ids";
import type { MockDomainEnvironment } from "@/domain/mocks";
import type { ServiceContext } from "@/domain/services/context";
import type { PageResult } from "@/domain/services/pagination";
import { PAGE_LIMIT_MAX } from "@/domain/services/pagination";
import type { ServiceResult } from "@/domain/services/result";

import { AgendaCommunicationDialog } from "./AgendaCommunicationDialog";
import type { CommunicationQuickAction } from "./communication-form";
import {
  getCommunicationActionLabel,
  getCommunicationChannelLabel,
  getCommunicationDirectionLabel,
  getCommunicationKindLabel,
  getCommunicationOutcomeLabel,
} from "./communication-labels";

// ---- Props ---------------------------------------------------------------

export interface AgendaCommunicationsSectionProps {
  readonly active: boolean;
  readonly environment: MockDomainEnvironment;
  readonly context: ServiceContext;
  readonly caseId: CaseId;
  readonly appointmentId: AppointmentId;
}

// ---- Constantes ----------------------------------------------------------

export const COMMUNICATION_HISTORY_MAX_PAGES = 20;

// ---- Estados -------------------------------------------------------------

type PermState = "checking" | "allowed" | "denied" | "error";

type HistoryState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; items: readonly Communication[] }
  | { kind: "forbidden" }
  | { kind: "offline" }
  | { kind: "cursor_repeat" }
  | { kind: "page_limit" }
  | { kind: "error" };

// ---- Helpers puros -------------------------------------------------------

export type HistoryLoadResult =
  | Readonly<{ kind: "ready"; items: readonly Communication[] }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "offline" }>
  | Readonly<{ kind: "cursor_repeat" }>
  | Readonly<{ kind: "page_limit" }>
  | Readonly<{ kind: "error" }>;

export function mapServiceErrorToHistory(code: string): HistoryLoadResult {
  if (code === "forbidden") return { kind: "forbidden" };
  if (code === "offline") return { kind: "offline" };
  return { kind: "error" };
}

export type CommunicationPageFetch = (
  cursor: string | undefined,
) => Promise<ServiceResult<PageResult<Communication>>>;

/**
 * Percorre todas as páginas do histórico até esgotar `nextCursor`,
 * respeitando um teto seguro (`maxPages`) e detectando cursor repetido.
 * Não depende de React — é diretamente testável de forma comportamental.
 */
export async function loadCommunicationHistoryPages(
  fetchPage: CommunicationPageFetch,
  opts: { readonly maxPages?: number } = {},
): Promise<HistoryLoadResult> {
  const maxPages = opts.maxPages ?? COMMUNICATION_HISTORY_MAX_PAGES;
  const acc: Communication[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined = undefined;
  for (let page = 0; page < maxPages; page += 1) {
    let r: ServiceResult<PageResult<Communication>>;
    try {
      r = await fetchPage(cursor);
    } catch {
      return { kind: "error" };
    }
    if (!r.ok) {
      return mapServiceErrorToHistory(r.error.code);
    }
    for (const it of r.data.items) acc.push(it);
    const next = r.data.nextCursor;
    if (!next) return { kind: "ready", items: acc };
    if (seenCursors.has(next)) return { kind: "cursor_repeat" };
    seenCursors.add(next);
    cursor = next;
  }
  return { kind: "page_limit" };
}

// Ações fixas (ordem estável).
type ActionIcon = typeof PhoneOff;
const ACTIONS: readonly {
  action: CommunicationQuickAction;
  icon: ActionIcon;
}[] = [
  { action: "contact", icon: PhoneOff },
  { action: "confirm", icon: CheckCircle2 },
  { action: "absence", icon: UserX },
  { action: "cancellation", icon: MessageSquare },
  { action: "reschedule_request", icon: CalendarPlus },
];

// ---- Componente ----------------------------------------------------------

export function AgendaCommunicationsSection(
  props: AgendaCommunicationsSectionProps,
): React.ReactElement {
  const { active, environment, context, caseId, appointmentId } = props;

  const [perm, setPerm] = React.useState<PermState>("checking");
  const [permissionAttempt, setPermissionAttempt] = React.useState(0);
  const [history, setHistory] = React.useState<HistoryState>({ kind: "idle" });
  const [dialogAction, setDialogAction] =
    React.useState<CommunicationQuickAction | null>(null);
  const [savedAnnouncement, setSavedAnnouncement] = React.useState<{
    id: number;
    text: string;
  }>({ id: 0, text: "" });

  const triggerRefs = React.useRef<
    Record<CommunicationQuickAction, HTMLButtonElement | null>
  >({
    contact: null,
    confirm: null,
    absence: null,
    cancellation: null,
    reschedule_request: null,
  });
  const currentTriggerRef = React.useRef<HTMLElement | null>(null);

  // Tokens monotônicos para descartar respostas obsoletas.
  const historyReqIdRef = React.useRef(0);
  const permReqIdRef = React.useRef(0);
  const mountedRef = React.useRef(true);

  // Invalida tudo ao desmontar.
  React.useEffect(
    () => () => {
      mountedRef.current = false;
      historyReqIdRef.current += 1;
      permReqIdRef.current += 1;
    },
    [],
  );

  const selectionKey = `${caseId}|${appointmentId}`;

  // Ao desativar a seção, invalida ciclos em voo e limpa estado transitório.
  React.useEffect(() => {
    if (active) return;
    historyReqIdRef.current += 1;
    permReqIdRef.current += 1;
    setHistory({ kind: "idle" });
    setDialogAction(null);
    setSavedAnnouncement((prev) => ({ id: prev.id + 1, text: "" }));
  }, [active]);

  // Avaliação unificada de permissão (efeito único; retry via contador).
  React.useEffect(() => {
    if (!active) return;
    const reqId = ++permReqIdRef.current;
    setPerm("checking");
    let cancelled = false;
    const capturedCase = caseId;
    (async () => {
      try {
        const r = await environment.services.permissions.evaluate(context, {
          action: "communication.create",
          caseId: capturedCase,
        });
        if (cancelled || !mountedRef.current) return;
        if (permReqIdRef.current !== reqId) return;
        if (capturedCase !== caseId) return;
        if (!r.ok) {
          setPerm("error");
          return;
        }
        setPerm(r.data.allowed ? "allowed" : "denied");
      } catch {
        if (cancelled || !mountedRef.current) return;
        if (permReqIdRef.current !== reqId) return;
        setPerm("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, environment, context, caseId, permissionAttempt]);

  const loadHistory = React.useCallback(async (): Promise<void> => {
    if (!active) return;
    const reqId = ++historyReqIdRef.current;
    const capturedCase = caseId;
    const capturedAppt = appointmentId;
    setHistory({ kind: "loading" });
    const result = await loadCommunicationHistoryPages((cursor) =>
      environment.services.communications.listByAppointment(
        context,
        capturedCase,
        capturedAppt,
        {
          page: {
            limit: PAGE_LIMIT_MAX,
            ...(cursor ? { cursor } : {}),
          },
        },
      ),
    );
    if (!mountedRef.current) return;
    if (!active) return;
    if (historyReqIdRef.current !== reqId) return;
    if (capturedCase !== caseId || capturedAppt !== appointmentId) return;
    setHistory(result);
  }, [active, environment, context, caseId, appointmentId]);

  // Recarga por mudança de seleção/ativação.
  React.useEffect(() => {
    if (!active) return;
    void loadHistory();
  }, [active, selectionKey, loadHistory]);

  const openDialog = React.useCallback((a: CommunicationQuickAction) => {
    currentTriggerRef.current = triggerRefs.current[a];
    setDialogAction(a);
  }, []);

  const handleOpenChange = React.useCallback((next: boolean) => {
    if (!next) setDialogAction(null);
  }, []);

  const announceSaved = React.useCallback(() => {
    // Limpa e re-emite o texto para garantir novo anúncio por leitores de tela.
    setSavedAnnouncement((prev) => ({ id: prev.id + 1, text: "" }));
    requestAnimationFrame(() => {
      if (!mountedRef.current) return;
      setSavedAnnouncement((prev) => ({ id: prev.id + 1, text: "Registro salvo" }));
    });
  }, []);

  const handleSaved = React.useCallback(() => {
    announceSaved();
    // Nova carga completa após criação, invalidando respostas em voo.
    void loadHistory();
  }, [announceSaved, loadHistory]);

  const returnFocusRef = React.useRef<HTMLElement | null>(null);
  // Sincroniza returnFocusRef com currentTriggerRef ao mudar diálogo.
  React.useEffect(() => {
    returnFocusRef.current = currentTriggerRef.current;
  }, [dialogAction]);

  const canRegister = perm === "allowed";
  const permEvaluating = perm === "checking";
  const permErrored = perm === "error";

  return (
    <section
      className="mt-4 rounded-lg border bg-card p-4"
      aria-labelledby="agenda-communications-title"
      data-testid="agenda-communications-section"
    >
      <header className="mb-3">
        <h3
          id="agenda-communications-title"
          className="text-base font-semibold"
        >
          Comunicações e presença
        </h3>
        <p className="text-sm text-muted-foreground">
          Registre tentativas de contato, confirmações, ausências, cancelamentos
          e pedidos de reagendamento.
        </p>
      </header>

      {/* Ações */}
      <div
        className="mb-4 flex flex-wrap gap-2"
        role="group"
        aria-label="Ações de comunicação"
      >
        {ACTIONS.map(({ action, icon: Icon }) => (
          <Button
            key={action}
            ref={(el) => {
              triggerRefs.current[action] = el;
            }}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => openDialog(action)}
            disabled={!canRegister || permEvaluating}
            data-action={action}
          >
            <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
            {getCommunicationActionLabel(action)}
          </Button>
        ))}
      </div>

      {perm === "denied" && (
        <div
          role="status"
          className="mb-3 rounded-md border border-border/70 bg-muted/30 p-2 text-xs text-muted-foreground"
        >
          Você não tem permissão para registrar comunicações neste compromisso.
        </div>
      )}

      {permErrored && (
        <div
          role="status"
          className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 bg-muted/30 p-2 text-xs text-muted-foreground"
        >
          <span>Não foi possível verificar a permissão de registro.</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setPermissionAttempt((v) => v + 1)}
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Histórico */}
      <div
        aria-live="polite"
        className="sr-only"
        key={savedAnnouncement.id}
      >
        {savedAnnouncement.text}
      </div>

      <HistoryView state={history} onRetry={() => void loadHistory()} />

      <AgendaCommunicationDialog
        open={dialogAction !== null}
        action={dialogAction}
        environment={environment}
        context={context}
        caseId={caseId}
        appointmentId={appointmentId}
        returnFocusRef={returnFocusRef}
        onOpenChange={handleOpenChange}
        onSaved={handleSaved}
      />
    </section>
  );
}

// ---- Histórico -----------------------------------------------------------

function HistoryView(props: {
  state: HistoryState;
  onRetry: () => void;
}): React.ReactElement {
  const { state, onRetry } = props;

  if (state.kind === "idle" || state.kind === "loading") {
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-md border border-dashed border-border/70 p-3 text-sm text-muted-foreground"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Carregando registros…
      </div>
    );
  }
  if (state.kind === "forbidden") {
    return (
      <div role="status" className="rounded-md border p-3 text-sm text-muted-foreground">
        Você não tem permissão para visualizar estes registros.
      </div>
    );
  }
  if (state.kind === "offline") {
    return (
      <div role="status" className="rounded-md border p-3 text-sm text-muted-foreground">
        Você está offline.{" "}
        <button
          type="button"
          onClick={onRetry}
          className="text-primary underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }
  if (state.kind === "cursor_repeat") {
    return (
      <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
        Não foi possível concluir o carregamento porque o serviço repetiu o
        cursor.{" "}
        <button type="button" onClick={onRetry} className="underline">
          Tentar novamente
        </button>
      </div>
    );
  }
  if (state.kind === "page_limit") {
    return (
      <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
        Não foi possível concluir o carregamento porque o limite seguro foi
        atingido.{" "}
        <button type="button" onClick={onRetry} className="underline">
          Tentar novamente
        </button>
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
        Não foi possível carregar os registros.{" "}
        <button type="button" onClick={onRetry} className="underline">
          Tentar novamente
        </button>
      </div>
    );
  }
  const items = state.items;
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
        Nenhuma comunicação registrada
      </div>
    );
  }
  return (
    <ul className="divide-y rounded-md border" data-testid="agenda-communications-history">
      {items.map((c) => (
        <li key={c.id} className="space-y-1 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="font-medium break-words">
              {isCommunicationKind(c.kind)
                ? getCommunicationKindLabel(c.kind)
                : c.kind}
            </strong>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {isCommunicationOutcome(c.outcome)
                ? getCommunicationOutcomeLabel(c.outcome)
                : c.outcome}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {isCommunicationDirection(c.direction)
                ? getCommunicationDirectionLabel(c.direction)
                : c.direction}
            </span>
            {c.channel && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  {isCommunicationChannel(c.channel)
                    ? getCommunicationChannelLabel(c.channel)
                    : c.channel}
                </span>
              </>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(c.occurredAt).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          {c.subject && (
            <div className="break-words text-sm">{c.subject}</div>
          )}
          {c.note && (
            <div className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
              {c.note}
            </div>
          )}
          {c.recipientLabel && (
            <div className="text-xs text-muted-foreground">
              Destinatário: {c.recipientLabel}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
