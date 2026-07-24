/**
 * LV-09.1B.6.2 — Helpers puros consumidos pelos fluxos de mutação da Agenda.
 *
 * Sem React, sem I/O, sem `Date.now()`. São usados pelos componentes reais e
 * exercitados diretamente pelos testes comportamentais (não são utilitários
 * exclusivos de teste).
 */

import type { PermissionEvalState } from "./item-mutations";
import type { ServiceResult } from "@/domain/services/result";
import type { PermissionEvaluation } from "@/domain/services/permissions";

// ---------------------------------------------------------------------------
// 1) Decisão pura de bloqueio síncrono
// ---------------------------------------------------------------------------

export type MutationLockInputs = Readonly<{
  mutationRefLocked: boolean;
  mutating: boolean;
  submitting: boolean;
}>;

export type MutationLockDecision = Readonly<{
  canClose: boolean;
  canEnterEdit: boolean;
  canOpenConfirmation: boolean;
  canRetryPermissions: boolean;
}>;

/**
 * Fonte única de verdade sobre o que pode ou não acontecer enquanto uma
 * mutação ou submit está em andamento. O componente real consome esta
 * decisão em vez de duplicar as regras.
 */
export function deriveMutationLockDecisions(
  inputs: MutationLockInputs,
): MutationLockDecision {
  const anyMutation = inputs.mutationRefLocked || inputs.mutating;
  const anySubmit = inputs.submitting;
  const locked = anyMutation || anySubmit;
  return Object.freeze({
    canClose: !locked,
    canEnterEdit: !anyMutation && !anySubmit,
    canOpenConfirmation: !anyMutation && !anySubmit,
    canRetryPermissions: !anyMutation && !anySubmit,
  });
}

// ---------------------------------------------------------------------------
// 2) Resolução de avaliação de permissão
// ---------------------------------------------------------------------------

export type PermissionEvaluationOutcome =
  | Readonly<{ kind: "resolved"; result: ServiceResult<PermissionEvaluation> }>
  | Readonly<{ kind: "rejected" }>;

/**
 * Converte o retorno do serviço oficial de permissões em um estado da
 * máquina `PermissionEvalState`. Promises rejeitadas e falhas de serviço
 * geram `error`; respostas com `allowed=true` → `allowed`; caso contrário
 * `denied`. Nunca lê `context.role`.
 */
export function resolvePermissionEvaluation(
  outcome: PermissionEvaluationOutcome,
): PermissionEvalState {
  if (outcome.kind === "rejected") return "error";
  const res = outcome.result;
  if (!res.ok) return "error";
  return res.data.allowed ? "allowed" : "denied";
}

/**
 * Regra oficial de exibição do banner de retry: qualquer uma das três
 * permissões (update, changeStatus, remove) em `error` habilita o aviso.
 */
export function hasPermissionEvaluationError(
  states: Readonly<{
    update: PermissionEvalState;
    changeStatus: PermissionEvalState;
    remove: PermissionEvalState;
  }>,
): boolean {
  return (
    states.update === "error" ||
    states.changeStatus === "error" ||
    states.remove === "error"
  );
}

// ---------------------------------------------------------------------------
// 3) Reducer puro para ações após conflito de mutação
// ---------------------------------------------------------------------------

export type MutationConflictAction = "continue_reviewing" | "reload";

export type MutationConflictEffect = Readonly<{
  /** Fecha o AlertDialog de confirmação atual. */
  closeConfirmation: true;
  /** Limpa a mensagem de erro exibida. */
  clearError: true;
  /** Limpa o estado unificado de conflito. */
  clearConflict: true;
  /** Preserva o detalhe carregado (não desmonta). */
  preserveDetail: true;
  /** Indica se um novo carregamento do detalhe deve ser iniciado. */
  reloadDetail: boolean;
  /** Nunca reexecuta `changeStatus` automaticamente. */
  retryChangeStatus: false;
  /** Nunca reexecuta `remove` automaticamente. */
  retryRemove: false;
}>;

export function resolveMutationConflictAction(
  action: MutationConflictAction,
): MutationConflictEffect {
  const reload = action === "reload";
  return Object.freeze({
    closeConfirmation: true as const,
    clearError: true as const,
    clearConflict: true as const,
    preserveDetail: true as const,
    reloadDetail: reload,
    retryChangeStatus: false as const,
    retryRemove: false as const,
  });
}

// ---------------------------------------------------------------------------
// 4) Single-flight lock (testável, sem React)
// ---------------------------------------------------------------------------

export interface SingleFlightLock {
  readonly isLocked: () => boolean;
  readonly tryAcquire: () => boolean;
  readonly release: () => void;
}

/**
 * Estrutura simples de aquisição síncrona. A primeira chamada a
 * `tryAcquire` bloqueia novas aquisições até que `release` seja invocado.
 * Não usa React nem Promises — é uma referência mutável explícita.
 *
 * O componente real usa esta mesma implementação (`mutationInFlightRef`
 * é adaptado via `bindSingleFlightLockToRef` para preservar a nomenclatura
 * usada nos testes de fonte existentes).
 */
export function createSingleFlightLock(): SingleFlightLock {
  let locked = false;
  return {
    isLocked: () => locked,
    tryAcquire: () => {
      if (locked) return false;
      locked = true;
      return true;
    },
    release: () => {
      locked = false;
    },
  };
}

/**
 * Adapta uma ref mutável ({ current: boolean }) — como `React.useRef` —
 * ao contrato de `SingleFlightLock`. Permite que o componente real e os
 * testes exercitem exatamente o mesmo comportamento sem depender de React.
 */
export function bindSingleFlightLockToRef(
  ref: { current: boolean },
): SingleFlightLock {
  return {
    isLocked: () => ref.current === true,
    tryAcquire: () => {
      if (ref.current) return false;
      ref.current = true;
      return true;
    },
    release: () => {
      ref.current = false;
    },
  };
}
