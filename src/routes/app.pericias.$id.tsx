import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  FileText,
  Mail,
  Phone,
  Ban,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pericias, processos, clientes, peritos } from "@/lib/mock/data";
import {
  formatCurrency,
  formatDateTime,
  formatDate,
  formatCPF,
  formatCNPJ,
  formatPhone,
} from "@/lib/format";
import type {
  StatusPericia,
  TipoPericia,
  Pericia,
  Processo,
  Cliente,
  Perito,
} from "@/lib/mock/types";

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
  agendada: "bg-primary/10 text-primary",
  em_andamento:
    "bg-[hsl(var(--brand-accent)/0.15)] text-[hsl(var(--brand-accent))]",
  laudo_pendente: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  concluida: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  cancelada: "bg-muted text-muted-foreground",
};

export const Route = createFileRoute("/app/pericias/$id")({
  loader: ({ params }): {
    pericia: Pericia;
    processo: Processo | undefined;
    cliente: Cliente | undefined;
    perito: Perito | undefined;
  } => {
    const pericia = pericias.find((p) => p.id === params.id);
    if (!pericia) throw notFound();
    const processo = processos.find((pr) => pr.id === pericia.processoId);
    const cliente = processo
      ? clientes.find((c) => c.id === processo.clienteId)
      : undefined;
    const perito = peritos.find((pe) => pe.id === pericia.peritoId);
    return { pericia, processo, cliente, perito };
  },
  head: ({ loaderData }) => {
    const titulo = loaderData
      ? `${TIPO_LABEL[loaderData.pericia.tipo]} — Perícia`
      : "Perícia não encontrada";
    return {
      meta: [
        { title: `${titulo} — Nexo Pericial 360` },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  component: PericiaDetalhePage,
  errorComponent: PericiaErro,
  notFoundComponent: PericiaNaoEncontrada,
});

function PericiaDetalhePage() {
  const { pericia, processo, cliente, perito } = Route.useLoaderData() as {
    pericia: Pericia;
    processo: Processo | undefined;
    cliente: Cliente | undefined;
    perito: Perito | undefined;
  };

  const emBreve = (label: string) =>
    toast.info(`${label} — em breve`, {
      description: "Ação será liberada em etapas futuras.",
    });

  const docCliente = cliente
    ? cliente.tipoPessoa === "PJ"
      ? formatCNPJ(cliente.documento)
      : formatCPF(cliente.documento)
    : "—";

  const historico = [
    {
      label: "Perícia cadastrada",
      data: processo?.criadoEm ?? pericia.dataAgendada,
      done: true,
    },
    {
      label: "Agendamento confirmado",
      data: pericia.dataAgendada,
      done: pericia.status !== "cancelada",
    },
    {
      label: "Diligências em andamento",
      data: pericia.dataAgendada,
      done:
        pericia.status === "em_andamento" ||
        pericia.status === "laudo_pendente" ||
        pericia.status === "concluida",
    },
    {
      label: "Laudo entregue",
      data: pericia.dataAgendada,
      done: pericia.status === "concluida",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <Link to="/app/pericias">
            <ArrowLeft className="h-4 w-4" />
            Voltar para perícias
          </Link>
        </Button>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              {TIPO_LABEL[pericia.tipo]}
            </h1>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE[pericia.status]}`}
            >
              {STATUS_LABEL[pericia.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Ficha completa da perícia · ID {pericia.id}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" asChild>
            <Link to="/app/pericias/$id/editar" params={{ id: pericia.id }}>
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
          </Button>
          <Button className="gap-2" onClick={() => emBreve("Gerar laudo")}>
            <FileText className="h-4 w-4" />
            Gerar laudo
          </Button>
          <Button
            variant="destructive"
            className="gap-2"
            onClick={() => emBreve("Cancelar perícia")}
          >
            <Ban className="h-4 w-4" />
            Cancelar
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Dados da perícia</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Info label="Tipo" value={TIPO_LABEL[pericia.tipo]} />
              <Info label="Status" value={STATUS_LABEL[pericia.status]} />
              <Info
                label="Data agendada"
                value={formatDateTime(pericia.dataAgendada)}
              />
              <Info
                label="Honorários"
                value={formatCurrency(pericia.honorarios)}
              />
              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Observações
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-foreground">
                  {pericia.observacoes ?? "Nenhuma observação registrada."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {historico.map((ev, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="mt-0.5">
                      {ev.done ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${ev.done ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        {ev.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(ev.data)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Processo vinculado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {processo ? (
                <>
                  <Info label="Número CNJ" value={processo.numero} mono />
                  <Info label="Comarca" value={processo.comarca} />
                  <Info label="Vara" value={processo.vara} />
                  <Info
                    label="Cadastrado em"
                    value={formatDate(processo.criadoEm)}
                  />
                </>
              ) : (
                <p className="text-muted-foreground">
                  Processo não localizado.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Perito responsável</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {perito ? (
                <>
                  <p className="font-medium text-foreground">{perito.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {TIPO_LABEL[perito.especialidade]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {perito.registroProfissional}
                  </p>
                  <div className="space-y-1.5 border-t border-border/60 pt-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{perito.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{formatPhone(perito.telefone)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Perito não atribuído.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {cliente ? (
                <>
                  <p className="font-medium text-foreground">{cliente.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {cliente.tipoPessoa === "PJ"
                      ? "Pessoa Jurídica"
                      : "Pessoa Física"}{" "}
                    · {docCliente}
                  </p>
                  <div className="space-y-1.5 border-t border-border/60 pt-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{cliente.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{formatPhone(cliente.telefone)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Cliente não localizado.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-0.5 text-sm text-foreground ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function PericiaNaoEncontrada() {
  const { id } = Route.useParams();
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <Calendar className="mx-auto h-10 w-10 text-muted-foreground/60" />
      <h2 className="mt-4 font-display text-xl font-semibold text-foreground">
        Perícia não encontrada
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Não localizamos o registro com o identificador{" "}
        <span className="font-mono">{id}</span>.
      </p>
      <Button asChild className="mt-6 gap-2">
        <Link to="/app/pericias">
          <ArrowLeft className="h-4 w-4" />
          Voltar para perícias
        </Link>
      </Button>
    </div>
  );
}

function PericiaErro({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h2 className="font-display text-xl font-semibold text-foreground">
        Não foi possível carregar a perícia
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Ocorreu um erro inesperado ao exibir esta ficha.
      </p>
      <Button
        className="mt-6"
        onClick={() => {
          router.invalidate();
          reset();
        }}
      >
        Tentar novamente
      </Button>
    </div>
  );
}
