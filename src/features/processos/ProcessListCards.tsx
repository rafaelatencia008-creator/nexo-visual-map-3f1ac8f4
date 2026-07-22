import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Case } from "@/domain/core/case";
import { formatDate } from "@/lib/format";
import {
  CASE_STATUS_LABELS_PT,
  CONFIDENTIALITY_LABELS_PT,
  READINESS_HINT_LABELS,
  summarizeReadiness,
} from "./process-list-model";

export function ProcessListCards({ items }: { items: readonly Case[] }) {
  return (
    <ul className="grid gap-3 p-3 md:hidden" role="list">
      {items.map((c) => {
        const readiness = summarizeReadiness(c);
        return (
          <li key={c.id}>
            <Card>
              <CardContent className="p-0">
                <Link
                  to="/app/processos/$id"
                  params={{ id: c.id }}
                  aria-label={`Abrir processo ${c.reference}`}
                  className="flex flex-col gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-muted-foreground">
                        {c.reference}
                      </p>
                      <h3 className="mt-1 truncate text-base font-semibold text-foreground">
                        {c.title}
                      </h3>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {CASE_STATUS_LABELS_PT[c.status]}
                    </Badge>
                  </div>

                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Confidencialidade</dt>
                      <dd className="mt-0.5 font-medium text-foreground">
                        {CONFIDENTIALITY_LABELS_PT[c.confidentiality]}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Atualizado</dt>
                      <dd className="mt-0.5 font-medium text-foreground">
                        {formatDate(c.metadata.updatedAt)}
                      </dd>
                    </div>
                  </dl>

                  <div>
                    <Badge variant={readiness === "ready" ? "default" : "outline"}>
                      <span aria-hidden="true" className="mr-1">
                        {readiness === "ready" ? "●" : "◐"}
                      </span>
                      {READINESS_HINT_LABELS[readiness]}
                    </Badge>
                  </div>
                </Link>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
