import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Eye, Filter } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { pericias, processos, clientes, peritos } from "@/lib/mock/data";
import { formatCurrency, formatDateTime, formatCNPJ, formatCPF } from "@/lib/format";
import type { StatusPericia, TipoPericia } from "@/lib/mock/types";

export const Route = createFileRoute("/app/pericias")({
  head: () => ({
    meta: [
      { title: "Perícias — Nexo Pericial 360" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PericiasPage,
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
  agendada: "bg-primary/10 text-primary",
  em_andamento:
    "bg-[hsl(var(--brand-accent)/0.15)] text-[hsl(var(--brand-accent))]",
  laudo_pendente: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  concluida: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  cancelada: "bg-muted text-muted-foreground",
};

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

function docFormatado(cli?: { tipoPessoa: string; documento: string }) {
  if (!cli) return "—";
  return cli.tipoPessoa === "PJ" ? formatCNPJ(cli.documento) : formatCPF(cli.documento);
}

function PericiasPage() {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusPericia | "todos">("todos");
  const [tipo, setTipo] = useState<TipoPericia | "todos">("todos");

  const linhas = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return pericias
      .map((p) => {
        const processo = processos.find((pr) => pr.id === p.processoId);
        const cliente = processo
          ? clientes.find((c) => c.id === processo.clienteId)
          : undefined;
        const perito = peritos.find((pe) => pe.id === p.peritoId);
        return { p, processo, cliente, perito };
      })
      .filter(({ p, processo, cliente }) => {
        if (status !== "todos" && p.status !== status) return false;
        if (tipo !== "todos" && p.tipo !== tipo) return false;
        if (!b) return true;
        return (
          (processo?.numero.toLowerCase().includes(b) ?? false) ||
          (cliente?.nome.toLowerCase().includes(b) ?? false)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.p.dataAgendada).getTime() -
          new Date(a.p.dataAgendada).getTime(),
      );
  }, [busca, status, tipo]);

  const total = pericias.length;

  const emBreve = (label: string) =>
    toast.info(`${label} — em breve`, {
      description: "Fluxo interativo será liberado em etapas futuras.",
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Perícias
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie todas as perícias em andamento, laudos pendentes e agendamentos.
          </p>
        </div>
        <Button onClick={() => emBreve("Nova perícia")} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova perícia
        </Button>
      </header>

      {/* Filtros */}
      <Card className="border-border/70">
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="min-w-[240px] flex-1">
            <label
              htmlFor="busca"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Buscar
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="busca"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Nº do processo ou nome do cliente"
                className="pl-9"
              />
            </div>
          </div>

          <div className="min-w-[180px]">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Status
            </label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as StatusPericia | "todos")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[180px]">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Tipo
            </label>
            <Select
              value={tipo}
              onValueChange={(v) => setTipo(v as TipoPericia | "todos")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIPO_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(busca || status !== "todos" || tipo !== "todos") && (
            <Button
              type="button"
              variant="ghost"
              className="gap-2"
              onClick={() => {
                setBusca("");
                setStatus("todos");
                setTipo("todos");
              }}
            >
              <Filter className="h-4 w-4" />
              Limpar filtros
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="border-border/70">
        <CardContent className="p-0">
          {linhas.length === 0 ? (
            <div className="p-12 text-center">
              <p className="font-display text-lg text-foreground">
                Nenhuma perícia encontrada
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ajuste os filtros ou limpe a busca para ver mais resultados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Processo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Perito</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Honorários</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhas.map(({ p, processo, cliente, perito }) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {processo?.numero ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {processo?.comarca ?? ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {cliente?.nome ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {docFormatado(cliente)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {TIPO_LABEL[p.tipo]}
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {perito?.nome ?? "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-foreground">
                        {formatDateTime(p.dataAgendada)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right text-sm font-medium text-foreground">
                        {formatCurrency(p.honorarios)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[p.status]}`}
                        >
                          {STATUS_LABEL[p.status]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => emBreve("Detalhes da perícia")}
                        >
                          <Eye className="h-4 w-4" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {linhas.length} de {total} perícias
      </p>
    </div>
  );
}
