import * as React from "react";
import type { CopilotRouteContext } from "./copilot-types";
import { moduleFromRoute } from "./copilot-engine";

export type ContextRegistrationInput = Readonly<{
  entityType: string;
  entityId: string;
  entityLabel?: string;
  route?: string;
  moduleKey?: string;
  metadata?: Readonly<Record<string, unknown>>;
}>;

type Registration = ContextRegistrationInput & { token: symbol };

type Ctx = {
  routeContext: CopilotRouteContext;
  setRoute: (route: string) => void;
  registerCopilotEntity: (input: ContextRegistrationInput) => () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
  /** For tests. */
  __registrations: readonly Registration[];
};

const CopilotRouteCtx = React.createContext<Ctx | null>(null);

let __tokenCounter = 0;
function makeToken(): symbol {
  __tokenCounter += 1;
  return Symbol(`copilot-entity-${__tokenCounter}`);
}

export function CopilotContextProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = React.useState<string>(() =>
    typeof window !== "undefined" ? window.location.pathname : "/app",
  );
  const [registrations, setRegistrations] = React.useState<readonly Registration[]>([]);
  const [open, setOpen] = React.useState(false);

  const registerCopilotEntity = React.useCallback(
    (input: ContextRegistrationInput) => {
      const token = makeToken();
      const reg: Registration = { ...input, token };
      setRegistrations((prev) => [...prev, reg]);
      return () => {
        setRegistrations((prev) => prev.filter((r) => r.token !== token));
      };
    },
    [],
  );

  const toggle = React.useCallback(() => setOpen((v) => !v), []);

  // Route change — drop registrations whose declared moduleKey/route is
  // incompatible with the new route.
  const { moduleKey: currentModuleKey } = moduleFromRoute(route);
  React.useEffect(() => {
    setRegistrations((prev) => {
      const next = prev.filter((r) => {
        if (r.moduleKey && r.moduleKey !== currentModuleKey) return false;
        if (r.route && !route.startsWith(r.route)) return false;
        return true;
      });
      return next.length === prev.length ? prev : next;
    });
  }, [currentModuleKey, route]);

  const routeContext = React.useMemo<CopilotRouteContext>(() => {
    const { moduleKey, moduleLabel } = moduleFromRoute(route);
    const top = registrations.length > 0 ? registrations[registrations.length - 1] : undefined;
    return {
      route,
      moduleKey,
      moduleLabel,
      entityType: top?.entityType,
      entityId: top?.entityId,
      entityLabel: top?.entityLabel,
      metadata: top?.metadata,
    };
  }, [route, registrations]);

  const value = React.useMemo<Ctx>(
    () => ({
      routeContext,
      setRoute,
      registerCopilotEntity,
      open,
      setOpen,
      toggle,
      __registrations: registrations,
    }),
    [routeContext, registerCopilotEntity, open, toggle, registrations],
  );

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

/**
 * Registra a entidade aberta usando somente campos primitivos.
 * Assinatura estável — não depende da identidade do objeto `input`.
 */
export function useRegisterCopilotEntity(input: {
  entityType: string;
  entityId: string | null | undefined;
  entityLabel?: string;
  route?: string;
  moduleKey?: string;
  metadata?: Readonly<Record<string, unknown>>;
} | null | undefined): void {
  const ctx = React.useContext(CopilotRouteCtx);
  const register = ctx?.registerCopilotEntity;

  // Assinatura determinística baseada em primitivos.
  const active = !!(input && input.entityId && input.entityType);
  const signature = active
    ? [
        input!.entityType,
        input!.entityId,
        input!.entityLabel ?? "",
        input!.route ?? "",
        input!.moduleKey ?? "",
        stableMetaKey(input!.metadata),
      ].join("|")
    : "";

  React.useEffect(() => {
    if (!register || !active) return;
    const un = register({
      entityType: input!.entityType,
      entityId: input!.entityId!,
      entityLabel: input!.entityLabel,
      route: input!.route,
      moduleKey: input!.moduleKey,
      metadata: input!.metadata,
    });
    return un;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, register]);
}

function stableMetaKey(meta: Readonly<Record<string, unknown>> | undefined): string {
  if (!meta) return "";
  const keys = Object.keys(meta).sort();
  return keys.map((k) => `${k}=${String(meta[k])}`).join(",");
}
