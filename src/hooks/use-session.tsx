import * as React from "react";
import {
  PERFIS,
  WORK_MODES,
  PRIMARY_USES,
  START_PAGES,
  ROLES,
  isPerfil,
  isWorkMode,
  isPrimaryUse,
  isStartPage,
  isRole,
  type Perfil,
  type WorkMode,
  type PrimaryUse,
  type StartPage,
  type Role,
  type OnboardingResult,
} from "@/domain/onboarding";
import { isValidContextId } from "@/services/context-service";

/**
 * Sessão simulada — SEM backend, SEM autenticação real.
 * Etapa 5: acrescenta enums de onboarding e ID de contexto fictício.
 * Todos os campos adicionais são opcionais e enumerados (nada de texto livre).
 */

export type SessionMode = "guest" | "authenticated";

export type SimulatedSession = {
  version: 1;
  mode: SessionMode;
  name: string;
  perfil?: Perfil;
  remember: boolean;
  simulated: true;
  onboardingDone?: boolean;
  workMode?: WorkMode;
  primaryUse?: PrimaryUse;
  currentContextId?: string;
  startPage?: StartPage;
  role?: Role;
};

export type SessionStatus = "restoring" | "signed_in" | "signed_out";

type SignInPayload = {
  name?: string;
  perfil?: Perfil | string;
  remember: boolean;
};

type SessionCtx = {
  status: SessionStatus;
  session: SimulatedSession | null;
  signInAsUser: (data: SignInPayload) => void;
  signInAsGuest: () => void;
  signOut: () => void;
  completeOnboarding: (result: OnboardingResult) => void;
  setCurrentContext: (contextId: string) => void;
};

const SessionContext = React.createContext<SessionCtx | null>(null);

const STORAGE_KEY = "nexo:session";
const NEUTRAL_NAME = "Usuário de demonstração";

const PERFIS_SET = new Set<string>(PERFIS);
const WORK_MODES_SET = new Set<string>(WORK_MODES);
const PRIMARY_USES_SET = new Set<string>(PRIMARY_USES);
const START_PAGES_SET = new Set<string>(START_PAGES);
const ROLES_SET = new Set<string>(ROLES);

/** Credenciais de demonstração (apenas visuais). */
export const DEMO_CREDENTIALS = {
  email: "demo@nexo.local",
  password: "Nexo123!",
} as const;

export const DEMO_VERIFICATION_CODE = "123456";

/**
 * Valida uma sessão restaurada. Rejeita PII residual e valores fora dos enums.
 */
function isValidSession(value: unknown): value is SimulatedSession {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.version !== 1) return false;
  if (v.mode !== "guest" && v.mode !== "authenticated") return false;
  if (typeof v.name !== "string" || !v.name.trim()) return false;
  if (typeof v.remember !== "boolean") return false;
  if (v.simulated !== true) return false;

  if (v.perfil !== undefined && !(typeof v.perfil === "string" && PERFIS_SET.has(v.perfil))) return false;
  if (v.onboardingDone !== undefined && typeof v.onboardingDone !== "boolean") return false;
  if (v.workMode !== undefined && !(typeof v.workMode === "string" && WORK_MODES_SET.has(v.workMode))) return false;
  if (v.primaryUse !== undefined && !(typeof v.primaryUse === "string" && PRIMARY_USES_SET.has(v.primaryUse))) return false;
  if (v.startPage !== undefined && !(typeof v.startPage === "string" && START_PAGES_SET.has(v.startPage))) return false;
  if (v.role !== undefined && !(typeof v.role === "string" && ROLES_SET.has(v.role))) return false;
  if (v.currentContextId !== undefined && !isValidContextId(v.currentContextId)) return false;

  // Rejeita explicitamente estruturas antigas com dados sensíveis.
  if ("email" in v) return false;
  if ("password" in v || "senha" in v) return false;
  if ("code" in v || "codigo" in v) return false;
  return true;
}

function clearStored() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignora
  }
}

function readStored(): SimulatedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      clearStored();
      return null;
    }
    if (!isValidSession(parsed)) {
      clearStored();
      return null;
    }
    return parsed;
  } catch {
    clearStored();
    return null;
  }
}

function writeStored(sess: SimulatedSession) {
  if (typeof window === "undefined") return;
  try {
    const value = JSON.stringify(sess);
    if (sess.mode === "authenticated" && sess.remember) {
      window.localStorage.setItem(STORAGE_KEY, value);
      window.sessionStorage.removeItem(STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(STORAGE_KEY, value);
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignora
  }
}

// ---- Rascunho do onboarding (chave separada, sessionStorage) ----------------

const DRAFT_KEY = "nexo:onboarding-draft";

export function clearOnboardingDraft() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignora
  }
}

// ---- Return path (para onde ir após o onboarding) --------------------------

const RETURN_KEY = "nexo:onboarding-return";

export function setOnboardingReturn(path: string | undefined) {
  if (typeof window === "undefined") return;
  try {
    if (path && path.startsWith("/app") && !path.startsWith("//") && !path.includes(":") && !path.includes("\\")) {
      window.sessionStorage.setItem(RETURN_KEY, path);
    } else {
      window.sessionStorage.removeItem(RETURN_KEY);
    }
  } catch {
    // ignora
  }
}

export function takeOnboardingReturn(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const v = window.sessionStorage.getItem(RETURN_KEY);
    window.sessionStorage.removeItem(RETURN_KEY);
    if (v && v.startsWith("/app") && !v.startsWith("//") && !v.includes(":") && !v.includes("\\")) {
      return v;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

// ---- Provider --------------------------------------------------------------

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<SessionStatus>("restoring");
  const [session, setSession] = React.useState<SimulatedSession | null>(null);

  React.useEffect(() => {
    const restored = readStored();
    if (restored) {
      setSession(restored);
      setStatus("signed_in");
    } else {
      setStatus("signed_out");
    }
  }, []);

  const signInAsUser = React.useCallback<SessionCtx["signInAsUser"]>((data) => {
    const perfil = isPerfil(data.perfil) ? data.perfil : undefined;
    const sess: SimulatedSession = {
      version: 1,
      mode: "authenticated",
      name: (data.name ?? "").trim() || NEUTRAL_NAME,
      perfil,
      remember: !!data.remember,
      simulated: true,
      // onboardingDone deliberadamente ausente → interpretado como false.
    };
    writeStored(sess);
    setSession(sess);
    setStatus("signed_in");
  }, []);

  const signInAsGuest = React.useCallback(() => {
    // Convidado já entra com contexto fictício e onboarding "concluído".
    const sess: SimulatedSession = {
      version: 1,
      mode: "guest",
      name: NEUTRAL_NAME,
      remember: false,
      simulated: true,
      onboardingDone: true,
      workMode: "individual",
      currentContextId: "demo-individual",
      role: "profissional",
      primaryUse: "fluxo-completo",
      startPage: "dashboard",
      perfil: "multi",
    };
    writeStored(sess);
    setSession(sess);
    setStatus("signed_in");
  }, []);

  const signOut = React.useCallback(() => {
    clearStored();
    clearOnboardingDraft();
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(RETURN_KEY);
      } catch {
        // ignora
      }
    }
    setSession(null);
    setStatus("signed_out");
  }, []);

  const completeOnboarding = React.useCallback<SessionCtx["completeOnboarding"]>(
    (result) => {
      setSession((prev) => {
        if (!prev) return prev;
        const perfil = isPerfil(result.perfil) ? result.perfil : prev.perfil;
        const workMode = isWorkMode(result.workMode) ? result.workMode : undefined;
        const primaryUse = isPrimaryUse(result.primaryUse) ? result.primaryUse : undefined;
        const startPage = isStartPage(result.startPage) ? result.startPage : "dashboard";
        const role = isRole(result.role) ? result.role : "profissional";
        const currentContextId = isValidContextId(result.contextId) ? result.contextId : undefined;
        if (!workMode || !primaryUse || !currentContextId) return prev;
        const next: SimulatedSession = {
          ...prev,
          perfil,
          onboardingDone: true,
          workMode,
          primaryUse,
          startPage,
          role,
          currentContextId,
        };
        writeStored(next);
        return next;
      });
      clearOnboardingDraft();
    },
    [],
  );

  const setCurrentContext = React.useCallback<SessionCtx["setCurrentContext"]>((contextId) => {
    if (!isValidContextId(contextId)) return;
    setSession((prev) => {
      if (!prev) return prev;
      const next: SimulatedSession = { ...prev, currentContextId: contextId };
      writeStored(next);
      return next;
    });
  }, []);

  const value = React.useMemo<SessionCtx>(
    () => ({
      status,
      session,
      signInAsUser,
      signInAsGuest,
      signOut,
      completeOnboarding,
      setCurrentContext,
    }),
    [status, session, signInAsUser, signInAsGuest, signOut, completeOnboarding, setCurrentContext],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = React.useContext(SessionContext);
  if (!ctx) {
    return {
      status: "signed_out" as SessionStatus,
      session: null,
      signInAsUser: () => {},
      signInAsGuest: () => {},
      signOut: () => {},
      completeOnboarding: () => {},
      setCurrentContext: () => {},
    };
  }
  return ctx;
}

/** Mapeia código do perfil para rótulo humano (compat com Etapas 1-4). */
export const PERFIL_LABEL: Record<string, string> = {
  psicologia: "Psicologia",
  "servico-social": "Serviço Social",
  multi: "Equipe multiprofissional",
  outro: "Outro perfil",
};

export function needsOnboarding(session: SimulatedSession | null): boolean {
  if (!session) return false;
  if (session.mode === "guest") return false;
  return !session.onboardingDone;
}

export function safeRedirectTarget(from: unknown): string {
  if (typeof from !== "string") return "/app";
  const value = from.trim();
  if (!value) return "/app";
  if (!value.startsWith("/app")) return "/app";
  if (value.startsWith("//")) return "/app";
  if (value.includes(":")) return "/app";
  if (value.includes("\\")) return "/app";
  const nextChar = value.charAt(4);
  if (nextChar !== "" && nextChar !== "/" && nextChar !== "?" && nextChar !== "#") {
    return "/app";
  }
  return value;
}
