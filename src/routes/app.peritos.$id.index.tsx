import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Mail, Phone, BadgeCheck, UserCog, Pencil, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { peritos, pericias, processos, clientes } from "@/lib/mock/data";
import { formatPhone, formatDateTime, formatCurrency } from "@/lib/format";
import type { TipoPericia, StatusPericia, Perito, Pericia } from "@/lib/mock/types";

const ESPECIALIDADE_LABEL: Record<TipoPericia, string> = {
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

const STATUS_VARIANT: Record<StatusPericia, "default" | "secondary" | "outline" | "destructive"> = {
  agendada: "secondary",
  em_andamento: "default",
  laudo_pendente: "outline",
  concluida: "default",
  cancelada: "destructive",
};

export const Route = createFileRoute("/app/peritos/$id/")({
  loader: ({ params }): {
    perito: Perito;
    periciasDoPerito: Pericia[];
    totalHonorarios: number;
  } => {
    const perito = peritos.find((p) => p.id === params.id);
    if (!perito) throw notFound();
    const periciasDoPerito = pericias.filter((pc) => pc.peritoId === perito.id);
    const totalHonorarios = periciasDoPerito.reduce((s, p) => s + p.honorarios, 0);
    return { perito, periciasDoPerito, totalHonorarios };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Perito não encontrado — Nexo Pericial 360" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    return {
      meta: [
        { title: `${loaderData.perito.nome} — Peritos — Nexo Pericial 360` },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: PeritoDetalhePage,
  errorComponent: PeritoErro,
  notFoundComponent: PeritoNaoEncontrado,
});

function PeritoDetalhePage() {
  const { perito, periciasDoPerito, totalHonorarios } = Route.useLoaderData() as {
    perito: Perito;
    periciasDoPerito: Pericia[];
    totalHonorarios: number;
  };

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/app/peritos">
            <ArrowLeft className="h-4 w-4" />
            Voltar para Peritos
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <UserCog className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              {perito.nome}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {ESPECIALIDADE_LABEL[perito.especialidade]}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {perito.registroProfissional}
              </span>
            </div>
          </div>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/app/peritos/$id/editar" params={{ id: perito.id }}>
            <Pencil className="h-4 w-4" />
            Editar perito
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Perícias vinculadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">
              {periciasDoPerito.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Honorários acumulados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">
              {formatCurrency(totalHonorarios)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Especialidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-foreground">
              {ESPECIALIDADE_LABEL[perito.especialidade]}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contato</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4 shrink-0" />
            <span className="truncate">{perito.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 shrink-0" />
            <span>{formatPhone(perito.telefone)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
            <BadgeCheck className="h-4 w-4 shrink-0" />
            <span>{perito.registroProfissional}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Perícias deste perito
          </CardTitle>
        </CardHeader>
        <CardContent>
          {periciasDoPerito.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma perícia vinculada a este perito.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {periciasDoPerito.map((pc) => {
                const processo = processos.find((p) => p.id === pc.processoId);
                const cliente = processo
                  ? clientes.find((c) => c.id === processo.clienteId)
                  : undefined;
                return (
                  <li key={pc.id} className="py-3">
                    <Link
                      to="/app/pericias/$id"
                      params={{ id: pc.id }}
                      className="flex flex-col gap-1 rounded-md p-2 -mx-2 hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {ESPECIALIDADE_LABEL[pc.tipo]}
                          {cliente ? ` — ${cliente.nome}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(pc.dataAgendada)}
                          {processo ? ` · ${processo.numero}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(pc.honorarios)}
                        </span>
                        <Badge variant={STATUS_VARIANT[pc.status]}>
                          {STATUS_LABEL[pc.status]}
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
  );
}

function PeritoNaoEncontrado() {
  const { id } = Route.useParams();
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="font-display text-2xl font-semibold text-foreground">
        Perito não encontrado
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Não localizamos o perito com identificador <code>{id}</code>.
      </p>
      <Button asChild className="mt-6">
        <Link to="/app/peritos">Voltar para Peritos</Link>
      </Button>
    </div>
  );
}

function PeritoErro({ reset }: { reset: () => void }) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="font-display text-2xl font-semibold text-foreground">
        Não foi possível carregar o perito
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tente novamente em instantes.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Button
          onClick={() => {
            reset();
            router.invalidate();
          }}
        >
          Tentar novamente
        </Button>
        <Button asChild variant="outline">
          <Link to="/app/peritos">Voltar</Link>
        </Button>
      </div>
    </div>
  );
}
