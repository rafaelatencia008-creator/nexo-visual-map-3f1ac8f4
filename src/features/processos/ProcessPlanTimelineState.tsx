/**
 * LV-08.5B — estados compartilhados (loading / erro / vazio).
 */

import * as React from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ProcessPlanTimelineLoading() {
  return (
    <div
      className="flex items-center gap-3 rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span>Carregando plano e cronologia.</span>
    </div>
  );
}

export function ProcessPlanTimelineRefreshing() {
  return (
    <div
      className="pointer-events-none sr-only"
      role="status"
      aria-live="polite"
    >
      Atualizando plano e cronologia.
    </div>
  );
}

export type ProcessPlanTimelineErrorProps = Readonly<{
  message: string;
  onRetry: () => void;
}>;

export function ProcessPlanTimelineError({
  message,
  onRetry,
}: ProcessPlanTimelineErrorProps) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircle className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>Não foi possível carregar o plano e a cronologia.</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p>{message}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export type EmptyStateProps = Readonly<{
  title: string;
  description: string;
}>;

export function ProcessPlanTimelineEmpty({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1">{description}</p>
    </div>
  );
}
