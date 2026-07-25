import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildDiagnosticsReport, type DiagnosticsSnapshot } from "./audio-diagnostics";
import {
  MANUAL_CHECKLIST_ITEMS,
  type ManualCheckStatus,
  type ManualChecklistItem,
} from "./audio-types";

const STATUS_LABEL: Record<ManualCheckStatus, string> = {
  not_tested: "Não testado",
  approved: "Aprovado",
  approved_with_restriction: "Aprovado com restrição",
  rejected: "Reprovado",
};

const NEXT_STATUS: Record<ManualCheckStatus, ManualCheckStatus> = {
  not_tested: "approved",
  approved: "approved_with_restriction",
  approved_with_restriction: "rejected",
  rejected: "not_tested",
};

export function AudioDiagnosticsPanel({ snapshot }: { snapshot: DiagnosticsSnapshot }) {
  const [copied, setCopied] = useState(false);
  const [checks, setChecks] = useState<Record<ManualChecklistItem, ManualCheckStatus>>(() => {
    const initial: Partial<Record<ManualChecklistItem, ManualCheckStatus>> = {};
    for (const item of MANUAL_CHECKLIST_ITEMS) initial[item] = "not_tested";
    return initial as Record<ManualChecklistItem, ManualCheckStatus>;
  });

  const report = buildDiagnosticsReport(snapshot);

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(report);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Diagnóstico técnico</CardTitle>
        <Button size="sm" variant="outline" onClick={copy} aria-live="polite">
          {copied ? "Copiado" : "Copiar relatório técnico"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/40 p-3 text-xs">
          {report}
        </pre>

        <div>
          <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-widest">
            Checklist de validação manual
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Estado apenas em memória. Nenhum dispositivo é marcado automaticamente. Clique para
            alternar.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {MANUAL_CHECKLIST_ITEMS.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  onClick={() =>
                    setChecks((prev) => ({ ...prev, [item]: NEXT_STATUS[prev[item]] }))
                  }
                  aria-label={`${item}: ${STATUS_LABEL[checks[item]]}`}
                  className="flex w-full items-center justify-between rounded border border-border/70 bg-background px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <span className="break-words">{item}</span>
                  <Badge
                    variant={
                      checks[item] === "approved"
                        ? "default"
                        : checks[item] === "rejected"
                          ? "destructive"
                          : "outline"
                    }
                    className="ml-2 shrink-0"
                  >
                    {STATUS_LABEL[checks[item]]}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
