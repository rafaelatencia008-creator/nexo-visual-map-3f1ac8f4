import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  Mail,
  Pencil,
  Phone,
  User as UserIcon,
  Briefcase,
  Calendar,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { clientes, processos, pericias } from "@/lib/mock/data";
import {
  formatCPF,
  formatCNPJ,
  formatPhone,
  formatCurrency,
  formatDate,
  formatDateTime,
} from "@/lib/format";
import type {
  Cliente,
  Processo,
  Pericia,
  StatusPericia,
  TipoPericia,
  StatusProcesso,
} from "@/lib/mock/types";

const TIPO_LABEL: Record<TipoPericia, string> = {
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

const STATUS_PROCESSO_LABEL: Record<StatusProcesso, string> = {
  ativo: "Ativo",
  suspenso: "Suspenso",
  arquivado: "Arquivado",
};

const STATUS_PROCESSO_TONE: Record<StatusProcesso, string> = {
  ativo: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  suspenso: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  arquivado: "bg-muted text-muted-foreground",
};

export const Route = createFileRoute("/app/clientes/$id")({
  loader: ({ params }): {
    cliente: Cliente;
    processosDoCliente: Processo[];
    periciasDoCliente: Pericia[];
    totalHonorarios: number;
  } => {
    const cliente = clientes.find((c) => c.id === params.id);
    if (!cliente) throw notFound();
    const processosDoCliente = processos.filter((p) => p.clienteId === cliente.id);
    const processoIds = new Set(processosDoCliente.map((p) => p.id));
    const periciasDoCliente = pericias.filter((pe) => processoIds.has(pe.processoId));
    const totalHonorarios = periciasDoCliente.reduce(
      (soma, p) => soma + p.honorarios,
      0
    );
    return { cliente, processosDoCliente, periciasDoCliente, totalHonorarios };
  },
  head: ({ loaderData }) => {
    const titulo = loaderData ? loaderData.cliente.nome : "Cliente não encontrado";
    return {
      meta: [
        { title: `${titulo} — Nexo Pericial 360` },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  component: ClienteDetalhePage,
  errorComponent: ClienteErro,
  notFoundComponent: ClienteNaoEncontrado,
});

function ClienteDetalhePage() {
  const { cliente, processosDoCliente, periciasDoCliente, totalHonorarios } =
    Route.useLoaderData() as {
      cliente: Cliente;
      processosDoCliente: Processo[];
      periciasDoCliente: Pericia[];
      totalHonorarios: number;
    };

  const isPJ = cliente.tipoPessoa === "PJ";
  const Icon = isPJ ? Building2 : UserIcon;
  const documento = isPJ
    ? formatCNPJ(cliente.documento)
    : formatCPF(cliente.documento);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <Link to="/app/clientes">
            <ArrowLeft className="h-4 w-4" />
            Voltar para clientes
          </Link>
        </Button>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              {cliente.nome}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {isPJ ? "Pessoa Jurídica" : "Pessoa Física"}
              </Badge>
              <span className="text-sm text-muted-foreground">{documento}</span>
            </div>
          </div>
        </div>
        <Button asChild className="gap-2">
          <Link to="/app/clientes/$id/editar" params={{ id: cliente.id }}>
            <Pencil className="h-4 w-4" />
            Editar cliente
          </Link>
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={<Briefcase className="h-5 w-5" />}
          label="Processos"
          value={String(processosDoCliente.length)}
        />
        <SummaryCard
          icon={<Calendar className="h-5 w-5" />}
          label="Perícias"
          value={String(periciasDoCliente.length)}
        />
        <SummaryCard
          icon={<Wallet className="h-5 w-5" />}
          label="Honorários totais"
          value={formatCurrency(totalHonorarios)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/70 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Dados de contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{cliente.email}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0" />
              <span>{formatPhone(cliente.telefone)}</span>
            </div>
            <div className="border-t border-border/60 pt-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Documento
              </p>
              <p className="mt-0.5 font-mono text-sm text-foreground">
                {documento}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">
                Processos ({processosDoCliente.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {processosDoCliente.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum processo vinculado a este cliente.
                </p>
              ) : (
                <ul className="space-y-3">
                  {processosDoCliente.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 p-3"
                    >
                      <div className="min-w-0">
                        <Link
                          to="/app/processos/$id"
                          params={{ id: p.id }}
                          className="font-mono text-sm font-medium text-primary hover:underline"
                        >
                          {p.numero}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {p.vara} · {p.comarca}
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_PROCESSO_TONE[p.status]}`}
                      >
                        {STATUS_PROCESSO_LABEL[p.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">
                Perícias ({periciasDoCliente.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {periciasDoCliente.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma perícia vinculada a este cliente.
                </p>
              ) : (
                <ul className="space-y-3">
                  {periciasDoCliente.map((pe) => (
                    <li
                      key={pe.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 p-3"
                    >
                      <div className="min-w-0">
                        <Link
                          to="/app/pericias/$id"
                          params={{ id: pe.id }}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {TIPO_LABEL[pe.tipo]}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDateTime(pe.dataAgendada)} ·{" "}
                          {formatCurrency(pe.honorarios)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {STATUS_PERICIA_LABEL[pe.status]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Ficha do cliente · ID {cliente.id} · Atualizado em{" "}
        {formatDate(new Date().toISOString())}
      </p>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="border-border/70">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="font-display text-lg font-semibold text-foreground">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ClienteNaoEncontrado() {
  const { id } = Route.useParams();
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <UserIcon className="mx-auto h-10 w-10 text-muted-foreground/60" />
      <h2 className="mt-4 font-display text-xl font-semibold text-foreground">
        Cliente não encontrado
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Não localizamos o registro com o identificador{" "}
        <span className="font-mono">{id}</span>.
      </p>
      <Button asChild className="mt-6 gap-2">
        <Link to="/app/clientes">
          <ArrowLeft className="h-4 w-4" />
          Voltar para clientes
        </Link>
      </Button>
    </div>
  );
}

function ClienteErro({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h2 className="font-display text-xl font-semibold text-foreground">
        Não foi possível carregar o cliente
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
