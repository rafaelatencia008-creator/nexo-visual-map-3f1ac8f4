import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Briefcase,
  FileClock,
  CalendarClock,
  Users,
  CircleDot,
  ArrowRight,
  AlertCircle,
  FilePlus2,
  Gavel,
  Calendar,
  UploadCloud,
  FileSignature,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pericias, processos, clientes, peritos } from "@/lib/mock/data";
import { pendencias as ALL_PEND, TIPO_LABEL as PEND_TIPO } from "@/lib/mock/pendencias";
import { formatDateTime, formatCurrency, formatDate } from "@/lib/format";
import type { StatusPericia, TipoPericia } from "@/lib/mock/types";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Painel — Nexo Pericial 360" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DashboardPage,
});

const TIPO_LABEL: Record<TipoPericia, string> = {
  engenharia_civil: "Eng. Civil",
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
  agendada: "bg-primary/10 text-primary",
  em_andamento: "bg-[hsl(var(--brand-accent)/0.15)] text-[hsl(var(--brand-accent))]",
  laudo_pendente: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  concluida: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  cancelada: "bg-muted text-muted-foreground",
};

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

const ATALHOS = [
  { label: "Nova perícia", to: "/app/pericias/nova", icon: FilePlus2 },
  { label: "Novo processo", to: "/app/processos/novo", icon: Gavel },
  { label: "Abrir agenda", to: "/app/agenda", icon: Calendar },
  { label: "Enviar documento", to: "/app/documentos", icon: UploadCloud },
  { label: "Iniciar laudo", to: "/app/laudos", icon: FileSignature },
] as const;

function DashboardPage() {
  const hoje = new Date();

  const emAndamento = pericias.filter(
    (p) => p.status === "agendada" || p.status === "em_andamento",
  ).length;
  const laudosPendentes = pericias.filter((p) => p.status === "laudo_pendente").length;

  const daquiSeteDias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
  const prazosProximos = pericias.filter((p) => {
    const d = new Date(p.dataAgendada);
    return (
      (p.status === "agendada" || p.status === "em_andamento" || p.status === "laudo_pendente") &&
      d >= hoje &&
      d <= daquiSeteDias
    );
  }).length;

  const clientesAtivos = clientes.length;

  const proximosPrazos = [...pericias]
    .filter((p) => p.status !== "cancelada" && p.status !== "concluida")
    .sort((a, b) => new Date(a.dataAgendada).getTime() - new Date(b.dataAgendada).getTime())
    .slice(0, 5);

  const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(hoje);

  const kpis = [
    { titulo: "Perícias em andamento", valor: emAndamento, icone: Briefcase, dica: "Agendadas + em execução" },
    { titulo: "Laudos pendentes", valor: laudosPendentes, icone: FileClock, dica: "Aguardando entrega" },
    { titulo: "Prazos nos próximos 7 dias", valor: prazosProximos, icone: CalendarClock, dica: "Compromissos iminentes" },
    { titulo: "Clientes ativos", valor: clientesAtivos, icone: Users, dica: "Carteira atual" },
  ];

  const atividades = [
    { id: "atv-01", quando: "há 2 horas", texto: "Laudo grafotécnico revisado — Processo 0005544-21.2024" },
    { id: "atv-02", quando: "há 5 horas", texto: "Perícia contábil atualizada para Em andamento — Banco Meridiano S.A." },
    { id: "atv-03", quando: "ontem", texto: "Novo cliente cadastrado — Seguradora Aliança Nacional" },
    { id: "atv-04", quando: "há 2 dias", texto: "Vistoria agendada — Construtora Horizonte Ltda." },
    { id: "atv-05", quando: "há 3 dias", texto: "Honorários registrados — Perícia ambiental Vale S.A." },
  ];

  const pendenciasAtivas = ALL_PEND.filter((p) => p.status !== "concluida").slice(0, 5);
  const totalPendencias = ALL_PEND.filter((p) => p.status !== "concluida").length;
  const atrasadas = ALL_PEND.filter((p) => p.status === "atrasada").length;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <span className="capitalize">{dataFormatada}</span>
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
            {saudacao()}, Usuário
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Panorama do dia. Este painel usa dados fictícios de demonstração.
          </p>
        </div>
        <Badge variant="outline" className="w-fit gap-1.5 py-1 text-[11px] uppercase tracking-widest">
          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--brand-accent))]" />
          Demonstração visual
        </Badge>
      </header>

      {/* KPIs */}
      <section aria-label="Indicadores">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icone;
            return (
              <Card key={kpi.titulo} className="border-border/70">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {kpi.titulo}
                      </p>
                      <p className="mt-3 font-display text-4xl font-semibold tracking-tight text-foreground">
                        {kpi.valor}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{kpi.dica}</p>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Próximos prazos — clicáveis */}
        <Card className="border-border/70 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-lg">Próximos prazos</CardTitle>
            <Badge variant="outline" className="text-xs">
              {proximosPrazos.length} itens
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {proximosPrazos.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Nenhum prazo em aberto.</p>
            ) : (
              <ul className="divide-y divide-border">
                {proximosPrazos.map((p) => {
                  const processo = processos.find((pr) => pr.id === p.processoId);
                  const perito = peritos.find((pe) => pe.id === p.peritoId);
                  return (
                    <li key={p.id}>
                      <Link
                        to={`/app/pericias/${p.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {processo?.numero ?? "Processo —"}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {TIPO_LABEL[p.tipo]} · {perito?.nome ?? "Perito —"} ·{" "}
                            {formatCurrency(p.honorarios)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-foreground">
                            {formatDateTime(p.dataAgendada)}
                          </span>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[p.status]}`}
                          >
                            {STATUS_LABEL[p.status]}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Ações rápidas — destinos reais */}
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="font-display text-lg">Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ATALHOS.map((acao) => {
              const Icon = acao.icone;
              return (
                <Button
                  key={acao.to}
                  variant="outline"
                  className="w-full justify-start gap-3"
                  asChild
                >
                  <Link to={acao.to}>
                    <Icon className="h-4 w-4" />
                    {acao.label}
                  </Link>
                </Button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Central de pendências (resumo) */}
      <Card className="border-border/70">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <AlertCircle className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="font-display text-lg">Central de pendências</CardTitle>
              <p className="text-xs text-muted-foreground">
                {totalPendencias} em aberto · {atrasadas} atrasada{atrasadas === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/app/pendencias" className="gap-1.5">
              Ver todas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {pendenciasAtivas.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Sem pendências no momento.</p>
          ) : (
            <ul className="divide-y divide-border">
              {pendenciasAtivas.map((p) => (
                <li key={p.id}>
                  <Link
                    to={p.destino ?? "/app/pendencias"}
                    className="flex flex-wrap items-center gap-3 px-6 py-3 transition-colors hover:bg-muted/40"
                  >
                    <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
                      {PEND_TIPO[p.tipo]}
                    </Badge>
                    <p className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {p.titulo}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(p.prazo)}
                    </span>
                    {p.status === "atrasada" && (
                      <span className="inline-flex rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                        Atrasada
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Atividade recente */}
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="font-display text-lg">Atividade recente</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative space-y-5 border-l border-border pl-5">
            {atividades.map((a) => (
              <li key={a.id} className="relative">
                <CircleDot className="absolute -left-[27px] top-0.5 h-3.5 w-3.5 text-primary" />
                <p className="text-sm text-foreground">{a.texto}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{a.quando}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
