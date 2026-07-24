/**
 * LV-09.1B.5 — Generalização da estratégia de gerações para itens da Agenda.
 *
 * Reexporta o helper puro criado na LV-09.1B.4.2. A mesma lógica é usada
 * para detectar visibilidade tanto do item recém-criado quanto do item
 * recém-atualizado, evitando duplicação e a condição de corrida original.
 */

export {
  resolveCreatedItemVisibility as resolveAgendaItemVisibility,
  type PendingCreatedItem as PendingAgendaItemMarker,
  type PendingCreatedType as AgendaItemMarkerType,
  type CreatedVisibilityDecision as AgendaItemVisibilityDecision,
  type AgendaLoadStateSnapshot,
} from "./created-visibility";
