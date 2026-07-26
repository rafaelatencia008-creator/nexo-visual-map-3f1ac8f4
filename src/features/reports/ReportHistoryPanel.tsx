/**
 * LV-16 — Histórico append-only visível ao usuário.
 */
import { useSyncExternalStore } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getReportHistorySnapshot,
  subscribeReportHistory,
} from "./report-mock-store";

export function ReportHistoryPanel({ reportId }: { reportId: string }) {
  const all = useSyncExternalStore(
    subscribeReportHistory,
    getReportHistorySnapshot,
    getReportHistorySnapshot,
  );
  const events = all.filter((e) => e.reportId === reportId);
  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Nenhum evento registrado.
        </CardContent>
      </Card>
    );
  }
  return (
    <ul className="space-y-2">
      {events.slice().reverse().map((e) => (
        <li key={e.id} className="rounded-md border p-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="outline" className="text-[10px]">
              {e.kind}
            </Badge>
            <span className="text-muted-foreground">{e.at}</span>
          </div>
          <p className="mt-1">{e.description}</p>
        </li>
      ))}
    </ul>
  );
}
