/**
 * LV-08.6B — estados visuais reutilizáveis (loading, refresh, erro) da
 * seção "Histórico de alterações e Snapshots".
 */

import * as React from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ProcessAuditSnapshotLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Carregando histórico e snapshots"
      className="space-y-4"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico e snapshots</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className="h-6 w-40 animate-pulse rounded bg-muted/60"
            aria-hidden="true"
          />
          <div
            className="h-24 animate-pulse rounded bg-muted/50"
            aria-hidden="true"
          />
          <div
            className="h-24 animate-pulse rounded bg-muted/50"
            aria-hidden="true"
          />
        </CardContent>
      </Card>
      <span className="sr-only">Carregando histórico e snapshots.</span>
    </div>
  );
}

export function ProcessAuditSnapshotError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card role="alert" className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle
            className="h-5 w-5 text-destructive"
            aria-hidden="true"
          />
          Não foi possível carregar o histórico e os snapshots
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Tentar novamente
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onRetry}
            className="gap-2"
          >
            <Loader2 className="h-4 w-4" aria-hidden="true" />
            Recarregar histórico e snapshots
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function RefreshingBanner() {
  return (
    <p
      role="status"
      aria-live="polite"
      className="text-xs text-muted-foreground"
    >
      Atualizando histórico e snapshots.
    </p>
  );
}
