import { Link } from "@tanstack/react-router";
import { ArrowLeft, Hammer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function UnderConstruction({
  title,
  purpose,
  features,
}: {
  title: string;
  purpose: string;
  features: string[];
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <Card className="border-border/70">
        <CardContent className="p-6 sm:p-10">
          <div className="flex flex-col items-start gap-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Hammer className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <Badge variant="outline" className="text-[11px] uppercase tracking-widest">
                Módulo em construção
              </Badge>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {title}
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                {purpose}
              </p>
              <p className="text-xs text-muted-foreground">
                Esta é uma demonstração visual. Nenhuma funcionalidade real está
                ativa neste módulo.
              </p>
            </div>

            <div className="w-full">
              <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-widest text-foreground">
                Recursos previstos
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm text-foreground"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/app">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao painel
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/recursos">Ver roadmap público</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
