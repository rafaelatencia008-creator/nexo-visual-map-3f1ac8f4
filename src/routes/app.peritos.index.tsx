import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Mail, Phone, BadgeCheck, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { peritos } from "@/lib/mock/data";
import { formatPhone } from "@/lib/format";
import type { TipoPericia } from "@/lib/mock/types";

const ESPECIALIDADE_LABEL: Record<TipoPericia, string> = {
  engenharia_civil: "Engenharia Civil",
  grafotecnica: "Grafotécnica",
  contabil: "Contábil",
  medica: "Médica",
  ambiental: "Ambiental",
  trabalhista: "Trabalhista",
};

export const Route = createFileRoute("/app/peritos/")({
  head: () => ({
    meta: [
      { title: "Peritos — Nexo Pericial 360" },
      {
        name: "description",
        content:
          "Quadro visual de peritos e suas especialidades, com contato e registro profissional.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PeritosPage,
});

function PeritosPage() {
  const [query, setQuery] = useState("");

  const filtrados = useMemo(() => {
    const termo = query.trim().toLowerCase();
    if (!termo) return peritos;
    return peritos.filter((p) => {
      return (
        p.nome.toLowerCase().includes(termo) ||
        p.email.toLowerCase().includes(termo) ||
        p.registroProfissional.toLowerCase().includes(termo) ||
        ESPECIALIDADE_LABEL[p.especialidade].toLowerCase().includes(termo)
      );
    });
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Peritos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Profissionais responsáveis pela execução das perícias.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/app/peritos/novo">
            <Plus className="h-4 w-4" />
            Novo perito
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
              placeholder="Buscar por nome, especialidade, registro ou e-mail…"
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
              Nenhum perito encontrado
            </p>
            <p className="text-sm text-muted-foreground">
              Ajuste a busca para localizar outros profissionais.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((perito) => (
            <Card key={perito.id} className="h-full transition-shadow hover:shadow-md">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <UserCog className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-foreground">
                      {perito.nome}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {ESPECIALIDADE_LABEL[perito.especialidade]}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-border/60 pt-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BadgeCheck className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{perito.registroProfissional}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{perito.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{formatPhone(perito.telefone)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
