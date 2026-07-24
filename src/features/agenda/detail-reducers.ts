/**
 * LV-09.1B.5.2 — Reducers e helpers puros do fluxo de detalhe/edição.
 *
 * Extraídos do `AgendaItemDetailDialog` para permitir testes comportamentais
 * reais (sem `readFileSync`/`toContain` no fonte). São usados pelo componente
 * real — não são utilitários apenas de teste.
 *
 * Sem React, sem I/O, sem `Date.now()`. Somente decisões determinísticas
 * a partir das entradas.
 */

import type { Appointment, Deadline } from "@/domain/core/agenda";
import type { ServiceResult } from "@/domain/services/result";
import {
  resolveCreatedItemVisibility,
  type AgendaLoadStateSnapshot,
  type PendingCreatedItem,
} from "./created-visibility";
import type {
  BuildUpdateAppointmentResult,
  BuildUpdateDeadlineResult,
} from "./edit-form";

// ---- 1) resolveDetailLoadResponse ---------------------------------------

export type DetailReadyType = "deadline" | "appointment";

export type DetailStateSnapshot =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "ready"; type: "deadline"; item: Deadline }>
  | Readonly<{ kind: "ready"; type: "appointment"; item: Appointment }>
  | Readonly<{ kind: "not_found" }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "error"; message: string }>;

/**
 * Decide como uma resposta assíncrona de `getById` deve afetar o estado
 * do detalhe, considerando o `requestId` corrente. Respostas de requisições
 * anteriores retornam `"ignore"` para que o consumidor descarte sem efeito.
 */
export function resolveDetailLoadResponse(
  currentRequestId: number,
  incoming: Readonly<{
    requestId: number;
    type: DetailReadyType;
    response: ServiceResult<Deadline> | ServiceResult<Appointment>;
  }>,
  errorMessage = "Não foi possível carregar este item.",
): DetailStateSnapshot | "ignore" {
  if (incoming.requestId !== currentRequestId) return "ignore";
  if (!incoming.response.ok) {
    const code = incoming.response.error.code;
    if (code === "not_found") return { kind: "not_found" };
    if (code === "forbidden" || code === "unauthorized")
      return { kind: "forbidden" };
    return { kind: "error", message: errorMessage };
  }
  if (incoming.type === "deadline") {
    return {
      kind: "ready",
      type: "deadline",
      item: incoming.response.data as Deadline,
    };
  }
  return {
    kind: "ready",
    type: "appointment",
    item: incoming.response.data as Appointment,
  };
}

// ---- 2) deriveEditUiState -----------------------------------------------

export type EditUiInputs = Readonly<{
  mode: "view" | "edit";
  perm: "unknown" | "loading" | "allowed" | "denied";
  submitting: boolean;
  build: BuildUpdateDeadlineResult | BuildUpdateAppointmentResult | null;
  storedErrors: Readonly<Record<string, string>>;
  touched: Readonly<Record<string, boolean>>;
  attemptedSubmit: boolean;
}>;

export type EditUiState = Readonly<{
  canSubmit: boolean;
  displayErrors: Readonly<Record<string, string>>;
}>;

/**
 * Derivação pura do estado de UI de edição a partir do resultado do builder
 * oficial (fonte única da validade) e da política de exibição progressiva
 * de erros (só mostra depois de `touched` ou `attemptedSubmit`).
 */
export function deriveEditUiState(inputs: EditUiInputs): EditUiState {
  const { mode, perm, submitting, build, storedErrors, touched, attemptedSubmit } =
    inputs;

  const canSubmit =
    mode === "edit" &&
    perm === "allowed" &&
    !submitting &&
    build !== null &&
    build.ok === true &&
    build.changed === true;

  const merged: Record<string, string> = { ...storedErrors };
  if (build && build.ok === false) {
    for (const [k, v] of Object.entries(build.errors)) {
      if (merged[k]) continue;
      // Regra progressiva: mostra o erro apenas se o campo foi tocado ou
      // se já houve tentativa de submit.
      if (attemptedSubmit || touched[k]) merged[k] = v as string;
    }
  }
  return { canSubmit, displayErrors: Object.freeze(merged) };
}

// ---- 3) resolveDiscardIntent --------------------------------------------

export type DiscardIntent = "close" | "cancel_edit" | "reload_after_conflict";

export type DiscardContext = Readonly<{
  mode: "view" | "edit";
  hasChanges: boolean;
  submitting: boolean;
}>;

export type DiscardDecision =
  | Readonly<{ action: "blocked" }>
  | Readonly<{ action: "run"; intent: DiscardIntent }>
  | Readonly<{ action: "confirm"; intent: DiscardIntent }>;

/**
 * Regra:
 * - `submitting` bloqueia qualquer intento;
 * - `close` só pede confirmação se estiver em modo edit com alterações;
 * - `cancel_edit` e `reload_after_conflict` pedem confirmação sempre que
 *   houver alterações; caso contrário rodam imediatamente.
 */
export function resolveDiscardIntent(
  intent: DiscardIntent,
  ctx: DiscardContext,
): DiscardDecision {
  if (ctx.submitting) return { action: "blocked" };
  if (intent === "close") {
    if (ctx.mode === "edit" && ctx.hasChanges)
      return { action: "confirm", intent };
    return { action: "run", intent };
  }
  if (ctx.hasChanges) return { action: "confirm", intent };
  return { action: "run", intent };
}

// ---- 4) reduceConflictAction --------------------------------------------

export type ConflictState = Readonly<{
  expected?: number;
  actual?: number;
}> | null;

export type ConflictAction =
  | Readonly<{ type: "receive_conflict"; expected?: number; actual?: number }>
  | Readonly<{ type: "keep_reviewing" }>
  | Readonly<{ type: "reload_confirmed" }>
  | Readonly<{ type: "reset" }>;

export function reduceConflictAction(
  _state: ConflictState,
  action: ConflictAction,
): ConflictState {
  switch (action.type) {
    case "receive_conflict":
      return Object.freeze({
        ...(action.expected !== undefined ? { expected: action.expected } : {}),
        ...(action.actual !== undefined ? { actual: action.actual } : {}),
      });
    case "keep_reviewing":
    case "reload_confirmed":
    case "reset":
      return null;
  }
}

// ---- 5) resolvePendingUpdateAction + buildPendingUpdateMarker ----------

export type PendingUpdateSideEffect =
  | Readonly<{ kind: "wait" }>
  | Readonly<{ kind: "clear_silent" }>
  | Readonly<{ kind: "clear_with_notice" }>;

/**
 * Traduz a decisão pura de visibilidade em um efeito colateral discreto
 * para o consumidor:
 *  - `wait` mantém o marcador;
 *  - `clear_silent` limpa o marcador sem aviso (item visível);
 *  - `clear_with_notice` limpa e sinaliza que o item ficou fora da vista
 *    corrente (deve emitir exatamente um aviso).
 */
export function resolvePendingUpdateAction(
  pending: PendingCreatedItem,
  loadState: AgendaLoadStateSnapshot,
  visibleDeadlineIds: ReadonlySet<string>,
  visibleAppointmentIds: ReadonlySet<string>,
): PendingUpdateSideEffect {
  const decision = resolveCreatedItemVisibility(
    pending,
    loadState,
    visibleDeadlineIds,
    visibleAppointmentIds,
  );
  if (decision === "wait") return { kind: "wait" };
  if (decision === "visible") return { kind: "clear_silent" };
  return { kind: "clear_with_notice" };
}

/**
 * Constrói o marcador de "item recém-atualizado" reservando a próxima
 * geração de recarga da Agenda como a mínima aceitável para decidir
 * visibilidade.
 */
export function buildPendingUpdateMarker(
  currentLoadGeneration: number,
  updated: Readonly<{
    type: "deadline" | "appointment";
    item: Readonly<{ id: unknown }>;
  }>,
): PendingCreatedItem {
  return Object.freeze({
    id: String(updated.item.id),
    type: updated.type,
    requiredGeneration: currentLoadGeneration + 1,
  });
}
