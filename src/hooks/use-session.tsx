import * as React from "react";

/**
 * Sessão simulada — SEM backend, SEM autenticação real.
 *
 * Regra de privacidade (Etapa 4.1):
 *  - NÃO persiste e-mail digitado.
 *  - NÃO persiste senha, confirmação, código, aceites ou nome completo digitado.
 *  - Guarda apenas metadados neutros suficientes para a demonstração.
 *
 * remember=false  → sessionStorage (some ao fechar a aba)
 * remember=true   → localStorage   (persistente até "Sair")
 * modo convidado  → sempre sessionStorage
 */

export type SessionMode = "guest" | "authenticated";

/** Estrutura persistida — versionada para permitir purga de modelos antigos. */
export type SimulatedSession = {
  version: 1;
  mode: SessionMode;
  /** Nome neutro de exibição (nunca o nome completo digitado). */
  name: string;
  /** Perfil profissional (rótulo curto). */
  perfil?: string;
  /** Preferência "Manter conectado". */
  remember: boolean;
  /** Marca visual: a sessão é simulada. */
  simulated: true;
  /** Reservado para uso futuro (onboarding). NÃO implementado nesta etapa. */
  onboardingDone?: boolean;
};

export type SessionStatus = "restoring" | "signed_in" | "signed_out";

type SignInPayload = {
  /** Rótulo neutro. Se ausente, usa "Usuário de demonstração". */
  name?: string;
  perfil?: string;
  remember: boolean;
};

type SessionCtx = {
  status: SessionStatus;
  session: SimulatedSession | null;
  signInAsUser: (data: SignInPayload) => void;
  signInAsGuest: () => void;
  signOut: () => void;
};

const SessionContext = React.createContext<SessionCtx | null>(null);

const STORAGE_KEY = "nexo:session";
const NEUTRAL_NAME = "Usuário de demonstração";
const PERFIS_VALIDOS = new Set(["psicologia", "servico-social", "multi", "outro"]);

/** Credenciais de demonstração (apenas visuais). */
export const DEMO_CREDENTIALS = {
  email: "demo@nexo.local",
  password: "Nexo123!",
} as const;

/** Código de verificação simulado. */
export const DEMO_VERIFICATION_CODE = "123456";

/**
 * Valida estritamente uma sessão restaurada.
 * Rejeita qualquer estrutura antiga que contenha e-mail ou campos não previstos.
 */
function isValidSession(value: unknown): value is SimulatedSession {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.version !== 1) return false;
  if (v.mode !== "guest" && v.mode !== "authenticated") return false;
  if (typeof v.name !== "string" || !v.name.trim()) return false;
  if (typeof v.remember !== "boolean") return false;
  if (v.simulated !== true) return false;
  if (v.perfil !== undefined && typeof v.perfil !== "string") return false;
  if (v.perfil !== undefined && !PERFIS_VALIDOS.has(v.perfil as string)) return false;
  if (v.onboardingDone !== undefined && typeof v.onboardingDone !== "boolean") return false;
  // Rejeita explicitamente estruturas antigas que carregam dados sensíveis.
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
      // Sessão antiga (ex.: contém email) ou JSON inválido — purga.
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
    // ignora se storage indisponível
  }
}

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
    const perfil =
      data.perfil && PERFIS_VALIDOS.has(data.perfil) ? data.perfil : undefined;
    const sess: SimulatedSession = {
      version: 1,
      mode: "authenticated",
      name: (data.name ?? "").trim() || NEUTRAL_NAME,
      perfil,
      remember: !!data.remember,
      simulated: true,
    };
    writeStored(sess);
    setSession(sess);
    setStatus("signed_in");
  }, []);

  const signInAsGuest = React.useCallback(() => {
    const sess: SimulatedSession = {
      version: 1,
      mode: "guest",
      name: NEUTRAL_NAME,
      remember: false,
      simulated: true,
    };
    writeStored(sess);
    setSession(sess);
    setStatus("signed_in");
  }, []);

  const signOut = React.useCallback(() => {
    clearStored();
    setSession(null);
    setStatus("signed_out");
  }, []);

  const value = React.useMemo<SessionCtx>(
    () => ({ status, session, signInAsUser, signInAsGuest, signOut }),
    [status, session, signInAsUser, signInAsGuest, signOut],
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
    };
  }
  return ctx;
}

/** Mapeia código do perfil para rótulo humano. */
export const PERFIL_LABEL: Record<string, string> = {
  psicologia: "Psicologia",
  "servico-social": "Serviço Social",
  multi: "Equipe multiprofissional",
  outro: "Outro perfil",
};

/**
 * Valida um alvo de redirecionamento recebido por query string.
 * Aceita SOMENTE caminhos internos que comecem com "/app".
 * Rejeita: URL absoluta, protocolo, "//host", "javascript:", etc.
 */
export function safeRedirectTarget(from: unknown): string {
  if (typeof from !== "string") return "/app";
  const value = from.trim();
  if (!value) return "/app";
  // path-only e começa com /app (mas não //app)
  if (!value.startsWith("/app")) return "/app";
  if (value.startsWith("//")) return "/app";
  if (value.includes(":")) return "/app"; // bloqueia javascript:, data:, http:, etc.
  if (value.includes("\\")) return "/app";
  // Aceita "/app", "/app/...", "/app?..." e "/app#..."
  const nextChar = value.charAt(4);
  if (nextChar !== "" && nextChar !== "/" && nextChar !== "?" && nextChar !== "#") {
    return "/app";
  }
  return value;
}
