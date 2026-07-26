/**
 * LV-17 — Estados visuais compartilhados.
 *
 * Componentes de apresentação puros para uniformizar mensagens de:
 *   - carregando, vazio, erro, sem permissão, offline, sem resultado.
 *
 * Não substituem componentes já aprovados em módulos específicos; servem
 * como fallback padrão em telas que ainda usam variações ad-hoc.
 */

import * as React from "react";
import {
  AlertCircle,
  Inbox,
  Loader2,
  Lock,
  SearchX,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type BaseProps = Readonly<{
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: Readonly<{ label: string; onClick: () => void }>;
}>;

function ShellState({ title, description, icon: Icon, action }: BaseProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-muted/20 p-8 text-center"
      role="status"
      aria-live="polite"
    >
      {Icon ? (
        <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      ) : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? (
        <Button variant="outline" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

export function LoadingState({
  title = "Carregando…",
  description,
}: Partial<BaseProps> = {}) {
  return <ShellState title={title} description={description} icon={Loader2} />;
}

export function EmptyState(props: BaseProps) {
  return <ShellState {...props} icon={props.icon ?? Inbox} />;
}

export function NoResultsState({
  title = "Nenhum resultado encontrado",
  description = "Ajuste os filtros ou a busca para tentar novamente.",
  action,
}: Partial<BaseProps> = {}) {
  return (
    <ShellState
      title={title}
      description={description}
      icon={SearchX}
      action={action}
    />
  );
}

export type ErrorStateProps = Readonly<{
  title?: string;
  description?: string;
  onRetry?: () => void;
  onHome?: () => void;
}>;

export function ErrorState({
  title = "Não foi possível carregar este conteúdo",
  description = "Tente novamente ou volte ao início.",
  onRetry,
  onHome,
}: ErrorStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-8 text-center"
      role="alert"
    >
      <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Tentar novamente
          </Button>
        ) : null}
        {onHome ? (
          <Button variant="ghost" size="sm" onClick={onHome}>
            Voltar ao início
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function NoPermissionState({
  title = "Sem permissão para visualizar este conteúdo",
  description = "Fale com o responsável da organização para liberar o acesso.",
  action,
}: Partial<BaseProps> = {}) {
  return (
    <ShellState title={title} description={description} icon={Lock} action={action} />
  );
}

export function OfflineDemoState({
  title = "Modo demonstrativo sem conexão",
  description = "Esta é uma versão local. Nenhum dado é enviado ou recebido.",
}: Partial<BaseProps> = {}) {
  return <ShellState title={title} description={description} icon={WifiOff} />;
}
