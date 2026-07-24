/**
 * LV-09.1B.2.1 — Helpers puros e determinísticos para as visualizações
 * temporais da Agenda. Sem React, sem I/O, sem `Date.now()`.
 *
 * Compartilhados entre a tela `/app/agenda` e os testes de regressão,
 * evitando divergências entre teste e produção.
 */

import type { Deadline } from "@/domain/core/agenda";
import { isoDateTimeToEpoch } from "@/domain/core/common";

// ---- Datas ---------------------------------------------------------------

export function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

/** Semana começando na segunda-feira (padrão pt-BR). */
export function startOfWeek(d: Date): Date {
  const c = startOfDay(d);
  const day = c.getDay();
  const diff = (day + 6) % 7;
  return addDays(c, -diff);
}

export function startOfMonth(d: Date): Date {
  const c = new Date(d.getFullYear(), d.getMonth(), 1);
  c.setHours(0, 0, 0, 0);
  return c;
}

/**
 * Constrói a grade mensal da Agenda como 42 células (6 semanas × 7 dias),
 * começando na segunda-feira anterior (ou igual) ao primeiro dia do mês.
 */
export function buildMonthCells(anchor: Date): readonly Date[] {
  const first = startOfMonth(anchor);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

// ---- Seleções ------------------------------------------------------------

/**
 * Seleciona os próximos prazos pendentes a partir de `referenceEpoch`:
 *  - inclui apenas `status === "pending"`;
 *  - exclui `completed` e `cancelled`;
 *  - exclui vencidos (`epoch(dueAt) < referenceEpoch`);
 *  - ordena cronologicamente, com desempate estável por `id`;
 *  - trunca no `limit` (padrão 5).
 */
export function selectUpcomingDeadlines(
  deadlines: readonly Deadline[],
  referenceEpoch: number,
  limit: number = 5,
): readonly Deadline[] {
  return deadlines
    .filter(
      (d) =>
        d.status === "pending" &&
        isoDateTimeToEpoch(d.dueAt) >= referenceEpoch,
    )
    .slice()
    .sort((a, b) => {
      const t = isoDateTimeToEpoch(a.dueAt) - isoDateTimeToEpoch(b.dueAt);
      if (t !== 0) return t;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    })
    .slice(0, Math.max(0, limit));
}
