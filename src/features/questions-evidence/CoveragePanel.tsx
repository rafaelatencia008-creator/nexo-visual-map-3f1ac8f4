/**
 * LV-12 — Painel de análise geral de cobertura.
 */
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { processos, pericias } from "@/lib/mock/data";
import { listQuestions } from "./question-mock-store";
import { computeGlobalCoverage } from "./question-coverage";
import { COVERAGE_BAND_LABEL, EVIDENCE_TYPE_LABEL } from "./question-labels";
import type { EvidenceType } from "./question-types";

export function CoveragePanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [caseId, setCaseId] = useState<string>("todos");
  const [expertiseId, setExpertiseId] = useState<string>("todas");

  const questions = useMemo(() => {
    const all = listQuestions();
    return all.filter((q) => {
      if (caseId !== "todos" && q.caseId !== caseId) return false;
      if (expertiseId !== "todas" && q.expertiseId !== expertiseId) return false;
      return true;
    });
  }, [caseId, expertiseId]);

  const cov = useMemo(() => computeGlobalCoverage(questions), [questions]);
  const caseLabel = (id: string) => processos.find((p) => p.id === id)?.numero ?? id;

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Análise geral de cobertura</DialogTitle>
          <DialogDescription>
            Visão consolidada de cobertura, lacunas e prioridades. Cálculo determinístico, sem IA.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label>Processo</Label>
            <Select value={caseId} onValueChange={setCaseId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {processos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.numero}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Perícia</Label>
            <Select value={expertiseId} onValueChange={setExpertiseId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {pericias.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.id} — {p.tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Cobertura média</p>
            <p className="text-3xl font-semibold">{cov.averageScore}%</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {(["completa", "boa", "parcial", "baixa", "insuficiente"] as const).map((b) => (
            <Card key={b}>
              <CardContent className="p-3">
                <p className="text-xs uppercase text-muted-foreground">{COVERAGE_BAND_LABEL[b]}</p>
                <p className="text-xl font-semibold">{cov.totals[b]}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Card>
            <CardContent className="p-3">
              <p className="text-sm">Completos: <strong>{cov.completeCount}</strong></p>
              <p className="text-sm">Parciais: <strong>{cov.partialCount}</strong></p>
              <p className="text-sm">Sem evidência: <strong>{cov.withoutEvidenceCount}</strong></p>
              <p className="text-sm">Com divergência: <strong>{cov.divergentCount}</strong></p>
              <p className="text-sm">Vencidos: <strong>{cov.overdueCount}</strong></p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="mb-1 text-sm font-semibold">Processos com mais lacunas</p>
              {cov.caseGaps.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem lacunas abertas.</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {cov.caseGaps.slice(0, 5).map((c) => (
                    <li key={c.caseId} className="flex justify-between">
                      <span>{caseLabel(c.caseId)}</span>
                      <Badge variant="outline">{c.openGaps}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-3">
            <p className="mb-2 text-sm font-semibold">Tipos de evidência mais utilizados</p>
            <div className="flex flex-wrap gap-2">
              {cov.evidenceTypeUsage.length === 0 ? (
                <p className="text-xs text-muted-foreground">Ainda sem evidências.</p>
              ) : (
                cov.evidenceTypeUsage.map((e) => (
                  <Badge key={e.type} variant="outline">
                    {EVIDENCE_TYPE_LABEL[e.type as EvidenceType]}: {e.count}
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <p className="mb-2 text-sm font-semibold">Lista priorizada de problemas</p>
            {cov.priorityIssues.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum problema priorizado.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {cov.priorityIssues.slice(0, 10).map((p) => (
                  <li key={p.questionId} className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Nº {p.sequence}</Badge>
                    <span className="text-muted-foreground">{p.reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
