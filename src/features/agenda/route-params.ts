/**
 * LV-09.1B.6.3A.2 — Helpers puros de search params da Agenda.
 *
 * Sem React, sem serviços, sem store/seed/snapshot. Todas as funções são
 * puras e determinísticas, projetadas para uso em `validateSearch` do
 * TanStack Router e para testes comportamentais isolados.
 */

import { isCaseId, type CaseId } from "@/domain/core/ids";

/**
 * Normaliza o search param `caseId` da rota `/app/agenda/novo`.
 *
 * Retorna:
 * - o próprio `CaseId` quando `value` é uma string com o prefixo oficial;
 * - `undefined` para qualquer outra entrada (string vazia, prefixo errado,
 *   `null`, `undefined`, número, objeto, array etc.).
 *
 * Nunca lança. Nunca faz cast bruto. Nunca acessa serviços ou storage.
 */
export function resolveAgendaNovoCaseId(value: unknown): CaseId | undefined {
  if (isCaseId(value)) return value;
  return undefined;
}
