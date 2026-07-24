/**
 * LV-09.1B.6.3B.1 — Wrapper fino de diálogo para o fluxo de criação da
 * Agenda.
 *
 * Toda a lógica funcional foi movida para `AgendaCreateContent`. Este
 * arquivo preserva a API pública histórica (`AgendaCreateDialog`,
 * `AgendaCreateDialogProps`, `AgendaCreatedItem`) para não quebrar
 * consumidores existentes.
 *
 * O wrapper contém apenas: shell de diálogo, título e descrição
 * acessíveis, ref para delegar solicitação de fechamento ao Content.
 * NÃO contém formulários, submit, permissões, validação, rascunho ou
 * regras de single-flight — essas responsabilidades vivem exclusivamente
 * em `AgendaCreateContent`.
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
import type { CaseId } from "@/domain/core/ids";
import type { MockDomainEnvironment } from "@/domain/mocks";
import type { ServiceContext } from "@/domain/services/context";

import {
  AgendaCreateContent,
  type AgendaCreateContentHandle,
  type AgendaCreatedItem,
} from "./AgendaCreateContent";

// Reexporta o tipo histórico para preservar consumidores antigos.
export type { AgendaCreatedItem } from "./AgendaCreateContent";

export interface AgendaCreateDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly environment: MockDomainEnvironment;
  readonly context: ServiceContext;
  readonly cases: readonly Case[];
  readonly initialCaseId?: CaseId;
  readonly onCreated: (created: AgendaCreatedItem) => void;
  /**
   * Define se o Content chama `onRequestClose()` depois de uma criação
   * bem-sucedida. O padrão permanece `true` (fecha após criar).
   * Consumidores que já controlam navegação/rota após o sucesso podem
   * passar `false` para evitar uma segunda navegação disparada pelo
   * fechamento automático.
   */
  readonly closeAfterCreate?: boolean;
}

export function AgendaCreateDialog(
  props: AgendaCreateDialogProps,
): React.ReactElement {
  const {
    open,
    onOpenChange,
    environment,
    context,
    cases,
    initialCaseId,
    onCreated,
    closeAfterCreate,
  } = props;

  const contentRef = React.useRef<AgendaCreateContentHandle | null>(null);

  // Fechamento externo (X, Escape, clique fora): não decidimos aqui se há
  // rascunho — delegamos ao Content, que já concentra essa regra.
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (next) {
        onOpenChange(true);
        return;
      }
      contentRef.current?.requestClose();
    },
    [onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[95vh] w-[calc(100vw-1rem)] max-w-lg overflow-y-auto p-0 sm:max-w-2xl"
        onEscapeKeyDown={(e) => {
          // Deixa o Radix chamar handleOpenChange(false); o Content decide
          // se há rascunho e se abre a confirmação de descarte.
          void e;
        }}
      >
        <DialogHeader className="border-b px-4 py-3 sm:px-6">
          <DialogTitle>Novo item na agenda</DialogTitle>
          <DialogDescription>
            Escolha entre criar um prazo ou um compromisso vinculado a um processo.
          </DialogDescription>
        </DialogHeader>
        <AgendaCreateContent
          ref={contentRef}
          active={open}
          surface="dialog"
          environment={environment}
          context={context}
          cases={cases}
          initialCaseId={initialCaseId}
          onCreated={onCreated}
          onRequestClose={() => onOpenChange(false)}
          closeAfterCreate={closeAfterCreate}
        />
      </DialogContent>
    </Dialog>
  );
}
