import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMockDomain } from "@/components/app/MockDomainProvider";
import {
  ProcessListFilters,
  type ProcessFiltersValue,
} from "@/features/processos/ProcessListFilters";
import { ProcessListTable } from "@/features/processos/ProcessListTable";
import { ProcessListCards } from "@/features/processos/ProcessListCards";
import {
  ProcessListEmptyFiltered,
  ProcessListEmptyOverall,
  ProcessListError,
  ProcessListSkeleton,
} from "@/features/processos/ProcessListState";
import {
  DEFAULT_SORT_ID,
  PROCESS_PAGE_LIMIT,
  buildCaseListRequest,
  mapServiceErrorToMessage,
} from "@/features/processos/process-list-model";
import type { Case } from "@/domain/core/case";
import type { PageResult } from "@/domain/services/pagination";
import type { ServiceError } from "@/domain/services/result";

export const Route = createFileRoute("/app/processos/")({
  head: () => ({
    meta: [
      { title: "Processos — Nexo Pericial 360" },
      {
        name: "description",
        content:
          "Organize os processos e acompanhe a situação atual do trabalho pericial.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProcessosPage,
});

const INITIAL_FILTERS: ProcessFiltersValue = {
  search: "",
  status: "all",
  confidentiality: "all",
  sortId: DEFAULT_SORT_ID,
};

type ListState =
  | { kind: "loading" }
  | { kind: "success"; page: PageResult<Case>; hasFilters: boolean }
  | { kind: "error"; message: string };

function filtersAreEmpty(v: ProcessFiltersValue): boolean {
  return (
    v.search.trim().length === 0 &&
    v.status === "all" &&
    v.confidentiality === "all"
  );
}

function ProcessosPage() {
  const { environment, context } = useMockDomain();
  const [filters, setFilters] = React.useState<ProcessFiltersValue>(INITIAL_FILTERS);
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [history, setHistory] = React.useState<readonly string[]>([]);
  const [state, setState] = React.useState<ListState>({ kind: "loading" });
  const requestIdRef = React.useRef(0);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const runQuery = React.useCallback(
    (
      nextFilters: ProcessFiltersValue,
      nextCursor: string | undefined,
    ) => {
      const id = ++requestIdRef.current;
      setState({ kind: "loading" });
      const request = buildCaseListRequest({
        search: nextFilters.search,
        status: nextFilters.status,
        confidentiality: nextFilters.confidentiality,
        sortId: nextFilters.sortId,
        cursor: nextCursor,
        limit: PROCESS_PAGE_LIMIT,
      });
      void environment.services.cases
        .list(context, request)
        .then((result) => {
          if (!mountedRef.current) return;
          if (id !== requestIdRef.current) return; // resposta obsoleta
          if (!result.ok) {
            setState({
              kind: "error",
              message: mapServiceErrorToMessage(result.error as ServiceError),
            });
            return;
          }
          setState({
            kind: "success",
            page: result.data,
            hasFilters: !filtersAreEmpty(nextFilters),
          });
        });
    },
    [environment, context],
  );

  // Consulta inicial + toda vez que filtros/cursor mudam.
  React.useEffect(() => {
    runQuery(filters, cursor);
  }, [runQuery, filters, cursor]);

  const applyFilters = (next: ProcessFiltersValue) => {
    setFilters(next);
    setCursor(undefined);
    setHistory([]);
  };

  const clearFilters = () => applyFilters(INITIAL_FILTERS);

  const goNext = () => {
    if (state.kind !== "success" || !state.page.nextCursor) return;
    setHistory((h) => [...h, cursor ?? ""]);
    setCursor(state.page.nextCursor);
  };

  const goPrev = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1]!;
    setHistory((h) => h.slice(0, -1));
    setCursor(previous === "" ? undefined : previous);
  };

  const isFirstPage = history.length === 0;
  const hasNext =
    state.kind === "success" && state.page.nextCursor !== undefined;
  const total = state.kind === "success" ? state.page.total : undefined;
  const showClear = !filtersAreEmpty(filters);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Processos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize os processos e acompanhe a situação atual do trabalho pericial.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/app/processos/novo">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Novo processo
          </Link>
        </Button>
      </header>

      <Card>
        <CardContent className="p-0">
          <ProcessListFilters
            value={filters}
            onChange={applyFilters}
            onClear={clearFilters}
            showClear={showClear}
          />
        </CardContent>
      </Card>

      {typeof total === "number" && state.kind === "success" && (
        <p
          className="text-sm text-muted-foreground"
          aria-live="polite"
        >
          {total} {total === 1 ? "processo" : "processos"} no escopo atual
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          {state.kind === "loading" && <ProcessListSkeleton />}

          {state.kind === "error" && (
            <ProcessListError
              message={state.message}
              onRetry={() => runQuery(filters, cursor)}
            />
          )}

          {state.kind === "success" && state.page.items.length === 0 && (
            state.hasFilters ? (
              <ProcessListEmptyFiltered onClear={clearFilters} />
            ) : (
              <ProcessListEmptyOverall />
            )
          )}

          {state.kind === "success" && state.page.items.length > 0 && (
            <>
              <ProcessListTable items={state.page.items} />
              <ProcessListCards items={state.page.items} />
            </>
          )}
        </CardContent>
      </Card>

      {state.kind === "success" && state.page.items.length > 0 && (
        <nav
          className="flex items-center justify-between gap-3"
          aria-label="Paginação de processos"
        >
          <Button
            type="button"
            variant="outline"
            onClick={goPrev}
            disabled={isFirstPage}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={goNext}
            disabled={!hasNext}
            className="gap-2"
          >
            Próxima
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </nav>
      )}
    </div>
  );
}
