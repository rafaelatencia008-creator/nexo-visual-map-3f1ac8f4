import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, Clock, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  pendencias as ALL,
  TIPO_LABEL,
  PRIORIDADE_LABEL,
  STATUS_LABEL,
  type PendenciaTipo,
  type PendenciaPrioridade,
  type PendenciaStatus,
} from "@/lib/mock/pendencias";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/app/pendencias")({
  head: () => ({
    meta: [
      { title: "Pendências — Nexo Pericial 360" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PendenciasPage,
});

const STATUS_TONE: Record<PendenciaStatus, string> = {
  aberta: "bg-muted text-foreground",
  atrasada: "bg-destructive/10 text-destructive",
  proxima: "bg-[hsl(var(--brand-accent)/0.15)] text-[hsl(var(--brand-accent))]",
  concluida: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

const STATUS_ICON: Record<PendenciaStatus, React.ComponentType<{ className?: string }>> = {
  aberta: Clock,
  atrasada: AlertCircle,
  proxima: AlertCircle,
  concluida: CheckCircle2,
};

function PendenciasPage() {
  const [tipo, setTipo] = React.useState<PendenciaTipo | "todos">("todos");
  const [prioridade, setPrioridade] = React.useState<PendenciaPrioridade | "todas">("todas");

  const items = ALL.filter((p) => {
    if (tipo !== "todos" && p.tipo !== tipo) return false;
    if (prioridade !== "todas" && p.prioridade !== prioridade) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Central de pendências
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Tudo o que precisa de atenção
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Consolida prazos, documentos, entrevistas, quesitos e laudos com base
          em dados fictícios da demonstração.
        </p>
      </header>

      <Card className="border-border/70">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="font-display text-lg">Filtrar</CardTitle>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Select value={tipo} onValueChange={(v) => setTipo(v as PendenciaTipo | "todos")}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {(Object.keys(TIPO_LABEL) as PendenciaTipo[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIPO_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={prioridade}
              onValueChange={(v) => setPrioridade(v as PendenciaPrioridade | "todas")}
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as prioridades</SelectItem>
                {(Object.keys(PRIORIDADE_LABEL) as PendenciaPrioridade[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORIDADE_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">
                Nenhuma pendência com esses filtros.
              </p>
              <p className="text-xs text-muted-foreground">
                Ajuste os filtros para ver outras categorias.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((p) => {
                const Icon = STATUS_ICON[p.status];
                const isConcluida = p.status === "concluida";
                const content = (
                  <div className="flex flex-wrap items-start gap-3 px-4 py-4 sm:px-6">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm font-medium ${
                          isConcluida ? "text-muted-foreground line-through" : "text-foreground"
                        }`}
                      >
                        {p.titulo}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {TIPO_LABEL[p.tipo]} · {p.detalhe} · Prazo {formatDate(p.prazo)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[11px]">
                        {PRIORIDADE_LABEL[p.prioridade]}
                      </Badge>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[p.status]}`}
                      >
                        {STATUS_LABEL[p.status]}
                      </span>
                      {p.destino && !isConcluida && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                );
                return (
                  <li key={p.id}>
                    {p.destino ? (
                      <Link
                        to={p.destino}
                        className="block hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                      >
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="ghost" asChild>
          <Link to="/app">Voltar ao painel</Link>
        </Button>
      </div>
    </div>
  );
}
