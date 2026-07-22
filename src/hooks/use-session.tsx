import * as React from "react";

/**
 * Sessão simulada — SEM backend, SEM autenticação real.
 *
 * Guarda apenas metadados não sensíveis. Nunca armazena senha,
 * confirmação, código de verificação, e-mail original digitado
 * ou qualquer campo sensível.
 *
 * remember=false  → sessionStorage (some ao fechar a aba)
 * remember=true   → localStorage   (persistente até "Sair")
 * modo convidado  → sempre sessionStorage
 */

export type SessionMode = "guest" | "authenticated";

export type SimulatedSession = {
  mode: SessionMode;
  name: string;
  email?: string;
  perfil?: string;
  remember: boolean;
};

export type SessionStatus = "restoring" | "signed_in" | "signed_out";

type SessionCtx = {
  status: SessionStatus;
  session: SimulatedSession | null;
  signInAsUser: (data: {
    name?: string;
    email: string;
    perfil?: string;
    remember: boolean;
  }) => void;
  signInAsGuest: () => void;
  signOut: () => void;
};

const SessionContext = React.createContext<SessionCtx | null>(null);

const STORAGE_KEY = "nexo:session";

/** Credenciais de demonstração (apenas visuais). */
export const DEMO_CREDENTIALS = {
  email: "demo@nexo.local",
  password: "Nexo123!",
} as const;

/** Código de verificação simulado. */
export const DEMO_VERIFICATION_CODE = "123456";

function readStored(): SimulatedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SimulatedSession;
    if (parsed && (parsed.mode === "guest" || parsed.mode === "authenticated")) {
      return parsed;
    }
    return null;
  } catch {
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

function clearStored() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignora
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
    const sess: SimulatedSession = {
      mode: "authenticated",
      name: (data.name ?? "").trim() || "Usuário de demonstração",
      email: data.email,
      perfil: data.perfil,
      remember: data.remember,
    };
    writeStored(sess);
    setSession(sess);
    setStatus("signed_in");
  }, []);

  const signInAsGuest = React.useCallback(() => {
    const sess: SimulatedSession = {
      mode: "guest",
      name: "Usuário de demonstração",
      remember: false,
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
