/**
 * LV-09.1B.6.3B.2.1 — Identidade semântica estável do detalhe.
 * LV-09.1B.6.3B.2.1.1 — Snapshots síncronos para invalidação assíncrona.
 * LV-09.1B.6.3B.2.1.2 — Gates completos e propriedade dos locks.
 *
 * Módulo puro. Não conhece React nem TanStack Router.
 *
 * `buildAgendaDetailSelectionKey` deriva a chave semântica estável
 * `${type}:${caseId}:${id}` para uma seleção. Duas seleções que apontam
 * para o mesmo item produzem chaves idênticas mesmo que a referência do
 * objeto `SelectedAgendaItem` mude entre renders.
 *
 * `buildAgendaDetailActivationKey` combina `active` e a chave semântica em
 * uma única chave de ativação. Ela é `null` sempre que o detalhe estiver
 * inativo (ou sem seleção) e volta a ser a chave semântica quando o
 * detalhe volta a estar ativo. Efeitos que dependem apenas dela não
 * disparam por mudanças de `referenceEpoch` ou por recriação do objeto
 * `selected`.
 *
 * `isAgendaDetailAsyncResultCurrent` centraliza o gate de aplicação de
 * um resultado assíncrono: só é considerado atual quando o componente
 * ainda está montado, a operação não foi cancelada, o detalhe segue
 * ativo, a chave semântica no momento da resolução é a mesma capturada
 * no início da requisição, e (quando aplicável) o request ID monotônico
 * também é o corrente.
 *
 * `deriveAgendaDetailActivityState` deriva `hasActiveSelection` e
 * `isInteractiveReady` a partir dos estados observáveis do componente,
 * separando "temos seleção ativa" de "conteúdo pronto para interagir".
 */
import type { AppointmentId, CaseId, DeadlineId } from "@/domain/core/ids";

export type AgendaDetailSelectionKey = string & {
  readonly __agendaDetailSelectionKey: unique symbol;
};

export type AgendaDetailSelectionInput =
  | Readonly<{ type: "deadline"; caseId: CaseId; id: DeadlineId }>
  | Readonly<{ type: "appointment"; caseId: CaseId; id: AppointmentId }>
  | null;

export function buildAgendaDetailSelectionKey(
  selected: AgendaDetailSelectionInput,
): AgendaDetailSelectionKey | null {
  if (!selected) return null;
  const raw = `${selected.type}:${String(selected.caseId)}:${String(selected.id)}`;
  return raw as AgendaDetailSelectionKey;
}

/**
 * Combina atividade + chave semântica em uma única chave. `null` quando
 * inativo, chave semântica quando ativo. Efeitos de reset dependem dela.
 */
export function buildAgendaDetailActivationKey(
  active: boolean,
  selectionKey: AgendaDetailSelectionKey | null,
): AgendaDetailSelectionKey | null {
  return active ? selectionKey : null;
}

// ---------------------------------------------------------------------------
// Invalidação assíncrona
// ---------------------------------------------------------------------------

export interface AgendaDetailAsyncGuard {
  readonly mounted: boolean;
  readonly active: boolean;
  readonly cancelled: boolean;
  readonly currentSelectionKey: AgendaDetailSelectionKey | null;
  readonly requestSelectionKey: AgendaDetailSelectionKey | null;
  /**
   * Quando informado, o resultado só é considerado corrente se este
   * request ID for o mesmo em vigor no momento da aplicação.
   */
  readonly currentRequestId?: number;
  readonly requestId?: number;
}

export function isAgendaDetailAsyncResultCurrent(
  guard: AgendaDetailAsyncGuard,
): boolean {
  if (!guard.mounted) return false;
  if (guard.cancelled) return false;
  if (!guard.active) return false;
  if (guard.currentSelectionKey === null) return false;
  if (guard.requestSelectionKey === null) return false;
  if (guard.currentSelectionKey !== guard.requestSelectionKey) return false;
  if (
    typeof guard.currentRequestId === "number" &&
    typeof guard.requestId === "number" &&
    guard.currentRequestId !== guard.requestId
  ) {
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Estado de atividade / prontidão
// ---------------------------------------------------------------------------

export interface AgendaDetailActivityInputs {
  readonly active: boolean;
  readonly hasSelection: boolean;
  readonly selectionKey: AgendaDetailSelectionKey | null;
  readonly detailReady: boolean;
}

export interface AgendaDetailActivityState {
  readonly hasActiveSelection: boolean;
  readonly isInteractiveReady: boolean;
}

export function deriveAgendaDetailActivityState(
  inputs: AgendaDetailActivityInputs,
): AgendaDetailActivityState {
  const hasActiveSelection =
    inputs.active && inputs.hasSelection && inputs.selectionKey !== null;
  const isInteractiveReady = hasActiveSelection && inputs.detailReady;
  return { hasActiveSelection, isInteractiveReady };
}
