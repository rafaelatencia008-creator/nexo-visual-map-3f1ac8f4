/**
 * LV-09.1B.6.3A — Estado compartilhado das rotas canônicas da Agenda.
 *
 * Este provider é montado na rota pai `/app/agenda` (layout) e sobrevive à
 * navegação entre `/app/agenda/`, `/app/agenda/novo` e
 * `/app/agenda/$appointmentId`. Concentra:
 *  - filtros, modo de visualização, âncora temporal, "mais filtros";
 *  - marcadores de criação/atualização/remoção com geração de recarga;
 *  - carregamento de processos acessíveis (uma vez por contexto/organização);
 *  - referências mutáveis à geração de carregamento da Agenda.
 *
 * Nada persiste em `localStorage`, `sessionStorage`, singletons ou `window`.
 * Nenhum contrato oficial de domínio ou serviço é alterado.
 */

import * as React from "react";
import type { Case } from "@/domain/core/case";
import type { AgendaFilters } from "./filters";
import { EMPTY_AGENDA_FILTERS } from "./filters";
import type { PendingCreatedItem } from "./created-visibility";
import type { PendingRemovalItem } from "./item-mutations";
import { useMockDomain } from "@/components/app/MockDomainProvider";
import type { MockDomainEnvironment } from "@/domain/mocks";
import type { ServiceContext } from "@/domain/services/context";

export type AgendaViewMode = "day" | "week" | "month";

export type AgendaCasesState =
  | { kind: "loading" }
  | { kind: "ready"; items: readonly Case[] }
  | { kind: "error"; message: string };

export interface AgendaRouteState {
  filters: AgendaFilters;
  setFilters: React.Dispatch<React.SetStateAction<AgendaFilters>>;
  mode: AgendaViewMode;
  setMode: React.Dispatch<React.SetStateAction<AgendaViewMode>>;
  anchor: Date;
  setAnchor: React.Dispatch<React.SetStateAction<Date>>;
  showMore: boolean;
  setShowMore: React.Dispatch<React.SetStateAction<boolean>>;
  reloadKey: number;
  setReloadKey: React.Dispatch<React.SetStateAction<number>>;
  pendingCreated: PendingCreatedItem | null;
  setPendingCreated: React.Dispatch<React.SetStateAction<PendingCreatedItem | null>>;
  pendingUpdated: PendingCreatedItem | null;
  setPendingUpdated: React.Dispatch<React.SetStateAction<PendingCreatedItem | null>>;
  pendingRemoval: PendingRemovalItem | null;
  setPendingRemoval: React.Dispatch<React.SetStateAction<PendingRemovalItem | null>>;
  loadGenerationRef: React.MutableRefObject<number>;
  casesState: AgendaCasesState;
  accessibleCases: readonly Case[];
  environment: MockDomainEnvironment;
  context: ServiceContext;
}

const AgendaRouteStateContext = React.createContext<AgendaRouteState | null>(
  null,
);

export function useAgendaRouteState(): AgendaRouteState {
  const value = React.useContext(AgendaRouteStateContext);
  if (!value) {
    throw new Error(
      "useAgendaRouteState só pode ser usado dentro de <AgendaRouteStateProvider>",
    );
  }
  return value;
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

const CASES_PAGE_LIMIT = 100;
const CASES_MAX_PAGES = 20;

async function loadAllCases(
  environment: MockDomainEnvironment,
  context: ServiceContext,
): Promise<readonly Case[]> {
  const items: Case[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < CASES_MAX_PAGES; i++) {
    const r = await environment.services.cases.list(context, {
      page: cursor
        ? { cursor, limit: CASES_PAGE_LIMIT }
        : { limit: CASES_PAGE_LIMIT },
    });
    if (!r.ok) throw new Error(r.error.message);
    items.push(...r.data.items);
    if (!r.data.nextCursor) return items;
    cursor = r.data.nextCursor;
  }
  return items;
}

export function AgendaRouteStateProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { environment, context } = useMockDomain();
  const [filters, setFilters] =
    React.useState<AgendaFilters>(EMPTY_AGENDA_FILTERS);
  const [mode, setMode] = React.useState<AgendaViewMode>("week");
  const [anchor, setAnchor] = React.useState<Date>(() => startOfDay(new Date()));
  const [showMore, setShowMore] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [pendingCreated, setPendingCreated] =
    React.useState<PendingCreatedItem | null>(null);
  const [pendingUpdated, setPendingUpdated] =
    React.useState<PendingCreatedItem | null>(null);
  const [pendingRemoval, setPendingRemoval] =
    React.useState<PendingRemovalItem | null>(null);
  const loadGenerationRef = React.useRef(0);
  const [casesState, setCasesState] = React.useState<AgendaCasesState>({
    kind: "loading",
  });
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setCasesState({ kind: "loading" });
    loadAllCases(environment, context)
      .then((items) => {
        if (cancelled || !mountedRef.current) return;
        const sorted = items.slice().sort((a, b) =>
          a.reference < b.reference ? -1 : a.reference > b.reference ? 1 : 0,
        );
        setCasesState({ kind: "ready", items: sorted });
      })
      .catch((err: unknown) => {
        if (cancelled || !mountedRef.current) return;
        const message =
          err instanceof Error ? err.message : "Falha ao carregar processos.";
        setCasesState({ kind: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, [environment, context]);

  const accessibleCases: readonly Case[] =
    casesState.kind === "ready" ? casesState.items : [];

  const value = React.useMemo<AgendaRouteState>(
    () => ({
      filters,
      setFilters,
      mode,
      setMode,
      anchor,
      setAnchor,
      showMore,
      setShowMore,
      reloadKey,
      setReloadKey,
      pendingCreated,
      setPendingCreated,
      pendingUpdated,
      setPendingUpdated,
      pendingRemoval,
      setPendingRemoval,
      loadGenerationRef,
      casesState,
      accessibleCases,
      environment,
      context,
    }),
    [
      filters,
      mode,
      anchor,
      showMore,
      reloadKey,
      pendingCreated,
      pendingUpdated,
      pendingRemoval,
      casesState,
      accessibleCases,
      environment,
      context,
    ],
  );

  return (
    <AgendaRouteStateContext.Provider value={value}>
      {children}
    </AgendaRouteStateContext.Provider>
  );
}
