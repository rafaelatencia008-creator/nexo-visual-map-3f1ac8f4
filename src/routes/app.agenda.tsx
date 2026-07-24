import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { useMockDomain } from "@/components/app/MockDomainProvider";
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
import type { PageResult } from "@/domain/services/pagination";
import type { ServiceContext } from "@/domain/services/context";
import type { MockDomainEnvironment } from "@/domain/mocks";

// ============================================================================
// LV-09.1B.1 — Estrutura da tela /app/agenda.
// Layout Dia / Semana / Mês + lista de "Próximos prazos".
// Consome exclusivamente os contratos oficiais Deadline/Appointment (LV-09.1A).
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
  | { kind: "loading" }
  | { kind: "ready"; data: AgendaData }
  | { kind: "error"; message: string };

const PAGE_LIMIT = 100;
const MAX_PAGES = 20; // Teto de segurança: 2000 itens por tipo.

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
): Promise<AgendaData> {
  const deadlines = await loadAll<Deadline>((cursor) =>
    environment.services.deadlines.list(context, {
      page: cursor ? { cursor, limit: PAGE_LIMIT } : { limit: PAGE_LIMIT },
    }),
  );
  const appointments = await loadAll<Appointment>((cursor) =>
    environment.services.appointments.list(context, {
      page: cursor ? { cursor, limit: PAGE_LIMIT } : { limit: PAGE_LIMIT },
    }),
  );
  return { deadlines, appointments };
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
  // Segunda-feira como início de semana (padrão brasileiro profissional).
  const day = c.getDay(); // 0 = domingo
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
  return new Date(
    anchor.getFullYear(),
    anchor.getMonth() + direction,
    1,
  );
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

// ---- Filtros de intervalo -------------------------------------------------

function isInRange(iso: string, from: Date, to: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t < to.getTime();
}

// ---- Cores por status/prioridade (neutras, LV-09.1B.2 fará o polimento) ---

function deadlineTone(d: Deadline): string {
  if (d.status === "completed") return "border-emerald-500/30 bg-emerald-500/5";
  if (d.status === "cancelled") return "border-border/60 bg-muted/30 opacity-70";
  if (d.priority === "urgent") return "border-destructive/40 bg-destructive/5";
  if (d.priority === "high") return "border-amber-500/40 bg-amber-500/5";
  return "border-border/70 bg-card";
}

function appointmentTone(a: Appointment): string {
  if (a.status === "completed") return "border-emerald-500/30 bg-emerald-500/5";
  if (a.status === "cancelled") return "border-border/60 bg-muted/30 opacity-70";
  return "border-primary/30 bg-primary/5";
}

// ---- Página ---------------------------------------------------------------

function AgendaPage() {
  const { environment, context } = useMockDomain();
  const [state, setState] = React.useState<LoadState>({ kind: "loading" });
  const [mode, setMode] = React.useState<ViewMode>("week");
  const [anchor, setAnchor] = React.useState<Date>(() => startOfDay(new Date()));
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    fetchAgenda(environment, context)
      .then((data) => {
        if (cancelled || !mountedRef.current) return;
        setState({ kind: "ready", data });
      })
      .catch((error: unknown) => {
        if (cancelled || !mountedRef.current) return;
        const message =
          error instanceof Error ? error.message : "Falha ao carregar agenda.";
        setState({ kind: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, [environment, context]);

  const range = React.useMemo(() => rangeForView(anchor, mode), [anchor, mode]);

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
    if (state.kind !== "ready") return [] as Deadline[];
    const now = Date.now();
    return state.data.deadlines
      .filter(
        (d) =>
          d.status === "pending" && isoDateTimeToEpoch(d.dueAt) >= now,
      )
      .slice()
      .sort((a, b) => {
        const t = isoDateTimeToEpoch(a.dueAt) - isoDateTimeToEpoch(b.dueAt);
        return t !== 0 ? t : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      })
      .slice(0, 5);
  }, [state]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Agenda
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Prazos e compromissos oficiais em visão diária, semanal e mensal.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border/70 bg-card px-3 py-2 text-sm">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="capitalize text-muted-foreground">
            {formatHeading(anchor, mode)}
          </span>
        </div>
      </header>

      {/* Controles de navegação */}
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
              <ChevronLeft className="h-4 w-4" />
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
              <ChevronRight className="h-4 w-4" />
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
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Carregando agenda…
          </CardContent>
        </Card>
      )}

      {state.kind === "error" && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-2 py-6 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {state.message}
          </CardContent>
        </Card>
      )}

      {state.kind === "ready" && (
        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          {/* Área principal — visão selecionada */}
          <div className="space-y-4">
            {mode === "day" && (
              <DayView
                anchor={anchor}
                deadlines={visible.deadlines}
                appointments={visible.appointments}
              />
            )}
            {mode === "week" && (
              <WeekView
                anchor={anchor}
                deadlines={visible.deadlines}
                appointments={visible.appointments}
                onPickDay={(d) => {
                  setAnchor(startOfDay(d));
                  setMode("day");
                }}
              />
            )}
            {mode === "month" && (
              <MonthView
                anchor={anchor}
                deadlines={visible.deadlines}
                appointments={visible.appointments}
                onPickDay={(d) => {
                  setAnchor(startOfDay(d));
                  setMode("day");
                }}
              />
            )}
          </div>

          {/* Painel lateral — próximos prazos */}
          <UpcomingDeadlines items={upcomingDeadlines} />
        </div>
      )}
    </div>
  );
}

// ---- Sub-componentes ------------------------------------------------------

function DayView({
  anchor,
  deadlines,
  appointments,
}: {
  anchor: Date;
  deadlines: readonly Deadline[];
  appointments: readonly Appointment[];
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
            <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhum prazo ou compromisso para este dia.
            </p>
          </div>
        ) : (
          <>
            {deadlines.map((d) => (
              <DeadlineRow key={d.id} deadline={d} />
            ))}
            {appointments.map((a) => (
              <AppointmentRow key={a.id} appointment={a} />
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
  onPickDay,
}: {
  anchor: Date;
  deadlines: readonly Deadline[];
  appointments: readonly Appointment[];
  onPickDay: (d: Date) => void;
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
              <button
                type="button"
                key={d.toISOString()}
                onClick={() => onPickDay(d)}
                className={`flex min-h-[120px] flex-col rounded-md border p-2 text-left transition hover:border-primary/40 hover:bg-muted/30 ${
                  isToday
                    ? "border-primary/50 bg-primary/5"
                    : "border-border/70 bg-card"
                }`}
              >
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    {d.toLocaleDateString("pt-BR", { weekday: "short" })}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {d.getDate().toString().padStart(2, "0")}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayDeadlines.slice(0, 2).map((x) => (
                    <div
                      key={x.id}
                      className="truncate rounded border border-border/60 bg-background px-1.5 py-0.5 text-[11px]"
                      title={x.title}
                    >
                      <Clock className="mr-1 inline h-3 w-3 align-[-2px] text-muted-foreground" />
                      {formatTime(x.dueAt)} · {x.title}
                    </div>
                  ))}
                  {dayAppointments.slice(0, 2).map((x) => (
                    <div
                      key={x.id}
                      className="truncate rounded border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[11px]"
                      title={x.title}
                    >
                      {formatTime(x.startsAt)} · {x.title}
                    </div>
                  ))}
                  {dayDeadlines.length + dayAppointments.length > 4 && (
                    <div className="text-[11px] text-muted-foreground">
                      + {dayDeadlines.length + dayAppointments.length - 4} mais
                    </div>
                  )}
                </div>
              </button>
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
  onPickDay,
}: {
  anchor: Date;
  deadlines: readonly Deadline[];
  appointments: readonly Appointment[];
  onPickDay: (d: Date) => void;
}) {
  const first = startOfMonth(anchor);
  const gridStart = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
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
            const total = dayDeadlines.length + dayAppointments.length;
            const isToday = sameDay(d, today);
            return (
              <button
                type="button"
                key={d.toISOString()}
                onClick={() => onPickDay(d)}
                className={`flex min-h-[72px] flex-col rounded-md border p-1.5 text-left transition hover:border-primary/40 hover:bg-muted/30 ${
                  isToday
                    ? "border-primary/50 bg-primary/5"
                    : "border-border/60 bg-card"
                } ${inMonth ? "" : "opacity-50"}`}
              >
                <span className="text-xs font-semibold text-foreground">
                  {formatDayShort(d)}
                </span>
                {total > 0 && (
                  <div className="mt-auto flex flex-wrap gap-1">
                    {dayDeadlines.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                        <Clock className="h-2.5 w-2.5" /> {dayDeadlines.length}
                      </span>
                    )}
                    {dayAppointments.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        <CalendarDays className="h-2.5 w-2.5" />{" "}
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

function DeadlineRow({ deadline }: { deadline: Deadline }) {
  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3 ${deadlineTone(deadline)}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {formatTime(deadline.dueAt)} · {DEADLINE_KIND_LABEL[deadline.kind]}
        </div>
        <p className="mt-1 font-medium text-foreground">{deadline.title}</p>
        {deadline.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {deadline.description}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <Badge variant="outline" className="text-[10px]">
          {DEADLINE_STATUS_LABEL[deadline.status]}
        </Badge>
        <Badge variant="secondary" className="text-[10px]">
          {DEADLINE_PRIORITY_LABEL[deadline.priority]}
        </Badge>
      </div>
    </div>
  );
}

function AppointmentRow({ appointment }: { appointment: Appointment }) {
  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3 ${appointmentTone(appointment)}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatTime(appointment.startsAt)} – {formatTime(appointment.endsAt)}{" "}
          · {APPOINTMENT_KIND_LABEL[appointment.kind]}
        </div>
        <p className="mt-1 font-medium text-foreground">{appointment.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>{APPOINTMENT_MODE_LABEL[appointment.mode]}</span>
          {appointment.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {appointment.location}
            </span>
          )}
        </div>
      </div>
      <Badge variant="outline" className="text-[10px]">
        {APPOINTMENT_STATUS_LABEL[appointment.status]}
      </Badge>
    </div>
  );
}

function UpcomingDeadlines({ items }: { items: readonly Deadline[] }) {
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
            {items.map((d) => (
              <li
                key={d.id}
                className={`rounded-md border p-3 text-sm ${deadlineTone(d)}`}
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(d.dueAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                  })}{" "}
                  · {formatTime(d.dueAt)}
                </div>
                <p className="mt-1 truncate font-medium text-foreground">
                  {d.title}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {DEADLINE_PRIORITY_LABEL[d.priority]}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {DEADLINE_KIND_LABEL[d.kind]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
