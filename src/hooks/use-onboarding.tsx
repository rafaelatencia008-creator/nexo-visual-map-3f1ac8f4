import * as React from "react";
import {
  isPerfil,
  isPrimaryUse,
  isStartPage,
  isTheme,
  isWorkMode,
  type OnboardingDraft,
} from "@/domain/onboarding";
import { isValidContextId, isContextCompatible, getContextById } from "@/services/context-service";

/**
 * Rascunho do onboarding — `sessionStorage`, chave `nexo:onboarding-draft`.
 * Só enums/IDs fictícios. Validação estrita por allow-list.
 */

const KEY = "nexo:onboarding-draft";

export const DRAFT_ALLOWED_KEYS = new Set<string>([
  "version",
  "perfil",
  "workMode",
  "contextId",
  "primaryUse",
  "startPage",
  "theme",
]);

/**
 * Validador puro do rascunho. Retorna o rascunho normalizado, ou `null`
 * quando existir qualquer campo desconhecido, enum inválido, ID de contexto
 * inexistente, ou combinação workMode × contexto incompatível.
 */
export function validateDraft(value: unknown): OnboardingDraft | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const d = value as Record<string, unknown>;

  for (const key of Object.keys(d)) {
    if (!DRAFT_ALLOWED_KEYS.has(key)) return null;
  }

  if (d.version !== 1) return null;

  if (d.perfil !== undefined && !isPerfil(d.perfil)) return null;
  if (d.workMode !== undefined && !isWorkMode(d.workMode)) return null;
  if (d.contextId !== undefined && !isValidContextId(d.contextId)) return null;
  if (d.primaryUse !== undefined && !isPrimaryUse(d.primaryUse)) return null;
  if (d.startPage !== undefined && !isStartPage(d.startPage)) return null;
  if (d.theme !== undefined && !isTheme(d.theme)) return null;

  if (d.contextId !== undefined) {
    const ctx = getContextById(d.contextId as string);
    if (!ctx) return null;
    if (d.workMode !== undefined && ctx.tipo !== d.workMode) return null;
  }

  const clean: OnboardingDraft = { version: 1 };
  if (d.perfil !== undefined) clean.perfil = d.perfil as OnboardingDraft["perfil"];
  if (d.workMode !== undefined) clean.workMode = d.workMode as OnboardingDraft["workMode"];
  if (d.contextId !== undefined) clean.contextId = d.contextId as string;
  if (d.primaryUse !== undefined) clean.primaryUse = d.primaryUse as OnboardingDraft["primaryUse"];
  if (d.startPage !== undefined) clean.startPage = d.startPage as OnboardingDraft["startPage"];
  if (d.theme !== undefined) clean.theme = d.theme as OnboardingDraft["theme"];
  return clean;
}

function readDraft(): OnboardingDraft {
  if (typeof window === "undefined") return { version: 1 };
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return { version: 1 };
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      window.sessionStorage.removeItem(KEY);
      return { version: 1 };
    }
    const ok = validateDraft(parsed);
    if (!ok) {
      window.sessionStorage.removeItem(KEY);
      return { version: 1 };
    }
    return ok;
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

/**
 * Aplica um patch preservando consistência:
 * - Se `workMode` muda para algo incompatível com o `contextId` atual,
 *   descarta o `contextId`.
 * - Se `contextId` é definido e é incompatível com o `workMode` atual,
 *   o patch daquele campo é rejeitado (silenciosamente).
 * - Se o resultado final não passa em `validateDraft`, mantém o anterior.
 */
export function applyDraftPatch(
  prev: OnboardingDraft,
  patch: Partial<OnboardingDraft>,
): OnboardingDraft {
  const merged: OnboardingDraft = { ...prev, ...patch, version: 1 };

  // Se o patch traz contextId incompatível com o workMode vigente → ignora contextId.
  if (patch.contextId !== undefined) {
    const wm = merged.workMode;
    if (!isValidContextId(patch.contextId) || (wm && !isContextCompatible(patch.contextId, wm))) {
      merged.contextId = prev.contextId;
    }
  }

  // Se o patch muda o workMode e o contextId antigo não é compatível → dropa contextId.
  if (patch.workMode !== undefined && merged.contextId) {
    if (!isContextCompatible(merged.contextId, merged.workMode)) {
      delete merged.contextId;
    }
  }

  const clean = validateDraft(merged);
  return clean ?? prev;
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
      const next = applyDraftPatch(prev, patch);
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
