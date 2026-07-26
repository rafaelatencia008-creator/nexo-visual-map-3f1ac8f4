/**
 * LV-14 — Página principal de Laudos.
 * Lista documentos existentes + botão de criação + editor por blocos.
 */
import { useState, useSyncExternalStore } from "react";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { REPORT_TEMPLATE_LABEL } from "./report-types";
import { getReportsSnapshot, subscribeReports } from "./report-mock-store";
import { ReportCreateDialog } from "./ReportCreateDialog";
import { ReportEditor } from "./ReportEditor";

function useReports() {
  return useSyncExternalStore(
    subscribeReports,
    getReportsSnapshot,
    getReportsSnapshot,
  );
}


function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

export function ReportsPage() {
  const reports = useReports();
  const [openCreate, setOpenCreate] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  if (activeId) {
    return (
      <div className="mx-auto max-w-5xl">
        <ReportEditor reportId={activeId} onBack={() => setActiveId(null)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Laudos e documentos periciais</h1>
          <p className="text-sm text-muted-foreground">
            Estrutura mock dos documentos periciais — modelos, seções, blocos e
            vínculos com fontes internas.
          </p>
        </div>
        <Button onClick={() => setOpenCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Novo documento
        </Button>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhum documento criado ainda. Comece por “Novo documento”.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {reports.map((r) => (
            <Card
              key={r.id}
              className="cursor-pointer transition-colors hover:border-primary/60"
              onClick={() => setActiveId(r.id)}
            >
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium leading-tight">{r.title}</h3>
                  <Badge variant="outline">
                    {REPORT_TEMPLATE_LABEL[r.templateId]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{r.caseLabel}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Atualizado {formatDate(r.updatedAt)}</span>
                  <span>
                    Revisão {(r.reviewProgress * 100).toFixed(0)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ReportCreateDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onCreated={(id) => setActiveId(id)}
      />
    </div>
  );
}
