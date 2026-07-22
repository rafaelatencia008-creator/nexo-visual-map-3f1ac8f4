import * as React from "react";
import {
  isPerfil,
  isPrimaryUse,
  isStartPage,
  isTheme,
  isWorkMode,
  type OnboardingDraft,
} from "@/domain/onboarding";
import { isValidContextId } from "@/services/context-service";

/**
 * Hook de rascunho do onboarding.
 * Armazena somente enums/IDs fictícios em `sessionStorage` sob a chave
 * `nexo:onboarding-draft`. Rejeita valores inválidos.
 */

const KEY = "nexo:onboarding-draft";

function isValidDraft(v: unknown): v is OnboardingDraft {
  if (!v || typeof v !== "object") return false;
  const d = v as Record<string, unknown>;
  if (d.version !== 1) return false;
  if (d.perfil !== undefined && !isPerfil(d.perfil)) return false;
  if (d.workMode !== undefined && !isWorkMode(d.workMode)) return false;
  if (d.contextId !== undefined && !isValidContextId(d.contextId)) return false;
  if (d.primaryUse !== undefined && !isPrimaryUse(d.primaryUse)) return false;
  if (d.startPage !== undefined && !isStartPage(d.startPage)) return false;
  if (d.theme !== undefined && !isTheme(d.theme)) return false;
  return true;
}

function readDraft(): OnboardingDraft {
  if (typeof window === "undefined") return { version: 1 };
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return { version: 1 };
    const parsed = JSON.parse(raw);
    if (!isValidDraft(parsed)) {
      window.sessionStorage.removeItem(KEY);
      return { version: 1 };
    }
    return parsed;
  } catch {
    try {
      window.sessionStorage.removeItem(KEY);
    } catch {
      // ignora
    }
    return { version: 1 };
  }
}

function writeDraft(d: OnboardingDraft) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    // ignora
  }
}

export function resetOnboardingDraft() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // ignora
  }
}

export function useOnboardingDraft() {
  const [draft, setDraft] = React.useState<OnboardingDraft>({ version: 1 });
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setDraft(readDraft());
    setReady(true);
  }, []);

  const update = React.useCallback((patch: Partial<OnboardingDraft>) => {
    setDraft((prev) => {
      const next: OnboardingDraft = { ...prev, ...patch, version: 1 };
      writeDraft(next);
      return next;
    });
  }, []);

  const reset = React.useCallback(() => {
    resetOnboardingDraft();
    setDraft({ version: 1 });
  }, []);

  return { draft, update, reset, ready };
}
