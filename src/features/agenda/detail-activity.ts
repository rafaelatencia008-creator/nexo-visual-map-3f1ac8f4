/**
 * LV-09.1B.6.3B.2.1.1 — Identidade semântica estável do detalhe.
 *
 * `buildAgendaDetailSelectionKey` deriva uma chave string única para uma
 * seleção — `${type}:${caseId}:${id}`. Duas seleções que apontam para o
 * mesmo item da agenda produzem chaves idênticas, mesmo que a referência
 * do objeto `SelectedAgendaItem` mude entre renderizações. Isso permite:
 *
 *  - reagir a mudanças de seleção sem re-executar efeitos quando o pai
 *    apenas recria o objeto;
 *  - invalidar respostas assíncronas comparando a chave capturada no
 *    início da requisição com a chave corrente no momento da resolução.
 *
 * Módulo puro. Não conhece React nem TanStack Router.
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
