/**
 * LV-09.1B.6.3B.2.1   — Identidade semântica estável do detalhe.
 * LV-09.1B.6.3B.2.1.1 — Snapshots síncronos para invalidação assíncrona.
 * LV-09.1B.6.3B.2.1.2 — Gates completos e propriedade dos locks.
 * LV-09.1B.6.3B.2.1.3 — Vinculação do detalhe à seleção e geração
 *                        monotônica de atividade.
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
 * no início da requisição, a **geração de atividade** capturada é a
 * corrente (LV-…2.1.3, para diferenciar A → B → A) e (quando aplicável)
 * o request ID monotônico também é o corrente.
 *
 * `deriveAgendaDetailActivityState` deriva `hasActiveSelection` e
 * `isInteractiveReady` a partir dos estados observáveis do componente,
 * separando "temos seleção ativa" de "conteúdo pronto para interagir".
 * A prontidão exige que o detalhe carregado pertença à geração de
 * atividade atual (LV-…2.1.3): um snapshot órfão de uma sessão anterior
 * é considerado "não pronto" mesmo que `detail.kind === "ready"`.
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
   * LV-09.1B.6.3B.2.1.3 — identifica a sessão de atividade (monotônica).
   * Distingue A → B → A: a segunda ocorrência de A tem geração maior que
   * a primeira, e resultados capturados na primeira sessão não são
   * aplicados na terceira, mesmo com a chave semântica coincidente.
   */
  readonly currentActivityGeneration?: number;
  readonly requestActivityGeneration?: number;
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
    typeof guard.currentActivityGeneration === "number" &&
    typeof guard.requestActivityGeneration === "number" &&
    guard.currentActivityGeneration !== guard.requestActivityGeneration
  ) {
    return false;
  }
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
  /**
   * LV-09.1B.6.3B.2.1.3 — o snapshot de detalhe pertence à geração de
   * atividade atual? Um snapshot órfão (de sessão anterior) é apresentado
   * como "não pronto" mesmo que `detailReady === true`.
   */
  readonly detailBelongsToCurrentActivity: boolean;
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
  const isInteractiveReady =
    hasActiveSelection &&
    inputs.detailBelongsToCurrentActivity &&
    inputs.detailReady;
  return { hasActiveSelection, isInteractiveReady };
}

// ---------------------------------------------------------------------------
// LV-09.1B.6.3B.2.1.3.1 — Sessão de atividade segura para renders concorrentes.
//
// A geração de atividade não pode mais avançar por mutação de ref durante o
// render (React 18+ pode descartar renders). A sessão **confirmada** vive em
// state; cada render deriva uma sessão candidata a partir dela. Só o commit
// (via layout effect isomórfico) promove a sessão candidata a confirmada.
//
// Uma renderização abandonada calcula uma geração candidata que jamais é
// confirmada — a próxima render volta a derivar a partir da sessão
// confirmada anterior, preservando A → B → A e o cenário de render de B
// descartado.
// ---------------------------------------------------------------------------

export interface AgendaDetailActivitySession {
  readonly activationKey: AgendaDetailSelectionKey | null;
  readonly generation: number;
}

export function createAgendaDetailActivitySession(
  activationKey: AgendaDetailSelectionKey | null,
): AgendaDetailActivitySession {
  return Object.freeze({ activationKey, generation: 0 });
}

export function deriveAgendaDetailRenderSession(
  committed: AgendaDetailActivitySession,
  activationKey: AgendaDetailSelectionKey | null,
): AgendaDetailActivitySession {
  if (committed.activationKey === activationKey) {
    return committed;
  }
  return Object.freeze({
    activationKey,
    generation: committed.generation + 1,
  });
}
