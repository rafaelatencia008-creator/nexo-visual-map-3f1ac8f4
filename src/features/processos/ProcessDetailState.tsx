import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Briefcase, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProcessDetailLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="space-y-6"
      aria-label="Carregando resumo do processo"
    >
      <div className="h-8 w-40 animate-pulse rounded bg-muted/60" aria-hidden="true" />
      <div className="space-y-2">
        <div className="h-5 w-32 animate-pulse rounded bg-muted/60" aria-hidden="true" />
        <div className="h-8 w-3/4 animate-pulse rounded bg-muted/60" aria-hidden="true" />
      </div>
      <div className="h-40 animate-pulse rounded-lg bg-muted/50" aria-hidden="true" />
      <div className="h-48 animate-pulse rounded-lg bg-muted/50" aria-hidden="true" />
      <span className="sr-only">Carregando resumo do processo…</span>
    </div>
  );
}

export function ProcessDetailNotFound() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <Briefcase
        className="mx-auto h-10 w-10 text-muted-foreground/60"
        aria-hidden="true"
      />
      <h2 className="mt-4 font-display text-xl font-semibold text-foreground">
        Processo não encontrado
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Não foi possível localizar este processo no escopo atual.
      </p>
      <Button
        type="button"
        className="mt-6 gap-2"
        onClick={() => void navigate({ to: "/app/processos" })}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar para processos
      </Button>
    </div>
  );
}

export function ProcessDetailError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div
      role="alert"
      className="mx-auto max-w-md space-y-4 py-16 text-center"
    >
      <h2 className="font-display text-xl font-semibold text-foreground">
        Não foi possível carregar o processo
      </h2>
      <p className="text-sm text-muted-foreground">{message}</p>
      <div className="flex flex-col-reverse justify-center gap-3 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={() => void navigate({ to: "/app/processos" })}
        >
          Voltar para processos
        </Button>
        <Button type="button" onClick={onRetry} className="gap-2">
          <Loader2 className="h-4 w-4" aria-hidden="true" />
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}
