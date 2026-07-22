import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  Briefcase,
  Mail,
  Phone,
  Pencil,
  Archive,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pericias, processos, clientes, peritos } from "@/lib/mock/data";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatCPF,
  formatCNPJ,
  formatPhone,
} from "@/lib/format";
import type {
  StatusProcesso,
  StatusPericia,
  TipoPericia,
  Processo,
  Cliente,
  Pericia,
} from "@/lib/mock/types";

const STATUS_PROCESSO_LABEL: Record<StatusProcesso, string> = {
  ativo: "Ativo",
  suspenso: "Suspenso",
  arquivado: "Arquivado",
};

const STATUS_PROCESSO_VARIANT: Record<
  StatusProcesso,
  "default" | "secondary" | "outline" | "destructive"
> = {
  ativo: "default",
  suspenso: "secondary",
  arquivado: "outline",
};

const TIPO_PERICIA_LABEL: Record<TipoPericia, string> = {
  engenharia_civil: "Engenharia Civil",
  grafotecnica: "Grafotécnica",
  contabil: "Contábil",
  medica: "Médica",
  ambiental: "Ambiental",
  trabalhista: "Trabalhista",
};

const STATUS_PERICIA_LABEL: Record<StatusPericia, string> = {
  agendada: "Agendada",
  em_andamento: "Em andamento",
  laudo_pendente: "Laudo pendente",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const Route = createFileRoute("/app/processos/$id/")({
  loader: ({ params }) => {
    const processo = processos.find((p) => p.id === params.id);
    if (!processo) throw notFound();
    const cliente = clientes.find((c) => c.id === processo.clienteId);
    const periciasVinculadas = pericias.filter(
      (pe) => pe.processoId === processo.id,
    );
    return { processo, cliente, periciasVinculadas };
  },
  head: ({ loaderData }) => {
    const titulo = loaderData
      ? `Processo ${loaderData.processo.numero}`
      : "Processo não encontrado";
    return {
      meta: [
        { title: `${titulo} — Nexo Pericial 360` },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  component: ProcessoDetalhePage,
  errorComponent: ProcessoErro,
  notFoundComponent: ProcessoNaoEncontrado,
});

function ProcessoDetalhePage() {
  const { processo, cliente, periciasVinculadas } = Route.useLoaderData() as {
    processo: Processo;
    cliente: Cliente | undefined;
    periciasVinculadas: Pericia[];
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

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <Link to="/app/processos">
            <ArrowLeft className="h-4 w-4" />
            Voltar para processos
          </Link>
        </Button>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              <span className="font-mono text-xl sm:text-2xl">
                {processo.numero}
              </span>
            </h1>
            <Badge variant={STATUS_PROCESSO_VARIANT[processo.status]}>
              {STATUS_PROCESSO_LABEL[processo.status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {processo.vara} · {processo.comarca}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" asChild>
            <Link to="/app/processos/$id/editar" params={{ id: processo.id }}>
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
          </Button>
          <Button
            className="gap-2"
            onClick={() => emBreve("Nova perícia")}
          >
            <FileText className="h-4 w-4" />
            Nova perícia
          </Button>
          <Button
            variant="destructive"
            className="gap-2"
            onClick={() => emBreve("Arquivar processo")}
          >
            <Archive className="h-4 w-4" />
            Arquivar
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Dados do processo</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Info label="Número CNJ" value={processo.numero} mono />
              <Info
                label="Status"
                value={STATUS_PROCESSO_LABEL[processo.status]}
              />
              <Info label="Comarca" value={processo.comarca} />
              <Info label="Vara" value={processo.vara} />
              <Info
                label="Cadastrado em"
                value={formatDateTime(processo.criadoEm)}
              />
              <Info label="ID interno" value={processo.id} mono />
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Perícias vinculadas ({periciasVinculadas.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {periciasVinculadas.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma perícia vinculada a este processo.
                </p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {periciasVinculadas.map((pe) => {
                    const perito = peritos.find((p) => p.id === pe.peritoId);
                    return (
                      <li key={pe.id} className="py-3">
                        <Link
                          to="/app/pericias/$id"
                          params={{ id: pe.id }}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-md px-2 py-1 transition-colors hover:bg-muted/60"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {TIPO_PERICIA_LABEL[pe.tipo]}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {perito?.nome ?? "Sem perito atribuído"} ·{" "}
                              {formatDate(pe.dataAgendada)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(pe.honorarios)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {STATUS_PERICIA_LABEL[pe.status]}
                            </Badge>
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

        {/* Coluna lateral */}
        <div className="space-y-6">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
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
                <p className="text-muted-foreground">Cliente não localizado.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Perícias</span>
                <span className="font-medium">{periciasVinculadas.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Honorários totais</span>
                <span className="font-medium">
                  {formatCurrency(
                    periciasVinculadas.reduce(
                      (acc, p) => acc + p.honorarios,
                      0,
                    ),
                  )}
                </span>
              </div>
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

function ProcessoNaoEncontrado() {
  const { id } = Route.useParams();
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/60" />
      <h2 className="mt-4 font-display text-xl font-semibold text-foreground">
        Processo não encontrado
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Não localizamos o registro com o identificador{" "}
        <span className="font-mono">{id}</span>.
      </p>
      <Button asChild className="mt-6 gap-2">
        <Link to="/app/processos">
          <ArrowLeft className="h-4 w-4" />
          Voltar para processos
        </Link>
      </Button>
    </div>
  );
}

function ProcessoErro({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h2 className="font-display text-xl font-semibold text-foreground">
        Não foi possível carregar o processo
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
