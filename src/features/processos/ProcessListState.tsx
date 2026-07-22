import { Link } from "@tanstack/react-router";
import { AlertCircle, FolderOpen, Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProcessListRefreshingIndicator() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground"
    >
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      <span>Atualizando processos…</span>
    </div>
  );
}

export function ProcessListSkeleton() {
  return (
    <div
      className="p-4 space-y-3"
      role="status"
      aria-live="polite"
      aria-label="Carregando processos"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-14 rounded-md bg-muted/60 animate-pulse"
          aria-hidden="true"
        />
      ))}
      <span className="sr-only">Carregando processos…</span>
    </div>
  );
}

export function ProcessListEmptyOverall() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-4">
      <FolderOpen className="h-10 w-10 text-muted-foreground/60" aria-hidden="true" />
      <div>
        <p className="text-base font-semibold text-foreground">
          Nenhum processo cadastrado
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie o primeiro processo para começar a organizar o trabalho.
        </p>
      </div>
      <Button asChild className="gap-2">
        <Link to="/app/processos/novo">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo processo
        </Link>
      </Button>
    </div>
  );
}

export function ProcessListEmptyFiltered({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-4">
      <Search className="h-10 w-10 text-muted-foreground/60" aria-hidden="true" />
      <div>
        <p className="text-base font-semibold text-foreground">
          Nenhum processo corresponde aos filtros
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajuste a busca ou limpe os filtros para visualizar outros processos.
        </p>
      </div>
      <Button type="button" variant="outline" onClick={onClear}>
        Limpar filtros
      </Button>
    </div>
  );
}

export function ProcessListError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 py-16 text-center px-4"
    >
      <AlertCircle
        className="h-10 w-10 text-destructive"
        aria-hidden="true"
      />
      <div>
        <p className="text-base font-semibold text-foreground">
          Não foi possível carregar os processos
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
      <Button type="button" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}
