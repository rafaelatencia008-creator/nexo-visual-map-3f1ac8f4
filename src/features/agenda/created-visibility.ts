/**
 * LV-09.1B.4.2 — Decisão pura de visibilidade do item recém-criado.
 *
 * Sem React, sem toast, sem `Date.now()`, sem serviços. Recebe:
 *   - `pending`: item criado que ainda precisa ser conferido, incluindo a
 *     geração mínima de recarga da Agenda que precisa terminar.
 *   - `loadState`: instantâneo do estado de carregamento da Agenda com a
 *     geração associada.
 *   - `visibleDeadlineIds` / `visibleAppointmentIds`: conjuntos dos IDs
 *     visíveis no momento (após filtros e período).
 *
 * Devolve:
 *   - "wait" enquanto a resposta correta ainda não chegou (ou chegou como
 *     erro / geração obsoleta / carregamento em andamento);
 *   - "visible" se a resposta correta chegou e o ID está listado;
 *   - "hidden" se a resposta correta chegou e o ID não está listado.
 *
 * O helper não muta os parâmetros e não depende do relógio.
 */

export type PendingCreatedType = "deadline" | "appointment";

export type PendingCreatedItem = Readonly<{
  id: string;
  type: PendingCreatedType;
  requiredGeneration: number;
}>;

export type AgendaLoadStateSnapshot =
  | { readonly kind: "loading"; readonly generation: number }
  | { readonly kind: "ready"; readonly generation: number }
  | { readonly kind: "error"; readonly generation: number };

export type CreatedVisibilityDecision = "wait" | "visible" | "hidden";

export function resolveCreatedItemVisibility(
  pending: PendingCreatedItem,
  loadState: AgendaLoadStateSnapshot,
  visibleDeadlineIds: ReadonlySet<string>,
  visibleAppointmentIds: ReadonlySet<string>,
): CreatedVisibilityDecision {
  // Consultas anteriores à criação nunca resolvem a visibilidade.
  if (loadState.generation < pending.requiredGeneration) return "wait";
  // Carregando ou em erro na geração exigida: aguardar.
  if (loadState.kind !== "ready") return "wait";
  const set =
    pending.type === "deadline" ? visibleDeadlineIds : visibleAppointmentIds;
  return set.has(pending.id) ? "visible" : "hidden";
}
