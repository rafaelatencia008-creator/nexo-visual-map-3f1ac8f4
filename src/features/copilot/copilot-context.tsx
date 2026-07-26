import * as React from "react";
import type { CopilotRouteContext } from "./copilot-types";
import { moduleFromRoute } from "./copilot-engine";

type ContextRegistrationInput = Readonly<{
  entityType?: string;
  entityId?: string;
  entityLabel?: string;
  metadata?: Readonly<Record<string, unknown>>;
}>;

type Ctx = {
  routeContext: CopilotRouteContext;
  setRoute: (route: string) => void;
  registerEntity: (input: ContextRegistrationInput) => void;
  clearEntity: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
};

const CopilotRouteCtx = React.createContext<Ctx | null>(null);

export function CopilotContextProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = React.useState<string>(() =>
    typeof window !== "undefined" ? window.location.pathname : "/app",
  );
  const [entity, setEntity] = React.useState<ContextRegistrationInput | null>(null);
  const [open, setOpen] = React.useState(false);

  const registerEntity = React.useCallback((input: ContextRegistrationInput) => {
    setEntity(input);
  }, []);
  const clearEntity = React.useCallback(() => setEntity(null), []);
  const toggle = React.useCallback(() => setOpen((v) => !v), []);

  const routeContext = React.useMemo<CopilotRouteContext>(() => {
    const { moduleKey, moduleLabel } = moduleFromRoute(route);
    return {
      route,
      moduleKey,
      moduleLabel,
      entityType: entity?.entityType,
      entityId: entity?.entityId,
      entityLabel: entity?.entityLabel,
      metadata: entity?.metadata,
    };
  }, [route, entity]);

  const value = React.useMemo<Ctx>(
    () => ({ routeContext, setRoute, registerEntity, clearEntity, open, setOpen, toggle }),
    [routeContext, registerEntity, clearEntity, open, toggle],
  );

  // sync popstate/pushstate — simples observador
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    let last = window.location.pathname;
    const check = () => {
      if (window.location.pathname !== last) {
        last = window.location.pathname;
        setRoute(last);
      }
    };
    const id = window.setInterval(check, 300);
    window.addEventListener("popstate", check);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("popstate", check);
    };
  }, []);

  return <CopilotRouteCtx.Provider value={value}>{children}</CopilotRouteCtx.Provider>;
}

export function useCopilotContext(): Ctx {
  const v = React.useContext(CopilotRouteCtx);
  if (!v) throw new Error("useCopilotContext deve ser usado dentro de CopilotContextProvider");
  return v;
}

/** Uso pelas páginas: registra a entidade aberta e limpa no unmount. */
export function useRegisterCopilotEntity(input: ContextRegistrationInput | null | undefined) {
  const { registerEntity, clearEntity } = useCopilotContext();
  React.useEffect(() => {
    if (input && input.entityId) {
      registerEntity(input);
      return () => clearEntity();
    }
    return undefined;
  }, [input?.entityId, input?.entityType, input?.entityLabel, registerEntity, clearEntity, input]);
}
