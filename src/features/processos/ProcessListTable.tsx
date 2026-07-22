import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Case } from "@/domain/core/case";
import { formatDate } from "@/lib/format";
import {
  CASE_STATUS_LABELS_PT,
  CONFIDENTIALITY_LABELS_PT,
  READINESS_HINT_LABELS,
  summarizeReadiness,
} from "./process-list-model";

export function ProcessListTable({ items }: { items: readonly Case[] }) {
  return (
    <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Referência</TableHead>
            <TableHead scope="col">Título</TableHead>
            <TableHead scope="col">Status</TableHead>
            <TableHead scope="col">Confidencialidade</TableHead>
            <TableHead scope="col">Prontidão</TableHead>
            <TableHead scope="col">Atualizado em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((c) => {
            const readiness = summarizeReadiness(c);
            return (
              <TableRow key={c.id} className="hover:bg-muted/60">
                <TableCell className="font-mono text-xs">
                  <Link
                    to="/app/processos/$id"
                    params={{ id: c.id }}
                    className="hover:underline focus-visible:underline"
                    aria-label={`Abrir processo ${c.reference}`}
                  >
                    {c.reference}
                  </Link>
                </TableCell>
                <TableCell className="font-medium">{c.title}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {CASE_STATUS_LABELS_PT[c.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {CONFIDENTIALITY_LABELS_PT[c.confidentiality]}
                </TableCell>
                <TableCell>
                  <Badge variant={readiness === "ready" ? "default" : "outline"}>
                    <span aria-hidden="true" className="mr-1">
                      {readiness === "ready" ? "●" : "◐"}
                    </span>
                    {READINESS_HINT_LABELS[readiness]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(c.metadata.updatedAt)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
