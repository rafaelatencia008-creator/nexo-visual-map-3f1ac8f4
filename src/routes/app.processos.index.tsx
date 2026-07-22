import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { processos, clientes } from "@/lib/mock/data";
import { formatDate } from "@/lib/format";
import type { StatusProcesso } from "@/lib/mock/types";

export const Route = createFileRoute("/app/processos")({
  head: () => ({
    meta: [
      { title: "Processos — Nexo Pericial 360" },
      {
        name: "description",
        content:
          "Base visual dos processos judiciais vinculados às perícias em andamento.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProcessosPage,
});

const STATUS_LABEL: Record<StatusProcesso, string> = {
  ativo: "Ativo",
  suspenso: "Suspenso",
  arquivado: "Arquivado",
};

const STATUS_VARIANT: Record<
  StatusProcesso,
  "default" | "secondary" | "outline" | "destructive"
> = {
  ativo: "default",
  suspenso: "secondary",
  arquivado: "outline",
};

function ProcessosPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"todos" | StatusProcesso>("todos");

  const clienteMap = useMemo(
    () => new Map(clientes.map((c) => [c.id, c])),
    [],
  );

  const filtrados = useMemo(() => {
    const termo = query.trim().toLowerCase();
    const soDigitos = termo.replace(/\D/g, "");
    return processos.filter((p) => {
      if (status !== "todos" && p.status !== status) return false;
      if (!termo) return true;
      const cliente = clienteMap.get(p.clienteId);
      return (
        p.numero.toLowerCase().includes(termo) ||
        (soDigitos.length > 0 && p.numero.replace(/\D/g, "").includes(soDigitos)) ||
        p.comarca.toLowerCase().includes(termo) ||
        p.vara.toLowerCase().includes(termo) ||
        (cliente?.nome.toLowerCase().includes(termo) ?? false)
      );
    });
  }, [query, status, clienteMap]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Processos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Processos judiciais vinculados às perícias do escritório.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/app/processos/novo">
            <Plus className="h-4 w-4" />
            Novo processo
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por número, comarca, vara ou cliente…"
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as typeof status)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="suspenso">Suspenso</SelectItem>
              <SelectItem value="arquivado">Arquivado</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Search className="h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">
                Nenhum processo encontrado
              </p>
              <p className="text-sm text-muted-foreground">
                Ajuste a busca ou o filtro para localizar outros registros.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número CNJ</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Comarca</TableHead>
                    <TableHead>Vara</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastrado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((p) => {
                    const cliente = clienteMap.get(p.clienteId);
                    return (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer hover:bg-muted/60"
                      >
                        <TableCell className="font-mono text-xs">
                          <Link
                            to="/app/processos/$id"
                            params={{ id: p.id }}
                            className="hover:underline"
                          >
                            {p.numero}
                          </Link>
                        </TableCell>
                        <TableCell className="font-medium">
                          {cliente?.nome ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.comarca}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.vara}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[p.status]}>
                            {STATUS_LABEL[p.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(p.criadoEm)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
