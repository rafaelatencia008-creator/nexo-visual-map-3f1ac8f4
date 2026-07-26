import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { validateReportTemplate } from "../report-template-validation";
import type { ReportTemplate } from "../report-template-types";

export function ReportTemplateValidationPanel({
  template,
  autoRun,
}: {
  template: ReportTemplate;
  autoRun?: boolean;
}) {
  const [runTick, setRunTick] = useState(autoRun ? 1 : 0);
  const result = useMemo(
    () => (runTick > 0 ? validateReportTemplate(template) : null),
    [template, runTick],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Validação</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setRunTick((t) => t + 1)}>
          {result ? "Revalidar" : "Executar validação"}
        </Button>
      </CardHeader>
      <CardContent>
        {!result && (
          <p className="text-sm text-muted-foreground">
            Execute a validação para verificar erros e avisos.
          </p>
        )}
        {result && (
          <>
            <div className="mb-3 flex items-center gap-2">
              {result.valid ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
                  <span className="text-sm font-medium text-emerald-700">
                    Modelo válido
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-destructive" aria-hidden />
                  <span className="text-sm font-medium text-destructive">
                    Modelo inválido
                  </span>
                </>
              )}
              <Badge variant="destructive" aria-label={`${result.errors.length} erros`}>
                {result.errors.length} erros
              </Badge>
              <Badge variant="secondary" aria-label={`${result.warnings.length} avisos`}>
                {result.warnings.length} avisos
              </Badge>
            </div>
            <ScrollArea className="max-h-72 pr-3">
              <ul className="space-y-2">
                {result.errors.map((i, idx) => (
                  <li
                    key={`e-${idx}`}
                    className="rounded border border-destructive/30 bg-destructive/5 p-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive" aria-hidden />
                      <code className="text-xs">{i.code}</code>
                    </div>
                    <p>{i.message}</p>
                    <p className="text-xs text-muted-foreground">{i.path}</p>
                  </li>
                ))}
                {result.warnings.map((i, idx) => (
                  <li
                    key={`w-${idx}`}
                    className="rounded border border-amber-300 bg-amber-50 p-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-amber-700" aria-hidden />
                      <code className="text-xs">{i.code}</code>
                    </div>
                    <p>{i.message}</p>
                    <p className="text-xs text-muted-foreground">{i.path}</p>
                  </li>
                ))}
                {result.errors.length === 0 && result.warnings.length === 0 && (
                  <li className="text-sm text-muted-foreground">Sem problemas detectados.</li>
                )}
              </ul>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
}
