/**
 * LV-17 — Painel de diagnóstico demonstrativo.
 *
 * Visível apenas quando a URL contém `?demo=1`. Não é rota administrativa.
 * Nenhum token, segredo, variável de ambiente ou stack trace é exibido.
 */

import * as React from "react";
import { useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bug, RotateCcw, Trash2 } from "lucide-react";
import {
  DEMO_CLOCK_ISO,
  DEMO_FRONTEND_VERSION,
  DEMO_MODULES,
} from "@/lib/demo/fixtures";
import { resetDemoData } from "@/lib/demo/reset";
import {
  clearDemoLogs,
  getDemoLogs,
  subscribeDemoLogs,
} from "@/lib/demo/logger";
import {
  getReportsSnapshot,
  subscribeReports,
} from "@/features/reports/report-mock-store";

function useDemoEnabled(): boolean {
  const location = useLocation();
  return React.useMemo(() => {
    const search = location.searchStr ?? "";
    if (!search) return false;
    const params = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search,
    );
    return params.get("demo") === "1";
  }, [location.searchStr]);
}

export function DemoDiagnosticsOverlay() {
  const enabled = useDemoEnabled();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);

  const logs = useSyncExternalStore(
    subscribeDemoLogs,
    () => getDemoLogs(),
    () => getDemoLogs(),
  );
  const reports = useSyncExternalStore(
    subscribeReports,
    () => getReportsSnapshot(),
    () => getReportsSnapshot(),
  );

  if (!enabled) return null;

  const handleReset = () => {
    resetDemoData();
    setOpen(false);
    toast.success("Demonstração reiniciada.");
    navigate({ to: "/app" });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="fixed bottom-24 right-4 z-50 shadow-lg sm:bottom-6"
          aria-label="Abrir diagnóstico demonstrativo"
        >
          <Bug className="mr-2 h-4 w-4" aria-hidden="true" />
          Diagnóstico
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Diagnóstico demonstrativo</SheetTitle>
          <SheetDescription>
            Informações locais da sessão. Nenhum dado real, nenhuma conexão externa.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 text-sm">
          <section aria-labelledby="diag-info">
            <h3 id="diag-info" className="text-xs font-semibold uppercase text-muted-foreground">
              Ambiente
            </h3>
            <dl className="mt-2 grid grid-cols-2 gap-2">
              <dt className="text-muted-foreground">Versão visual</dt>
              <dd className="font-medium">{DEMO_FRONTEND_VERSION}</dd>
              <dt className="text-muted-foreground">Data mock</dt>
              <dd className="font-medium">{DEMO_CLOCK_ISO}</dd>
              <dt className="text-muted-foreground">Backend</dt>
              <dd><Badge variant="outline">ausente</Badge></dd>
              <dt className="text-muted-foreground">IA</dt>
              <dd><Badge variant="outline">ausente</Badge></dd>
              <dt className="text-muted-foreground">Persistência</dt>
              <dd><Badge variant="outline">apenas em memória</Badge></dd>
              <dt className="text-muted-foreground">Laudos mock</dt>
              <dd className="font-medium">{reports.length}</dd>
            </dl>
          </section>

          <section aria-labelledby="diag-mods">
            <h3 id="diag-mods" className="text-xs font-semibold uppercase text-muted-foreground">
              Módulos disponíveis
            </h3>
            <ul className="mt-2 flex flex-wrap gap-1">
              {DEMO_MODULES.map((m) => (
                <li key={m}>
                  <Badge variant="secondary" className="text-xs">{m}</Badge>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="diag-logs" className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 id="diag-logs" className="text-xs font-semibold uppercase text-muted-foreground">
                Eventos recentes ({logs.length})
              </h3>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  clearDemoLogs();
                  toast.success("Logs limpos.");
                }}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                Limpar
              </Button>
            </div>
            <div className="max-h-56 overflow-y-auto rounded-md border bg-muted/20 p-2 text-xs">
              {logs.length === 0 ? (
                <p className="text-muted-foreground">Sem eventos registrados nesta sessão.</p>
              ) : (
                <ul className="space-y-1">
                  {logs.slice().reverse().map((e) => (
                    <li key={e.id} className="font-mono">
                      <span className="text-muted-foreground">{e.at.slice(11, 19)}</span>{" "}
                      <span className="font-semibold">[{e.category}]</span> {e.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section aria-labelledby="diag-actions" className="space-y-2">
            <h3 id="diag-actions" className="text-xs font-semibold uppercase text-muted-foreground">
              Ações
            </h3>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm">
                  <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                  Resetar demonstração
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Restaurar dados demonstrativos?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação restaura todos os dados demonstrativos da sessão atual.
                    Nenhum dado real é afetado.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset}>
                    Restaurar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
