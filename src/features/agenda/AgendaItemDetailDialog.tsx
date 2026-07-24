/**
 * LV-09.1B.6.3B.2.1 — Wrapper fino de diálogo para o fluxo de detalhe da
 * Agenda.
 *
 * Toda a lógica funcional (carregamento, permissões, edição, submit,
 * mudanças de status, exclusão, conflitos, single-flight, descarte,
 * confirmações, seis gates unificados) foi movida para
 * `AgendaItemDetailContent`. Este arquivo preserva a API pública histórica
 * (`AgendaItemDetailDialog`, `AgendaItemDetailDialogProps`,
 * `SelectedAgendaItem`, `AgendaItemUpdated`, `AgendaItemDeleted`) para não
 * quebrar consumidores existentes.
 *
 * O wrapper contém apenas: shell `<Dialog>`, título/descrição acessíveis
 * do Radix e delegação do pedido de fechamento para o handle imperativo
 * exposto pelo Content. NÃO contém formulários, submit, permissões,
 * validação, single-flight, locks, conflitos, reducers ou toasts.
 */

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { Case } from "@/domain/core/case";
import type { MockDomainEnvironment } from "@/domain/mocks";
import type { ServiceContext } from "@/domain/services/context";

import {
  AgendaItemDetailContent,
  type AgendaItemDetailContentHandle,
  type AgendaItemDeleted,
  type AgendaItemUpdated,
  type SelectedAgendaItem,
} from "./AgendaItemDetailContent";

// Reexporta os tipos históricos para preservar consumidores antigos.
export type {
  SelectedAgendaItem,
  AgendaItemUpdated,
  AgendaItemDeleted,
} from "./AgendaItemDetailContent";

export interface AgendaItemDetailDialogProps {
  readonly selected: SelectedAgendaItem | null;
  readonly onClose: () => void;
  readonly environment: MockDomainEnvironment;
  readonly context: ServiceContext;
  readonly cases: readonly Case[];
  readonly onUpdated: (updated: AgendaItemUpdated) => void;
  readonly onDeleted: (deleted: AgendaItemDeleted) => void;
  /** Instante de referência para estado visual derivado (ex.: "Atrasado"). */
  readonly referenceEpoch: number;
}

export function AgendaItemDetailDialog(
  props: AgendaItemDetailDialogProps,
): React.ReactElement {
  const {
    selected,
    onClose,
    environment,
    context,
    cases,
    onUpdated,
    onDeleted,
    referenceEpoch,
  } = props;

  const open = selected !== null;
  const contentRef = React.useRef<AgendaItemDetailContentHandle | null>(null);

  // Fechamento externo (X, Escape, clique fora): delega ao Content, que
  // concentra a decisão sobre descarte de alterações e locks. Fallback
  // direto para `onClose` só ocorre se o Content ainda não estiver montado.
  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) return;
      const handle = contentRef.current;
      if (handle) {
        handle.requestClose();
        return;
      }
      onClose();
    },
    [onClose],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[95vh] w-[calc(100vw-1rem)] max-w-lg overflow-y-auto p-0 sm:max-w-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Detalhe do item da agenda</DialogTitle>
          <DialogDescription>
            Informações completas do item selecionado. Ajustes seguem as
            regras oficiais de permissão e concorrência.
          </DialogDescription>
        </DialogHeader>
        <AgendaItemDetailContent
          ref={contentRef}
          active={open}
          surface="dialog"
          selected={selected}
          environment={environment}
          context={context}
          cases={cases}
          onUpdated={onUpdated}
          onDeleted={onDeleted}
          onRequestClose={onClose}
          referenceEpoch={referenceEpoch}
        />
      </DialogContent>
    </Dialog>
  );
}
