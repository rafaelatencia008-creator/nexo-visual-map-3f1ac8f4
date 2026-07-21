import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, Clock, User, Briefcase, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { pericias, processos, clientes, peritos } from "@/lib/mock/data";
import { formatDateTime } from "@/lib/format";
import type { StatusPericia, TipoPericia } from "@/lib/mock/types";


export const Route = createFileRoute("/app/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — Nexo Pericial 360" },
      {
        name: "description",
        content:
          "Agenda mensal de perícias do escritório com visão diária dos compromissos.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AgendaPage,
});

const TIPO_LABEL: Record<TipoPericia, string> = {
  engenharia_civil: "Engenharia Civil",
  grafotecnica: "Grafotécnica",
  contabil: "Contábil",
  medica: "Médica",
  ambiental: "Ambiental",
  trabalhista: "Trabalhista",
};

const STATUS_LABEL: Record<StatusPericia, string> = {
  agendada: "Agendada",
  em_andamento: "Em andamento",
  laudo_pendente: "Laudo pendente",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const STATUS_TONE: Record<StatusPericia, string> = {
  agendada: "bg-primary/10 text-primary border-primary/20",
  em_andamento:
    "bg-[hsl(var(--brand-accent)/0.15)] text-[hsl(var(--brand-accent))] border-[hsl(var(--brand-accent)/0.3)]",
  laudo_pendente:
    "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400",
  concluida:
    "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
  cancelada: "bg-muted text-muted-foreground border-border",
};

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const TIPOS: TipoPericia[] = [
  "engenharia_civil",
  "grafotecnica",
  "contabil",
  "medica",
  "ambiental",
  "trabalhista",
];

const STATUSES: StatusPericia[] = [
  "agendada",
  "em_andamento",
  "laudo_pendente",
  "concluida",
  "cancelada",
];

const ALL = "__all__";

function AgendaPage() {
  const hoje = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState<Date>(hoje);
  const [viewMonth, setViewMonth] = useState<Date>(hoje);
  const [filtroPerito, setFiltroPerito] = useState<string>(ALL);
  const [filtroTipo, setFiltroTipo] = useState<string>(ALL);
  const [filtroStatus, setFiltroStatus] = useState<string>(ALL);

  const filtrosAtivos =
    filtroPerito !== ALL || filtroTipo !== ALL || filtroStatus !== ALL;

  const limparFiltros = () => {
    setFiltroPerito(ALL);
    setFiltroTipo(ALL);
    setFiltroStatus(ALL);
  };

  const processoMap = useMemo(
    () => new Map(processos.map((p) => [p.id, p])),
    [],
  );
  const clienteMap = useMemo(() => new Map(clientes.map((c) => [c.id, c])), []);
  const peritoMap = useMemo(() => new Map(peritos.map((p) => [p.id, p])), []);

  // Perícias após filtros
  const periciasFiltradas = useMemo(() => {
    return pericias.filter((p) => {
      if (filtroPerito !== ALL && p.peritoId !== filtroPerito) return false;
      if (filtroTipo !== ALL && p.tipo !== filtroTipo) return false;
      if (filtroStatus !== ALL && p.status !== filtroStatus) return false;
      return true;
    });
  }, [filtroPerito, filtroTipo, filtroStatus]);

  // Dias com perícias (para destacar no calendário)
  const diasComPericia = useMemo(
    () => periciasFiltradas.map((p) => new Date(p.dataAgendada)),
    [periciasFiltradas],
  );

  // Perícias do dia selecionado, ordenadas por hora
  const periciasDoDia = useMemo(() => {
    return periciasFiltradas
      .filter((p) => sameDay(new Date(p.dataAgendada), selectedDate))
      .sort(
        (a, b) =>
          new Date(a.dataAgendada).getTime() -
          new Date(b.dataAgendada).getTime(),
      );
  }, [selectedDate, periciasFiltradas]);

  // Perícias no mês visível (para o contador do cabeçalho)
  const periciasDoMes = useMemo(() => {
    return periciasFiltradas.filter((p) => {
      const d = new Date(p.dataAgendada);
      return (
        d.getFullYear() === viewMonth.getFullYear() &&
        d.getMonth() === viewMonth.getMonth()
      );
    });
  }, [viewMonth, periciasFiltradas]);

  const dataFormatada = selectedDate.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const mesFormatado = viewMonth.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });


  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Agenda
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão mensal das perícias agendadas. Clique em um dia para ver os
            compromissos.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border/70 bg-card px-3 py-2 text-sm">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="capitalize text-muted-foreground">
            {mesFormatado}
          </span>
          <span className="font-medium text-foreground">
            · {periciasDoMes.length}{" "}
            {periciasDoMes.length === 1 ? "perícia" : "perícias"}
          </span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[auto,1fr]">
        {/* Calendário */}
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Calendário</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              month={viewMonth}
              onMonthChange={setViewMonth}
              modifiers={{ temPericia: diasComPericia }}
              modifiersClassNames={{
                temPericia:
                  "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
              }}
              className="pointer-events-auto rounded-md"
              locale={undefined}
            />
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              Dias com perícias agendadas
            </div>
          </CardContent>
        </Card>

        {/* Painel do dia */}
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base capitalize">
              {dataFormatada}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {periciasDoDia.length}{" "}
              {periciasDoDia.length === 1
                ? "perícia neste dia"
                : "perícias neste dia"}
            </p>
          </CardHeader>
          <CardContent>
            {periciasDoDia.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-8 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Nenhuma perícia agendada para este dia.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {periciasDoDia.map((p) => {
                  const processo = processoMap.get(p.processoId);
                  const cliente = processo
                    ? clienteMap.get(processo.clienteId)
                    : undefined;
                  const perito = peritoMap.get(p.peritoId);
                  const hora = new Date(p.dataAgendada).toLocaleTimeString(
                    "pt-BR",
                    { hour: "2-digit", minute: "2-digit" },
                  );

                  return (
                    <li key={p.id}>
                      <Link
                        to="/app/pericias/$id"
                        params={{ id: p.id }}
                        className="block rounded-lg border border-border/70 bg-card p-4 transition hover:border-primary/40 hover:bg-muted/30"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-10 w-10 flex-col items-center justify-center rounded-md bg-primary/10 text-primary">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="mt-0.5 text-[10px] font-semibold">
                                {hora}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {TIPO_LABEL[p.tipo]}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(p.dataAgendada)}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={STATUS_TONE[p.status]}
                          >
                            {STATUS_LABEL[p.status]}
                          </Badge>
                        </div>

                        <div className="mt-3 grid gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground sm:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5" />
                            <span className="truncate">
                              {cliente?.nome ?? "Cliente não localizado"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-3.5 w-3.5" />
                            <span className="truncate">
                              {perito?.nome ?? "Perito não atribuído"}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
