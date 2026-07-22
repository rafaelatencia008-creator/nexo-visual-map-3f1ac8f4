import * as React from "react";
import {
  PERFIS,
  WORK_MODES,
  PRIMARY_USES,
  START_PAGES,
  ROLES,
  isPerfil,
  isPrimaryUse,
  isStartPage,
  type Perfil,
  type WorkMode,
  type PrimaryUse,
  type StartPage,
  type Role,
  type OnboardingResult,
} from "@/domain/onboarding";
import {
  isValidContextId,
  getContextById,
  isContextCompatible,
} from "@/services/context-service";
import { clearAuthTransient } from "@/lib/auth-transient";

/**
 * Sessão simulada — SEM backend, SEM autenticação real.
 * Etapa 5 (correção): validação estrita por allow-list, name fixo,
 * setCurrentContext/completeOnboarding atômicos com retorno booleano.
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
  completeOnboarding: (result: OnboardingResult) => boolean;
  setCurrentContext: (contextId: string) => boolean;
};

const SessionContext = React.createContext<SessionCtx | null>(null);

const STORAGE_KEY = "nexo:session";
export const NEUTRAL_NAME = "Usuário de demonstração";

const PERFIS_SET = new Set<string>(PERFIS);
const WORK_MODES_SET = new Set<string>(WORK_MODES);
const PRIMARY_USES_SET = new Set<string>(PRIMARY_USES);
const START_PAGES_SET = new Set<string>(START_PAGES);
const ROLES_SET = new Set<string>(ROLES);

/** Chaves aceitas na sessão persistida — qualquer outra invalida tudo. */
export const SESSION_ALLOWED_KEYS = new Set<string>([
  "version",
  "mode",
  "name",
  "perfil",
  "remember",
  "simulated",
  "onboardingDone",
  "workMode",
  "primaryUse",
  "currentContextId",
  "startPage",
  "role",
]);

/** Credenciais de demonstração (apenas visuais). */
export const DEMO_CREDENTIALS = {
  email: "demo@nexo.local",
  password: "Nexo123!",
} as const;

export const DEMO_VERIFICATION_CODE = "123456";

/**
 * Valida uma sessão restaurada com allow-list. Rejeita:
 * - JSON não-objeto
 * - version != 1
 * - nome diferente de NEUTRAL_NAME
 * - qualquer chave fora de SESSION_ALLOWED_KEYS (email, cpf, token, etc.)
 * - enums fora do domínio
 * - contexto inexistente
 * - combinação workMode × contexto incompatível
 * Retorna a sessão validada (pura, sem I/O) ou `null`.
 */
export function validateSession(value: unknown): SimulatedSession | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;

  // Allow-list de chaves — rejeita qualquer propriedade desconhecida.
  for (const key of Object.keys(v)) {
    if (!SESSION_ALLOWED_KEYS.has(key)) return null;
  }

  if (v.version !== 1) return null;
  if (v.mode !== "guest" && v.mode !== "authenticated") return null;
  if (v.name !== NEUTRAL_NAME) return null;
  if (typeof v.remember !== "boolean") return null;
  if (v.simulated !== true) return null;

  if (v.perfil !== undefined && !(typeof v.perfil === "string" && PERFIS_SET.has(v.perfil))) return null;
  if (v.onboardingDone !== undefined && typeof v.onboardingDone !== "boolean") return null;
  if (v.workMode !== undefined && !(typeof v.workMode === "string" && WORK_MODES_SET.has(v.workMode))) return null;
  if (v.primaryUse !== undefined && !(typeof v.primaryUse === "string" && PRIMARY_USES_SET.has(v.primaryUse))) return null;
  if (v.startPage !== undefined && !(typeof v.startPage === "string" && START_PAGES_SET.has(v.startPage))) return null;
  if (v.role !== undefined && !(typeof v.role === "string" && ROLES_SET.has(v.role))) return null;
  if (v.currentContextId !== undefined && !isValidContextId(v.currentContextId)) return null;

  // Relação contexto × workMode × role deve ser consistente com o mock.
  if (v.currentContextId !== undefined) {
    const ctx = getContextById(v.currentContextId as string);
    if (!ctx) return null;
    if (v.workMode !== undefined && ctx.tipo !== v.workMode) return null;
    if (v.role !== undefined && ctx.role !== v.role) return null;
  }

  return {
    version: 1,
    mode: v.mode,
    name: v.name,
    remember: v.remember,
    simulated: true,
    perfil: v.perfil as Perfil | undefined,
    onboardingDone: v.onboardingDone as boolean | undefined,
    workMode: v.workMode as WorkMode | undefined,
    primaryUse: v.primaryUse as PrimaryUse | undefined,
    startPage: v.startPage as StartPage | undefined,
    role: v.role as Role | undefined,
    currentContextId: v.currentContextId as string | undefined,
  };
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
    const ok = validateSession(parsed);
    if (!ok) {
      clearStored();
      return null;
    }
    return ok;
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

// ---- Resolvedores puros (testáveis) ---------------------------------------

/**
 * Recalcula a sessão para um novo `contextId`. Retorna a sessão atualizada
 * ou `null` quando o contexto não existe/for inválido. Sempre deriva
 * `workMode` e `role` do contexto mockado — nunca aceita esses campos vindos
 * de fora.
 */
export function resolveContextUpdate(
  prev: SimulatedSession,
  contextId: unknown,
): SimulatedSession | null {
  if (!isValidContextId(contextId)) return null;
  const ctx = getContextById(contextId);
  if (!ctx) return null;
  return {
    ...prev,
    currentContextId: ctx.id,
    workMode: ctx.tipo,
    role: ctx.role,
  };
}

/**
 * Resolve a conclusão do onboarding. Deriva `workMode` e `role` do contexto
 * mockado. Retorna `null` quando qualquer requisito estiver ausente ou
 * inconsistente — nesse caso o chamador NÃO deve limpar o rascunho.
 */
export function resolveCompletion(
  prev: SimulatedSession,
  result: OnboardingResult,
): SimulatedSession | null {
  if (!isPerfil(result.perfil)) return null;
  if (!isPrimaryUse(result.primaryUse)) return null;
  if (!isStartPage(result.startPage)) return null;
  if (!isValidContextId(result.contextId)) return null;
  const ctx = getContextById(result.contextId);
  if (!ctx) return null;
  // workMode declarado deve ser compatível com o contexto.
  if (!isContextCompatible(ctx.id, result.workMode)) return null;
  return {
    ...prev,
    perfil: result.perfil,
    onboardingDone: true,
    workMode: ctx.tipo,
    primaryUse: result.primaryUse,
    startPage: result.startPage,
    role: ctx.role,
    currentContextId: ctx.id,
  };
}

// ---- Núcleo imperativo (testável sem React) --------------------------------

/**
 * Dependências injetadas — permitem testar o comportamento síncrono
 * sem servidor Vite, sem navegador e sem React.
 */
export type SessionCore = {
  getCurrentSession: () => SimulatedSession | null;
  commitSession: (next: SimulatedSession) => boolean;
  clearDraft: () => void;
};

/**
 * Conclui o onboarding de forma síncrona. Retorna `true` somente após
 * a sessão nova ter sido efetivamente confirmada; falha (retornando `false`)
 * NÃO limpa o rascunho e NÃO altera armazenamento nem estado.
 */
export function completeOnboardingCore(
  core: SessionCore,
  result: OnboardingResult,
): boolean {
  const previous = core.getCurrentSession();
  if (!previous) return false;
  const next = resolveCompletion(previous, result);
  if (!next) return false;
  if (!core.commitSession(next)) return false;
  core.clearDraft();
  return true;
}

/**
 * Troca o contexto atual de forma síncrona. Retorna `true` somente após
 * a nova sessão ter sido confirmada.
 */
export function setCurrentContextCore(
  core: SessionCore,
  contextId: unknown,
): boolean {
  const previous = core.getCurrentSession();
  if (!previous) return false;
  const next = resolveContextUpdate(previous, contextId);
  if (!next) return false;
  return core.commitSession(next);
}

// ---- Provider --------------------------------------------------------------

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<SessionStatus>("restoring");
  const [session, setSession] = React.useState<SimulatedSession | null>(null);
  const sessionRef = React.useRef<SimulatedSession | null>(null);

  /**
   * Confirma uma nova sessão: valida, grava, sincroniza a referência
   * e finalmente atualiza o estado React. Retorna `false` quando a
   * própria sessão produzida internamente for inválida — nesse caso
   * nada é alterado.
   */
  const commitSession = React.useCallback((next: SimulatedSession): boolean => {
    const validated = validateSession(next);
    if (!validated) return false;
    writeStored(validated);
    sessionRef.current = validated;
    setSession(validated);
    setStatus("signed_in");
    return true;
  }, []);

  const clearSession = React.useCallback(() => {
    clearStored();
    clearOnboardingDraft();
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(RETURN_KEY);
      } catch {
        // ignora
      }
    }
    clearAuthTransient();
    sessionRef.current = null;
    setSession(null);
    setStatus("signed_out");
  }, []);

  React.useEffect(() => {
    const restored = readStored();
    if (restored) {
      sessionRef.current = restored;
      setSession(restored);
      setStatus("signed_in");
    } else {
      sessionRef.current = null;
      setStatus("signed_out");
    }
  }, []);

  const signInAsUser = React.useCallback<SessionCtx["signInAsUser"]>(
    (data) => {
      const perfil = isPerfil(data.perfil) ? data.perfil : undefined;
      const sess: SimulatedSession = {
        version: 1,
        mode: "authenticated",
        name: NEUTRAL_NAME,
        perfil,
        remember: !!data.remember,
        simulated: true,
      };
      commitSession(sess);
    },
    [commitSession],
  );

  const signInAsGuest = React.useCallback(() => {
    const sess: SimulatedSession = {
      version: 1,
      mode: "guest",
      name: NEUTRAL_NAME,
      remember: false,
      simulated: true,
      onboardingDone: true,
      workMode: "individual",
      currentContextId: "demo-individual",
      role: "proprietario",
      primaryUse: "fluxo-completo",
      startPage: "dashboard",
      perfil: "multi",
    };
    commitSession(sess);
  }, [commitSession]);

  const signOut = React.useCallback(() => {
    clearSession();
  }, [clearSession]);

  const completeOnboarding = React.useCallback<SessionCtx["completeOnboarding"]>(
    (result) =>
      completeOnboardingCore(
        {
          getCurrentSession: () => sessionRef.current,
          commitSession,
          clearDraft: clearOnboardingDraft,
        },
        result,
      ),
    [commitSession],
  );

  const setCurrentContext = React.useCallback<SessionCtx["setCurrentContext"]>(
    (contextId) =>
      setCurrentContextCore(
        {
          getCurrentSession: () => sessionRef.current,
          commitSession,
          clearDraft: clearOnboardingDraft,
        },
        contextId,
      ),
    [commitSession],
  );

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
      completeOnboarding: () => false,
      setCurrentContext: () => false,
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
