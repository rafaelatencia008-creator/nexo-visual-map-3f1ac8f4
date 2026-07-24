import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  AlertTriangle,
  AlertOctagon,
  Ban,
  Flame,
  Laptop,
  Users as UsersIcon,
  Video,
  XCircle,
  Minus,
  ArrowUp,
  CircleDot,
  FileClock,
  Search,
  X,
  SlidersHorizontal,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import {
  AgendaCreateDialog,
  type AgendaCreatedItem,
} from "@/features/agenda/AgendaCreateDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { useMockDomain } from "@/components/app/MockDomainProvider";
import type { Case } from "@/domain/core/case";
import type {
  Appointment,
  AppointmentKind,
  AppointmentMode,
  AppointmentStatus,
  Deadline,
  DeadlineKind,
  DeadlinePriority,
  DeadlineStatus,
} from "@/domain/core/agenda";
import {
  APPOINTMENT_KINDS,
  APPOINTMENT_MODES,
  DEADLINE_KINDS,
  DEADLINE_PRIORITIES,
} from "@/domain/core/agenda";
import type { CaseId } from "@/domain/core/ids";
import type { PageResult } from "@/domain/services/pagination";
import type { ServiceContext } from "@/domain/services/context";
import type { MockDomainEnvironment } from "@/domain/mocks";
import { isoDateTimeToEpoch, type IsoDateTime } from "@/domain/core/common";
import {
  getAppointmentPresentation,
  getDeadlinePresentation,
  isDeadlineOverdue,
  type DeadlineVisualState,
} from "@/features/agenda/visual-state";
import {
  buildMonthCells,
  selectUpcomingDeadlines,
} from "@/features/agenda/date-view";
import {
  EMPTY_AGENDA_FILTERS,
  buildAppointmentListOptions,
  buildDeadlineListOptions,
  countActiveFilters,
  hasActiveFilters,
  removeFilter,
  sanitizeForItemType,
  shouldQueryAppointments,
  shouldQueryDeadlines,
  shouldShowUpcomingPanel,
  summarizeFilters,
  type AgendaFilterChip,
  type AgendaFilterLabels,
  type AgendaFilters,
  type AgendaItemFilter,
  type AgendaLifecycleFilter,
} from "@/features/agenda/filters";
import {
  resolveCreatedItemVisibility,
  type PendingCreatedItem,
} from "@/features/agenda/created-visibility";
import {
  buildPendingUpdateMarker,
  resolvePendingUpdateAction,
} from "@/features/agenda/detail-reducers";
import {
  AgendaItemDetailDialog,
  type AgendaItemUpdated,
  type SelectedAgendaItem,
} from "@/features/agenda/AgendaItemDetailDialog";
import type { AppointmentId, DeadlineId } from "@/domain/core/ids";


// ============================================================================
// Tela oficial /app/agenda.
// LV-09.1B.1 — estrutura Dia/Semana/Mês e "Próximos prazos".
// LV-09.1B.2 — cards semânticos, acessíveis e responsivos.
// Consome exclusivamente os contratos oficiais (LV-09.1A).
// ============================================================================

export const Route = createFileRoute("/app/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — Nexo Pericial 360" },
      {
        name: "description",
        content:
          "Agenda profissional com visão diária, semanal e mensal de prazos e compromissos.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AgendaPage,
});

// ---- Labels ---------------------------------------------------------------

const DEADLINE_KIND_LABEL: Record<DeadlineKind, string> = {
  procedural: "Processual",
  administrative: "Administrativo",
  internal: "Interno",
};

const DEADLINE_STATUS_LABEL: Record<DeadlineStatus, string> = {
  pending: "Pendente",
  completed: "Cumprido",
  cancelled: "Cancelado",
};

const DEADLINE_PRIORITY_LABEL: Record<DeadlinePriority, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

const APPOINTMENT_KIND_LABEL: Record<AppointmentKind, string> = {
  hearing: "Audiência",
  interview: "Entrevista",
  meeting: "Reunião",
  diligence: "Diligência",
  inspection: "Vistoria",
  other: "Outro",
};

const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: "Agendado",
  completed: "Realizado",
  cancelled: "Cancelado",
};

const APPOINTMENT_MODE_LABEL: Record<AppointmentMode, string> = {
  in_person: "Presencial",
  remote: "Remoto",
  hybrid: "Híbrido",
};

// ---- View mode ------------------------------------------------------------

type ViewMode = "day" | "week" | "month";

const VIEW_LABEL: Record<ViewMode, string> = {
  day: "Dia",
  week: "Semana",
  month: "Mês",
};

// ---- Data loading ---------------------------------------------------------

type AgendaData = {
  readonly deadlines: readonly Deadline[];
  readonly appointments: readonly Appointment[];
};

type LoadState =
  | { kind: "loading"; generation: number }
  | { kind: "ready"; generation: number; data: AgendaData }
  | { kind: "error"; generation: number; message: string };

const PAGE_LIMIT = 100;
const MAX_PAGES = 20;

async function loadAll<T>(
  fetchPage: (cursor: string | undefined) => Promise<
    { ok: true; data: PageResult<T> } | { ok: false; error: { message: string } }
  >,
): Promise<readonly T[]> {
  const items: T[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < MAX_PAGES; i++) {
    const result = await fetchPage(cursor);
    if (!result.ok) {
      throw new Error(result.error.message);
    }
    items.push(...result.data.items);
    if (!result.data.nextCursor) return items;
    cursor = result.data.nextCursor;
  }
  return items;
}

async function fetchAgenda(
  environment: MockDomainEnvironment,
  context: ServiceContext,
  filters: AgendaFilters,
): Promise<AgendaData> {
  const deadlinesBase = buildDeadlineListOptions(filters);
  const appointmentsBase = buildAppointmentListOptions(filters);
  const deadlines = shouldQueryDeadlines(filters)
    ? await loadAll<Deadline>((cursor) =>
        environment.services.deadlines.list(context, {
          ...deadlinesBase,
          page: cursor ? { cursor, limit: PAGE_LIMIT } : { limit: PAGE_LIMIT },
        }),
      )
    : [];
  const appointments = shouldQueryAppointments(filters)
    ? await loadAll<Appointment>((cursor) =>
        environment.services.appointments.list(context, {
          ...appointmentsBase,
          page: cursor ? { cursor, limit: PAGE_LIMIT } : { limit: PAGE_LIMIT },
        }),
      )
    : [];
  return { deadlines, appointments };
}

async function fetchAccessibleCases(
  environment: MockDomainEnvironment,
  context: ServiceContext,
): Promise<readonly Case[]> {
  return loadAll<Case>((cursor) =>
    environment.services.cases.list(context, {
      page: cursor ? { cursor, limit: PAGE_LIMIT } : { limit: PAGE_LIMIT },
    }),
  );
}

// ---- Date helpers ---------------------------------------------------------

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function startOfWeek(d: Date): Date {
  const c = startOfDay(d);
  const day = c.getDay();
  const diff = (day + 6) % 7;
  return addDays(c, -diff);
}

function startOfMonth(d: Date): Date {
  const c = new Date(d.getFullYear(), d.getMonth(), 1);
  c.setHours(0, 0, 0, 0);
  return c;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function rangeForView(anchor: Date, mode: ViewMode): { from: Date; to: Date } {
  if (mode === "day") {
    const from = startOfDay(anchor);
    return { from, to: addDays(from, 1) };
  }
  if (mode === "week") {
    const from = startOfWeek(anchor);
    return { from, to: addDays(from, 7) };
  }
  const from = startOfMonth(anchor);
  const to = new Date(from.getFullYear(), from.getMonth() + 1, 1);
  to.setHours(0, 0, 0, 0);
  return { from, to };
}

function shiftAnchor(anchor: Date, mode: ViewMode, direction: -1 | 1): Date {
  if (mode === "day") return addDays(anchor, direction);
  if (mode === "week") return addDays(anchor, 7 * direction);
  return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);
}

function formatHeading(anchor: Date, mode: ViewMode): string {
  if (mode === "day") {
    return anchor.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }
  if (mode === "week") {
    const from = startOfWeek(anchor);
    const to = addDays(from, 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    return `Semana de ${fmt(from)} a ${fmt(to)}`;
  }
  return anchor.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayShort(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function isInRange(iso: IsoDateTime, from: Date, to: Date): boolean {
  const t = isoDateTimeToEpoch(iso);
  return t >= from.getTime() && t < to.getTime();
}

// ---- Ícones semânticos ----------------------------------------------------

const DEADLINE_STATE_ICON: Record<
  DeadlineVisualState,
  React.ComponentType<{ className?: string }>
> = {
  cancelled: Ban,
  completed: CheckCircle2,
  overdue: AlertOctagon,
  urgent: Flame,
  high: ArrowUp,
  normal: CircleDot,
  low: Minus,
};

const APPOINTMENT_MODE_ICON: Record<
  AppointmentMode,
  React.ComponentType<{ className?: string }>
> = {
  in_person: UsersIcon,
  remote: Video,
  hybrid: Laptop,
};

// ---- Página ---------------------------------------------------------------

// ---- Labels dos filtros ---------------------------------------------------

const ITEM_TYPE_LABEL: Record<AgendaItemFilter, string> = {
  all: "Todos",
  deadlines: "Prazos",
  appointments: "Compromissos",
};

const LIFECYCLE_LABEL: Record<AgendaLifecycleFilter, string> = {
  all: "Todas",
  open: "Em aberto",
  completed: "Concluídas",
  cancelled: "Canceladas",
};

type CasesState =
  | { kind: "loading" }
  | { kind: "ready"; items: readonly Case[] }
  | { kind: "error"; message: string };

function AgendaPage() {
  const { environment, context } = useMockDomain();
  const [filters, setFilters] = React.useState<AgendaFilters>(EMPTY_AGENDA_FILTERS);
  const [state, setState] = React.useState<LoadState>({
    kind: "loading",
    generation: 0,
  });
  const [casesState, setCasesState] = React.useState<CasesState>({ kind: "loading" });
  const [mode, setMode] = React.useState<ViewMode>("week");
  const [anchor, setAnchor] = React.useState<Date>(() => startOfDay(new Date()));
  const [showMore, setShowMore] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [pendingCreated, setPendingCreated] =
    React.useState<PendingCreatedItem | null>(null);
  const [pendingUpdated, setPendingUpdated] =
    React.useState<PendingCreatedItem | null>(null);
  const [selected, setSelected] = React.useState<SelectedAgendaItem | null>(
    null,
  );
  const lastTriggerRef = React.useRef<HTMLElement | null>(null);
  const mountedRef = React.useRef(true);
  const requestIdRef = React.useRef(0);
  const loadGenerationRef = React.useRef(0);
  const newItemButtonRef = React.useRef<HTMLButtonElement | null>(null);


  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Carrega processos acessíveis (contexto/organização/permissões).
  React.useEffect(() => {
    let cancelled = false;
    setCasesState({ kind: "loading" });
    fetchAccessibleCases(environment, context)
      .then((items) => {
        if (cancelled || !mountedRef.current) return;
        // Ordenação estável por referência.
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

  // Recarrega prazos/compromissos ao alterar filtros. Descarta respostas obsoletas.
  React.useEffect(() => {
    const gen = ++loadGenerationRef.current;
    requestIdRef.current = gen;
    setState({ kind: "loading", generation: gen });
    fetchAgenda(environment, context, filters)
      .then((data) => {
        if (!mountedRef.current || gen !== loadGenerationRef.current) return;
        setState({ kind: "ready", generation: gen, data });
      })
      .catch((error: unknown) => {
        if (!mountedRef.current || gen !== loadGenerationRef.current) return;
        const message =
          error instanceof Error ? error.message : "Falha ao carregar agenda.";
        setState({ kind: "error", generation: gen, message });
      });
  }, [environment, context, filters, reloadKey]);

  const range = React.useMemo(() => rangeForView(anchor, mode), [anchor, mode]);
  const nowEpoch = React.useMemo(
    () => Date.now(),
    // Recomputa ao carregar novos dados; não dispara re-render em intervalo.
    [state],
  );

  const visible = React.useMemo(() => {
    if (state.kind !== "ready") {
      return { deadlines: [] as Deadline[], appointments: [] as Appointment[] };
    }
    const deadlines = state.data.deadlines
      .filter((d) => isInRange(d.dueAt, range.from, range.to))
      .slice()
      .sort((a, b) => {
        const t = isoDateTimeToEpoch(a.dueAt) - isoDateTimeToEpoch(b.dueAt);
        return t !== 0 ? t : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
    const appointments = state.data.appointments
      .filter((a) => isInRange(a.startsAt, range.from, range.to))
      .slice()
      .sort((a, b) => {
        const t = isoDateTimeToEpoch(a.startsAt) - isoDateTimeToEpoch(b.startsAt);
        return t !== 0 ? t : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
    return { deadlines, appointments };
  }, [state, range]);

  const upcomingDeadlines = React.useMemo(() => {
    if (state.kind !== "ready") return [] as readonly Deadline[];
    return selectUpcomingDeadlines(state.data.deadlines, nowEpoch, 5);
  }, [state, nowEpoch]);

  const casesById = React.useMemo(() => {
    const m = new Map<CaseId, Case>();
    if (casesState.kind === "ready") {
      for (const c of casesState.items) m.set(c.id, c);
    }
    return m;
  }, [casesState]);

  const caseLabelFor = React.useCallback(
    (id: CaseId): string => {
      const c = casesById.get(id);
      if (!c) return String(id);
      return `${c.reference} — ${c.title}`;
    },
    [casesById],
  );

  const filterLabels: AgendaFilterLabels = React.useMemo(
    () => ({
      itemType: ITEM_TYPE_LABEL,
      lifecycle: LIFECYCLE_LABEL,
      deadlineKind: DEADLINE_KIND_LABEL,
      deadlinePriority: DEADLINE_PRIORITY_LABEL,
      appointmentKind: APPOINTMENT_KIND_LABEL,
      appointmentMode: APPOINTMENT_MODE_LABEL,
      caseLabelFor,
    }),
    [caseLabelFor],
  );

  const chips = React.useMemo(
    () => summarizeFilters(filters, filterLabels),
    [filters, filterLabels],
  );
  const activeCount = countActiveFilters(filters);
  const active = hasActiveFilters(filters);

  const clearAll = React.useCallback(
    () => setFilters(EMPTY_AGENDA_FILTERS),
    [],
  );
  const removeChip = React.useCallback(
    (key: AgendaFilterChip["key"]) =>
      setFilters((f) => removeFilter(f, key)),
    [],
  );

  const isEmptyResults =
    state.kind === "ready" &&
    visible.deadlines.length === 0 &&
    visible.appointments.length === 0;

  const showUpcoming = shouldShowUpcomingPanel(filters);
  const totalVisible = visible.deadlines.length + visible.appointments.length;

  const accessibleCases: readonly Case[] =
    casesState.kind === "ready" ? casesState.items : [];

  const handleCreated = React.useCallback(
    (created: AgendaCreatedItem) => {
      // Reserva a próxima geração de recarga: somente uma consulta iniciada
      // *depois* desta chamada poderá resolver a visibilidade do item.
      const requiredGeneration = loadGenerationRef.current + 1;
      setPendingCreated({
        id: String(created.item.id),
        type: created.type,
        requiredGeneration,
      });
      setReloadKey((k) => k + 1);
      // Retorna o foco ao botão que abriu o diálogo.
      window.setTimeout(() => {
        newItemButtonRef.current?.focus();
      }, 0);
    },
    [],
  );

  const visibleDeadlineIds = React.useMemo(
    () => new Set(visible.deadlines.map((d) => String(d.id))),
    [visible.deadlines],
  );
  const visibleAppointmentIds = React.useMemo(
    () => new Set(visible.appointments.map((a) => String(a.id))),
    [visible.appointments],
  );

  // Após a recarga *da geração correta* concluir, avalia se o item criado
  // aparece na visualização atual. Consulta em andamento, erro ou geração
  // obsoleta mantêm o marcador pendente ("wait").
  React.useEffect(() => {
    if (!pendingCreated) return;
    const decision = resolveCreatedItemVisibility(
      pendingCreated,
      state,
      visibleDeadlineIds,
      visibleAppointmentIds,
    );
    if (decision === "wait") return;
    if (decision === "hidden") {
      toast.info(
        "Item criado com sucesso. Ele não aparece na visualização atual por causa do período ou dos filtros selecionados.",
      );
    }
    setPendingCreated(null);
  }, [pendingCreated, state, visibleDeadlineIds, visibleAppointmentIds]);

  // Mesma estratégia de geração para itens atualizados (LV-09.1B.5).
  React.useEffect(() => {
    if (!pendingUpdated) return;
    const decision = resolveCreatedItemVisibility(
      pendingUpdated,
      state,
      visibleDeadlineIds,
      visibleAppointmentIds,
    );
    if (decision === "wait") return;
    if (decision === "hidden") {
      toast.info(
        "Item atualizado com sucesso. Ele não aparece na visualização atual por causa do período ou dos filtros selecionados.",
      );
    }
    setPendingUpdated(null);
  }, [pendingUpdated, state, visibleDeadlineIds, visibleAppointmentIds]);

  const handleUpdated = React.useCallback((updated: AgendaItemUpdated) => {
    const requiredGeneration = loadGenerationRef.current + 1;
    setPendingUpdated({
      id: String(updated.item.id),
      type: updated.type,
      requiredGeneration,
    });
    setReloadKey((k) => k + 1);
  }, []);

  const openDeadline = React.useCallback(
    (d: Deadline, ev?: React.SyntheticEvent) => {
      if (ev?.currentTarget instanceof HTMLElement) {
        lastTriggerRef.current = ev.currentTarget;
      }
      setSelected({
        type: "deadline",
        caseId: d.caseId,
        id: d.id as DeadlineId,
      });
    },
    [],
  );
  const openAppointment = React.useCallback(
    (a: Appointment, ev?: React.SyntheticEvent) => {
      if (ev?.currentTarget instanceof HTMLElement) {
        lastTriggerRef.current = ev.currentTarget;
      }
      setSelected({
        type: "appointment",
        caseId: a.caseId,
        id: a.id as AppointmentId,
      });
    },
    [],
  );
  const closeDetail = React.useCallback(() => {
    setSelected(null);
    window.setTimeout(() => {
      lastTriggerRef.current?.focus?.();
    }, 0);
  }, []);


  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Agenda
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Prazos e compromissos oficiais em visão diária, semanal e mensal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-border/70 bg-card px-3 py-2 text-sm">
            <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span className="capitalize text-muted-foreground">
              {formatHeading(anchor, mode)}
            </span>
          </div>
          <Button
            ref={newItemButtonRef}
            type="button"
            onClick={() => setCreateOpen(true)}
            disabled={casesState.kind !== "ready" || accessibleCases.length === 0}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Novo item
          </Button>
        </div>
      </header>

      <AgendaCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        environment={environment}
        context={context}
        cases={accessibleCases}
        initialCaseId={filters.caseId ?? undefined}
        onCreated={handleCreated}
      />

      <AgendaItemDetailDialog
        selected={selected}
        onClose={closeDetail}
        environment={environment}
        context={context}
        cases={accessibleCases}
        onUpdated={handleUpdated}
        referenceEpoch={nowEpoch}
      />



      <AgendaFiltersBar
        filters={filters}
        onChange={setFilters}
        cases={casesState}
        activeCount={activeCount}
        showMore={showMore}
        onToggleMore={setShowMore}
      />

      {active && (
        <div
          role="region"
          aria-label="Filtros ativos"
          className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-xs"
        >
          <span aria-live="polite" className="font-medium text-foreground">
            {activeCount} filtro{activeCount === 1 ? "" : "s"} ativo
            {activeCount === 1 ? "" : "s"}
          </span>
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => removeChip(chip.key)}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Remover filtro: ${chip.label}`}
            >
              <span>{chip.label}</span>
              <X className="h-3 w-3" aria-hidden />
            </button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="ml-auto h-7 text-xs"
          >
            Limpar filtros
          </Button>
        </div>
      )}

      <Card className="border-border/70">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAnchor((a) => shiftAnchor(a, mode, -1))}
              aria-label="Período anterior"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAnchor(startOfDay(new Date()))}
            >
              Hoje
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAnchor((a) => shiftAnchor(a, mode, 1))}
              aria-label="Próximo período"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => {
              if (v === "day" || v === "week" || v === "month") setMode(v);
            }}
            aria-label="Modo de visualização"
          >
            {(["day", "week", "month"] as const).map((m) => (
              <ToggleGroupItem key={m} value={m} aria-label={VIEW_LABEL[m]}>
                {VIEW_LABEL[m]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardContent>
      </Card>

      {state.kind === "loading" && (
        <Card className="border-border/70">
          <CardContent
            role="status"
            aria-live="polite"
            className="py-16 text-center text-sm text-muted-foreground"
          >
            Carregando agenda…
          </CardContent>
        </Card>
      )}

      {state.kind === "error" && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent
            role="alert"
            className="flex flex-wrap items-center gap-2 py-6 text-sm text-destructive"
          >
            <AlertTriangle className="h-4 w-4" aria-hidden />
            <span>{state.message}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => setFilters((f) => ({ ...f }))}
            >
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {state.kind === "ready" && (
        <>
          <div
            aria-live="polite"
            className="sr-only"
          >{`${totalVisible} ${totalVisible === 1 ? "item" : "itens"} nesta visão.`}</div>
          <div
            className={
              showUpcoming
                ? "grid gap-6 lg:grid-cols-[1fr,320px]"
                : "grid gap-6"
            }
          >
            <div className="space-y-4">
              {isEmptyResults ? (
                <Card className="border-border/70">
                  <CardContent className="space-y-3 py-12 text-center text-sm text-muted-foreground">
                    <p>
                      {active
                        ? "Nenhum item encontrado com os filtros selecionados."
                        : "Nenhum prazo ou compromisso para este período."}
                    </p>
                    {active && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearAll}
                      >
                        Limpar filtros
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <>
                  {mode === "day" && (
                    <DayView
                      anchor={anchor}
                      deadlines={visible.deadlines}
                      appointments={visible.appointments}
                      nowEpoch={nowEpoch}
                      onOpenDeadline={openDeadline}
                      onOpenAppointment={openAppointment}
                    />
                  )}
                  {mode === "week" && (
                    <WeekView
                      anchor={anchor}
                      deadlines={visible.deadlines}
                      appointments={visible.appointments}
                      nowEpoch={nowEpoch}
                      onPickDay={(d) => {
                        setAnchor(startOfDay(d));
                        setMode("day");
                      }}
                      onOpenDeadline={openDeadline}
                      onOpenAppointment={openAppointment}
                    />
                  )}
                  {mode === "month" && (
                    <MonthView
                      anchor={anchor}
                      deadlines={visible.deadlines}
                      appointments={visible.appointments}
                      nowEpoch={nowEpoch}
                      onPickDay={(d) => {
                        setAnchor(startOfDay(d));
                        setMode("day");
                      }}
                    />
                  )}
                </>
              )}
            </div>

            {showUpcoming && (
              <UpcomingDeadlines
                items={upcomingDeadlines}
                onOpenDeadline={openDeadline}
              />
            )}

          </div>
        </>
      )}
    </div>
  );
}

// ---- Barra de filtros -----------------------------------------------------

function AgendaFiltersBar({
  filters,
  onChange,
  cases,
  activeCount,
  showMore,
  onToggleMore,
}: {
  filters: AgendaFilters;
  onChange: (next: AgendaFilters) => void;
  cases: CasesState;
  activeCount: number;
  showMore: boolean;
  onToggleMore: (next: boolean) => void;
}) {
  const showDeadlineFilters = filters.itemType !== "appointments";
  const showAppointmentFilters = filters.itemType !== "deadlines";
  const casesReady = cases.kind === "ready" ? cases.items : [];
  const noCases = cases.kind === "ready" && casesReady.length === 0;

  return (
    <Card className="border-border/70">
      <CardContent className="space-y-3 pt-6">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1.4fr_180px_1fr_180px_auto]">
          <div className="flex flex-col gap-1">
            <Label
              htmlFor="agenda-busca"
              className="text-xs text-muted-foreground"
            >
              Pesquisar na agenda
            </Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="agenda-busca"
                value={filters.search}
                onChange={(e) => onChange({ ...filters, search: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && filters.search.length > 0) {
                    e.preventDefault();
                    onChange({ ...filters, search: "" });
                  }
                }}
                placeholder="Buscar por título ou descrição"
                className="pl-9"
                aria-label="Buscar por título ou descrição"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="search"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="agenda-item-type"
              className="text-xs text-muted-foreground"
            >
              Exibir
            </Label>
            <Select
              value={filters.itemType}
              onValueChange={(v) =>
                onChange(sanitizeForItemType(filters, v as AgendaItemFilter))
              }
            >
              <SelectTrigger id="agenda-item-type" aria-label="Exibir">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="deadlines">Prazos</SelectItem>
                <SelectItem value="appointments">Compromissos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="agenda-processo"
              className="text-xs text-muted-foreground"
            >
              Processo
            </Label>
            <Select
              value={filters.caseId ?? "all"}
              onValueChange={(v) =>
                onChange({
                  ...filters,
                  caseId: v === "all" ? undefined : (v as CaseId),
                })
              }
              disabled={cases.kind === "loading" || noCases}
            >
              <SelectTrigger id="agenda-processo" aria-label="Filtrar por processo">
                <SelectValue placeholder="Todos os processos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os processos</SelectItem>
                {casesReady.map((c) => {
                  const full = `${c.reference} — ${c.title}`;
                  return (
                    <SelectItem key={c.id} value={c.id} title={full}>
                      <span className="block max-w-[280px] truncate">{full}</span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {cases.kind === "error" && (
              <span className="text-[11px] text-destructive">
                Não foi possível carregar processos.
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="agenda-situacao"
              className="text-xs text-muted-foreground"
            >
              Situação
            </Label>
            <Select
              value={filters.lifecycle}
              onValueChange={(v) =>
                onChange({ ...filters, lifecycle: v as AgendaLifecycleFilter })
              }
            >
              <SelectTrigger id="agenda-situacao" aria-label="Filtrar por situação">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="open">Em aberto</SelectItem>
                <SelectItem value="completed">Concluídas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onToggleMore(!showMore)}
              aria-expanded={showMore}
              aria-controls="agenda-mais-filtros"
              className="gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              Mais filtros
              {activeCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-5 justify-center px-1 text-[10px]"
                  aria-label={`${activeCount} filtro(s) ativo(s)`}
                >
                  {activeCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        <Collapsible open={showMore} onOpenChange={onToggleMore}>
          <CollapsibleTrigger className="sr-only">Mais filtros</CollapsibleTrigger>
          <CollapsibleContent id="agenda-mais-filtros">
            <div className="grid gap-3 pt-2 md:grid-cols-2 lg:grid-cols-4">
              {showDeadlineFilters && (
                <>
                  <div className="flex flex-col gap-1">
                    <Label
                      htmlFor="agenda-prazo-tipo"
                      className="text-xs text-muted-foreground"
                    >
                      Tipo de prazo
                    </Label>
                    <Select
                      value={filters.deadlineKind ?? "all"}
                      onValueChange={(v) =>
                        onChange({
                          ...filters,
                          deadlineKind:
                            v === "all" ? undefined : (v as DeadlineKind),
                        })
                      }
                    >
                      <SelectTrigger
                        id="agenda-prazo-tipo"
                        aria-label="Tipo de prazo"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {DEADLINE_KINDS.map((k) => (
                          <SelectItem key={k} value={k}>
                            {DEADLINE_KIND_LABEL[k]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label
                      htmlFor="agenda-prazo-prioridade"
                      className="text-xs text-muted-foreground"
                    >
                      Prioridade
                    </Label>
                    <Select
                      value={filters.deadlinePriority ?? "all"}
                      onValueChange={(v) =>
                        onChange({
                          ...filters,
                          deadlinePriority:
                            v === "all" ? undefined : (v as DeadlinePriority),
                        })
                      }
                    >
                      <SelectTrigger
                        id="agenda-prazo-prioridade"
                        aria-label="Prioridade do prazo"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {DEADLINE_PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {DEADLINE_PRIORITY_LABEL[p]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {showAppointmentFilters && (
                <>
                  <div className="flex flex-col gap-1">
                    <Label
                      htmlFor="agenda-compromisso-tipo"
                      className="text-xs text-muted-foreground"
                    >
                      Tipo de compromisso
                    </Label>
                    <Select
                      value={filters.appointmentKind ?? "all"}
                      onValueChange={(v) =>
                        onChange({
                          ...filters,
                          appointmentKind:
                            v === "all" ? undefined : (v as AppointmentKind),
                        })
                      }
                    >
                      <SelectTrigger
                        id="agenda-compromisso-tipo"
                        aria-label="Tipo de compromisso"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {APPOINTMENT_KINDS.map((k) => (
                          <SelectItem key={k} value={k}>
                            {APPOINTMENT_KIND_LABEL[k]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label
                      htmlFor="agenda-compromisso-modo"
                      className="text-xs text-muted-foreground"
                    >
                      Modalidade
                    </Label>
                    <Select
                      value={filters.appointmentMode ?? "all"}
                      onValueChange={(v) =>
                        onChange({
                          ...filters,
                          appointmentMode:
                            v === "all" ? undefined : (v as AppointmentMode),
                        })
                      }
                    >
                      <SelectTrigger
                        id="agenda-compromisso-modo"
                        aria-label="Modalidade do compromisso"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {APPOINTMENT_MODES.map((m) => (
                          <SelectItem key={m} value={m}>
                            {APPOINTMENT_MODE_LABEL[m]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// ---- Sub-componentes ------------------------------------------------------

function DayView({
  anchor,
  deadlines,
  appointments,
  nowEpoch,
  onOpenDeadline,
  onOpenAppointment,
}: {
  anchor: Date;
  deadlines: readonly Deadline[];
  appointments: readonly Appointment[];
  nowEpoch: number;
  onOpenDeadline: (d: Deadline, ev?: React.SyntheticEvent) => void;
  onOpenAppointment: (a: Appointment, ev?: React.SyntheticEvent) => void;
}) {
  const isEmpty = deadlines.length === 0 && appointments.length === 0;
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base capitalize">
          {anchor.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
          })}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {deadlines.length}{" "}
          {deadlines.length === 1 ? "prazo" : "prazos"} ·{" "}
          {appointments.length}{" "}
          {appointments.length === 1 ? "compromisso" : "compromissos"}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isEmpty ? (
          <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-8 text-center">
            <CalendarDays
              className="mx-auto h-8 w-8 text-muted-foreground/50"
              aria-hidden
            />
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhum prazo ou compromisso para este dia.
            </p>
          </div>
        ) : (
          <>
            {deadlines.map((d) => (
              <DeadlineCard
                key={d.id}
                deadline={d}
                nowEpoch={nowEpoch}
                onOpen={onOpenDeadline}
              />
            ))}
            {appointments.map((a) => (
              <AppointmentCard
                key={a.id}
                appointment={a}
                onOpen={onOpenAppointment}
              />
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function WeekView({
  anchor,
  deadlines,
  appointments,
  nowEpoch,
  onPickDay,
  onOpenDeadline,
  onOpenAppointment,
}: {
  anchor: Date;
  deadlines: readonly Deadline[];
  appointments: readonly Appointment[];
  nowEpoch: number;
  onPickDay: (d: Date) => void;
  onOpenDeadline: (d: Deadline, ev?: React.SyntheticEvent) => void;
  onOpenAppointment: (a: Appointment, ev?: React.SyntheticEvent) => void;
}) {
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base">Semana</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
          {days.map((d) => {
            const dayDeadlines = deadlines.filter((x) =>
              sameDay(new Date(x.dueAt), d),
            );
            const dayAppointments = appointments.filter((x) =>
              sameDay(new Date(x.startsAt), d),
            );
            const isToday = sameDay(d, new Date());
            return (
              <section
                key={d.toISOString()}
                aria-label={`Dia ${d.toLocaleDateString("pt-BR")}`}
                className={`flex min-h-[120px] flex-col rounded-md border p-2 ${
                  isToday
                    ? "border-primary/50 bg-primary/5"
                    : "border-border/70 bg-card"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onPickDay(d)}
                  aria-label={`Abrir dia ${d.toLocaleDateString("pt-BR")}`}
                  className="mb-2 flex items-baseline justify-between rounded px-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    {d.toLocaleDateString("pt-BR", { weekday: "short" })}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {d.getDate().toString().padStart(2, "0")}
                  </span>
                </button>
                <div className="space-y-1">
                  {dayDeadlines.slice(0, 2).map((x) => (
                    <WeekDeadlineItem
                      key={x.id}
                      deadline={x}
                      nowEpoch={nowEpoch}
                      onOpen={onOpenDeadline}
                    />
                  ))}
                  {dayAppointments.slice(0, 2).map((x) => (
                    <WeekAppointmentItem
                      key={x.id}
                      appointment={x}
                      onOpen={onOpenAppointment}
                    />
                  ))}
                  {dayDeadlines.length + dayAppointments.length > 4 && (
                    <div className="text-[11px] text-muted-foreground">
                      + {dayDeadlines.length + dayAppointments.length - 4} mais
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}


function MonthView({
  anchor,
  deadlines,
  appointments,
  nowEpoch,
  onPickDay,
}: {
  anchor: Date;
  deadlines: readonly Deadline[];
  appointments: readonly Appointment[];
  nowEpoch: number;
  onPickDay: (d: Date) => void;
}) {
  const cells = buildMonthCells(anchor);
  const weekdayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const today = new Date();

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base capitalize">
          {anchor.toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {weekdayLabels.map((l) => (
            <div key={l} className="py-1">
              {l}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((d) => {
            const inMonth = d.getMonth() === anchor.getMonth();
            const dayDeadlines = deadlines.filter((x) =>
              sameDay(new Date(x.dueAt), d),
            );
            const dayAppointments = appointments.filter((x) =>
              sameDay(new Date(x.startsAt), d),
            );
            const hasOverdue = dayDeadlines.some((x) =>
              isDeadlineOverdue(x, nowEpoch),
            );
            const hasUrgent = dayDeadlines.some(
              (x) => x.status === "pending" && x.priority === "urgent",
            );
            const total = dayDeadlines.length + dayAppointments.length;
            const isToday = sameDay(d, today);
            return (
              <button
                type="button"
                key={d.toISOString()}
                onClick={() => onPickDay(d)}
                aria-label={`Abrir dia ${d.toLocaleDateString("pt-BR")}`}
                className={`flex min-h-[72px] flex-col rounded-md border p-1.5 text-left transition hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isToday
                    ? "border-primary/50 bg-primary/5"
                    : "border-border/60 bg-card"
                } ${inMonth ? "" : "opacity-50"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    {formatDayShort(d)}
                  </span>
                  {(hasOverdue || hasUrgent) && (
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        hasOverdue ? "bg-destructive" : "bg-amber-500"
                      }`}
                      aria-label={hasOverdue ? "Prazo atrasado" : "Prazo urgente"}
                      role="img"
                    />
                  )}
                </div>
                {total > 0 && (
                  <div className="mt-auto flex flex-wrap gap-1">
                    {dayDeadlines.length > 0 && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400"
                        aria-label={`${dayDeadlines.length} prazo(s)`}
                      >
                        <Clock className="h-2.5 w-2.5" aria-hidden />{" "}
                        {dayDeadlines.length}
                      </span>
                    )}
                    {dayAppointments.length > 0 && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                        aria-label={`${dayAppointments.length} compromisso(s)`}
                      >
                        <CalendarDays className="h-2.5 w-2.5" aria-hidden />{" "}
                        {dayAppointments.length}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Cards semânticos -----------------------------------------------------

function DeadlineCard({
  deadline,
  nowEpoch,
  onOpen,
}: {
  deadline: Deadline;
  nowEpoch: number;
  onOpen?: (d: Deadline, ev?: React.SyntheticEvent) => void;
}) {
  const presentation = getDeadlinePresentation(deadline, nowEpoch);
  const overdue = isDeadlineOverdue(deadline, nowEpoch);
  const StateIcon = DEADLINE_STATE_ICON[presentation.state];
  const clickable = typeof onOpen === "function";
  const activate = (ev: React.SyntheticEvent) => {
    if (onOpen) onOpen(deadline, ev);
  };
  return (
    <article
      aria-label={`Prazo — ${deadline.title}`}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? activate : undefined}
      onKeyDown={
        clickable
          ? (ev) => {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                activate(ev);
              }
            }
          : undefined
      }
      className={`relative flex gap-3 overflow-hidden rounded-lg border p-3 pl-4 ${presentation.containerClass} ${clickable ? "cursor-pointer transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : ""}`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 ${presentation.accentClass}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span
            className="inline-flex items-center gap-1 rounded bg-background/60 px-1.5 py-0.5 font-medium text-foreground"
            aria-label="Tipo de item: prazo"
          >
            <FileClock className="h-3 w-3" aria-hidden />
            Prazo
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {formatTime(deadline.dueAt)}
          </span>
          <span>· {DEADLINE_KIND_LABEL[deadline.kind]}</span>
          {overdue && (
            <span className="font-medium text-destructive">
              · Vencido em {new Date(deadline.dueAt).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
        <p className="mt-1 break-words font-medium text-foreground">
          {deadline.title}
        </p>
        {deadline.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {deadline.description}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge
          className={`gap-1 text-[10px] ${presentation.stateBadgeClass}`}
          aria-label={`Estado: ${presentation.stateLabel}`}
        >
          <StateIcon className="h-3 w-3" aria-hidden />
          {presentation.stateLabel}
        </Badge>
        <Badge
          variant="outline"
          className="text-[10px]"
          aria-label={`Status oficial: ${DEADLINE_STATUS_LABEL[deadline.status]}`}
        >
          {DEADLINE_STATUS_LABEL[deadline.status]}
        </Badge>
        <span
          className="text-[10px] text-muted-foreground"
          aria-label={`Prioridade: ${DEADLINE_PRIORITY_LABEL[deadline.priority]}`}
        >
          Prioridade: {DEADLINE_PRIORITY_LABEL[deadline.priority]}
        </span>
      </div>
    </article>
  );
}


function AppointmentCard({
  appointment,
  onOpen,
}: {
  appointment: Appointment;
  onOpen?: (a: Appointment, ev?: React.SyntheticEvent) => void;
}) {

  const presentation = getAppointmentPresentation(appointment);
  const ModeIcon = APPOINTMENT_MODE_ICON[appointment.mode];
  const StateIcon =
    presentation.state === "completed"
      ? CheckCircle2
      : presentation.state === "cancelled"
        ? XCircle
        : CalendarDays;
  const clickable = typeof onOpen === "function";
  const activate = (ev: React.SyntheticEvent) => {
    if (onOpen) onOpen(appointment, ev);
  };
  return (
    <article
      aria-label={`Compromisso — ${appointment.title}`}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? activate : undefined}
      onKeyDown={
        clickable
          ? (ev) => {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                activate(ev);
              }
            }
          : undefined
      }
      className={`relative flex gap-3 overflow-hidden rounded-lg border p-3 pl-4 ${presentation.containerClass} ${clickable ? "cursor-pointer transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : ""}`}
    >

      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 ${presentation.accentClass}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span
            className="inline-flex items-center gap-1 rounded bg-background/60 px-1.5 py-0.5 font-medium text-foreground"
            aria-label="Tipo de item: compromisso"
          >
            <CalendarDays className="h-3 w-3" aria-hidden />
            Compromisso
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {formatTime(appointment.startsAt)} – {formatTime(appointment.endsAt)}
          </span>
          <span>· {APPOINTMENT_KIND_LABEL[appointment.kind]}</span>
        </div>
        <p className="mt-1 break-words font-medium text-foreground">
          {appointment.title}
        </p>
        {appointment.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {appointment.description}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span
            className="inline-flex items-center gap-1"
            aria-label={`Modalidade: ${APPOINTMENT_MODE_LABEL[appointment.mode]}`}
          >
            <ModeIcon className="h-3.5 w-3.5" aria-hidden />
            {APPOINTMENT_MODE_LABEL[appointment.mode]}
          </span>
          {appointment.location && appointment.location.trim() !== "" && (
            <span
              className="inline-flex min-w-0 items-center gap-1"
              title={appointment.location}
            >
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{appointment.location}</span>
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0">
        <Badge
          className={`gap-1 text-[10px] ${presentation.stateBadgeClass}`}
          aria-label={`Estado: ${presentation.stateLabel}`}
        >
          <StateIcon className="h-3 w-3" aria-hidden />
          {presentation.stateLabel}
        </Badge>
      </div>
    </article>
  );
}

// ---- Itens compactos da semana --------------------------------------------

function WeekDeadlineItem({
  deadline,
  nowEpoch,
  onOpen,
}: {
  deadline: Deadline;
  nowEpoch: number;
  onOpen?: (d: Deadline, ev?: React.SyntheticEvent) => void;
}) {
  const presentation = getDeadlinePresentation(deadline, nowEpoch);
  const StateIcon = DEADLINE_STATE_ICON[presentation.state];
  const isDone =
    presentation.state === "cancelled" || presentation.state === "completed";
  const commonClass = `flex w-full items-center gap-1 truncate rounded border px-1.5 py-0.5 text-[11px] text-left ${presentation.containerClass}`;
  const content = (
    <>
      <StateIcon className="h-3 w-3 shrink-0" aria-hidden />
      <span className="shrink-0 font-medium">{formatTime(deadline.dueAt)}</span>
      <span className={`truncate ${isDone ? "line-through opacity-70" : ""}`}>
        {deadline.title}
      </span>
    </>
  );
  if (onOpen) {
    return (
      <button
        type="button"
        onClick={(ev) => {
          ev.stopPropagation();
          onOpen(deadline, ev);
        }}
        title={`Prazo · ${presentation.stateLabel} · ${deadline.title}`}
        aria-label={`Prazo ${presentation.stateLabel}: ${deadline.title}`}
        className={`${commonClass} transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
      >
        {content}
      </button>
    );
  }
  return (
    <div
      className={commonClass}
      title={`Prazo · ${presentation.stateLabel} · ${deadline.title}`}
      aria-label={`Prazo ${presentation.stateLabel}: ${deadline.title}`}
    >
      {content}
    </div>
  );
}

function WeekAppointmentItem({
  appointment,
  onOpen,
}: {
  appointment: Appointment;
  onOpen?: (a: Appointment, ev?: React.SyntheticEvent) => void;
}) {
  const presentation = getAppointmentPresentation(appointment);
  const isDone =
    presentation.state === "cancelled" || presentation.state === "completed";
  const commonClass = `flex w-full items-center gap-1 truncate rounded border px-1.5 py-0.5 text-[11px] text-left ${presentation.containerClass}`;
  const content = (
    <>
      <CalendarDays className="h-3 w-3 shrink-0" aria-hidden />
      <span className="shrink-0 font-medium">
        {formatTime(appointment.startsAt)}
      </span>
      <span className={`truncate ${isDone ? "line-through opacity-70" : ""}`}>
        {appointment.title}
      </span>
    </>
  );
  if (onOpen) {
    return (
      <button
        type="button"
        onClick={(ev) => {
          ev.stopPropagation();
          onOpen(appointment, ev);
        }}
        title={`Compromisso · ${presentation.stateLabel} · ${appointment.title}`}
        aria-label={`Compromisso ${presentation.stateLabel}: ${appointment.title}`}
        className={`${commonClass} transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
      >
        {content}
      </button>
    );
  }
  return (
    <div
      className={commonClass}
      title={`Compromisso · ${presentation.stateLabel} · ${appointment.title}`}
      aria-label={`Compromisso ${presentation.stateLabel}: ${appointment.title}`}
    >
      {content}
    </div>
  );
}


// ---- Próximos prazos ------------------------------------------------------

function UpcomingDeadlines({
  items,
  onOpenDeadline,
}: {
  items: readonly Deadline[];
  onOpenDeadline?: (d: Deadline, ev?: React.SyntheticEvent) => void;
}) {
  return (
    <Card className="h-fit border-border/70">
      <CardHeader>
        <CardTitle className="text-base">Próximos prazos</CardTitle>
        <p className="text-xs text-muted-foreground">
          Cinco prazos pendentes mais próximos.
        </p>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            Nenhum prazo pendente à frente.
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((d) => {
              const priorityState: DeadlineVisualState =
                d.priority === "urgent"
                  ? "urgent"
                  : d.priority === "high"
                    ? "high"
                    : d.priority === "normal"
                      ? "normal"
                      : "low";
              const PriorityIcon = DEADLINE_STATE_ICON[priorityState];
              const clickable = typeof onOpenDeadline === "function";
              const activate = (ev: React.SyntheticEvent) => {
                if (onOpenDeadline) onOpenDeadline(d, ev);
              };
              return (
                <li
                  key={d.id}
                  role={clickable ? "button" : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onClick={clickable ? activate : undefined}
                  onKeyDown={
                    clickable
                      ? (ev) => {
                          if (ev.key === "Enter" || ev.key === " ") {
                            ev.preventDefault();
                            activate(ev);
                          }
                        }
                      : undefined
                  }
                  aria-label={clickable ? `Abrir prazo ${d.title}` : undefined}
                  className={`rounded-md border border-border/70 bg-card p-3 text-sm ${clickable ? "cursor-pointer transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : ""}`}
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" aria-hidden />
                    {new Date(d.dueAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                    })}{" "}
                    · {formatTime(d.dueAt)}
                  </div>
                  <p className="mt-1 break-words font-medium text-foreground">
                    {d.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="gap-1 text-[10px]"
                      aria-label={`Prioridade: ${DEADLINE_PRIORITY_LABEL[d.priority]}`}
                    >
                      <PriorityIcon className="h-3 w-3" aria-hidden />
                      {DEADLINE_PRIORITY_LABEL[d.priority]}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {DEADLINE_KIND_LABEL[d.kind]}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

