import { createFileRoute } from "@tanstack/react-router";
import {
  Briefcase,
  FileClock,
  CalendarClock,
  Users,
  Plus,
  UploadCloud,
  FileSignature,
  CircleDot,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pericias, processos, clientes, peritos } from "@/lib/mock/data";
import { formatDateTime, formatCurrency } from "@/lib/format";
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

function DashboardPage() {
  const hoje = new Date();

  const emAndamento = pericias.filter(
    (p) => p.status === "agendada" || p.status === "em_andamento",
  ).length;
  const laudosPendentes = pericias.filter((p) => p.status === "laudo_pendente").length;

  const daquiSeteDias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
  const prazosProximos = pericias
    .filter((p) => {
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
    .sort(
      (a, b) => new Date(a.dataAgendada).getTime() - new Date(b.dataAgendada).getTime(),
    )
    .slice(0, 5);

  const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(hoje);

  const atividades = [
    {
      id: "atv-01",
      quando: "há 2 horas",
      texto: "Laudo grafotécnico revisado — Processo 0005544-21.2024",
    },
    {
      id: "atv-02",
      quando: "há 5 horas",
      texto: "Perícia contábil atualizada para Em andamento — Banco Meridiano S.A.",
    },
    {
      id: "atv-03",
      quando: "ontem",
      texto: "Novo cliente cadastrado — Seguradora Aliança Nacional",
    },
    {
      id: "atv-04",
      quando: "há 2 dias",
      texto: "Vistoria agendada — Construtora Horizonte Ltda.",
    },
    {
      id: "atv-05",
      quando: "há 3 dias",
      texto: "Honorários registrados — Perícia ambiental Vale S.A.",
    },
  ];

  const kpis = [
    {
      titulo: "Perícias em andamento",
      valor: emAndamento,
      icone: Briefcase,
      dica: "Agendadas + em execução",
    },
    {
      titulo: "Laudos pendentes",
      valor: laudosPendentes,
      icone: FileClock,
      dica: "Aguardando entrega",
    },
    {
      titulo: "Prazos nos próximos 7 dias",
      valor: prazosProximos,
      icone: CalendarClock,
      dica: "Compromissos iminentes",
    },
    {
      titulo: "Clientes ativos",
      valor: clientesAtivos,
      icone: Users,
      dica: "Carteira atual",
    },
  ];

  const acoesRapidas = [
    { label: "Nova perícia", icone: Plus },
    { label: "Enviar documento", icone: UploadCloud },
    { label: "Iniciar laudo", icone: FileSignature },
  ];

  const notify = (label: string) =>
    toast.info(`${label} — em breve`, {
      description: "Fluxo interativo será liberado em etapas futuras.",
    });

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <p className="text-sm text-muted-foreground">
          <span className="capitalize">{dataFormatada}</span>
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
          {saudacao()}, Perito
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Aqui está o panorama do dia. Acompanhe prazos, laudos e movimentações recentes.
        </p>
      </header>

      {/* KPIs */}
      <section aria-label="Indicadores">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icone;
            return (
              <Card key={kpi.titulo} className="border-border/70">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
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
        {/* Próximos prazos */}
        <Card className="border-border/70 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-lg">Próximos prazos</CardTitle>
            <Badge variant="outline" className="text-xs">
              {proximosPrazos.length} itens
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {proximosPrazos.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                Nenhum prazo em aberto.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {proximosPrazos.map((p) => {
                  const processo = processos.find((pr) => pr.id === p.processoId);
                  const perito = peritos.find((pe) => pe.id === p.peritoId);
                  return (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-muted/40"
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
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Ações rápidas */}
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="font-display text-lg">Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {acoesRapidas.map((acao) => {
              const Icon = acao.icone;
              return (
                <Button
                  key={acao.label}
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() => notify(acao.label)}
                >
                  <Icon className="h-4 w-4" />
                  {acao.label}
                </Button>
              );
            })}
            <p className="pt-2 text-xs text-muted-foreground">
              Estes atalhos serão ativados nas próximas etapas visuais.
            </p>
          </CardContent>
        </Card>
      </div>

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
