import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Mail, Phone, Building2, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { clientes } from "@/lib/mock/data";
import { formatCPF, formatCNPJ, formatPhone } from "@/lib/format";

export const Route = createFileRoute("/app/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes — Nexo Pericial 360" },
      {
        name: "description",
        content:
          "Base visual de clientes pessoa física e jurídica atendidos pelo escritório pericial.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientesPage,
});

function ClientesPage() {
  const [query, setQuery] = useState("");

  const filtrados = useMemo(() => {
    const termo = query.trim().toLowerCase();
    if (!termo) return clientes;
    const soDigitos = termo.replace(/\D/g, "");
    return clientes.filter((c) => {
      const nomeMatch = c.nome.toLowerCase().includes(termo);
      const docMatch = soDigitos.length > 0 && c.documento.includes(soDigitos);
      const emailMatch = c.email.toLowerCase().includes(termo);
      return nomeMatch || docMatch || emailMatch;
    });
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Clientes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pessoas físicas e jurídicas atendidas pelo escritório.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/app/clientes/novo">
            <Plus className="h-4 w-4" />
            Novo cliente
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, documento ou e-mail…"
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {filtrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Search className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground">
              Nenhum cliente encontrado
            </p>
            <p className="text-sm text-muted-foreground">
              Ajuste a busca para localizar outros registros.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((cliente) => {
            const isPJ = cliente.tipoPessoa === "PJ";
            const documento = isPJ
              ? formatCNPJ(cliente.documento)
              : formatCPF(cliente.documento);
            const Icon = isPJ ? Building2 : UserIcon;
            return (
              <Link
                key={cliente.id}
                to="/app/clientes/$id"
                params={{ id: cliente.id }}
                className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-foreground">
                        {cliente.nome}
                      </h3>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {isPJ ? "Pessoa Jurídica" : "Pessoa Física"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {documento}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-border/60 pt-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{cliente.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{formatPhone(cliente.telefone)}</span>
                    </div>
                  </div>
                </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
