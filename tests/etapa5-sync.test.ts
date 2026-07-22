/**
 * Testes — correção pontual Etapa 5: retorno síncrono e atualização segura.
 *
 * Cobrem o núcleo imperativo (`completeOnboardingCore` / `setCurrentContextCore`)
 * usando dependências injetadas — sem React, sem navegador.
 */

import { describe, it, expect } from "bun:test";
import {
  completeOnboardingCore,
  setCurrentContextCore,
  NEUTRAL_NAME,
  validateSession,
  type SessionCore,
  type SimulatedSession,
} from "@/hooks/use-session";
import type { OnboardingResult } from "@/domain/onboarding";

const baseSession: SimulatedSession = {
  version: 1,
  mode: "authenticated",
  name: NEUTRAL_NAME,
  remember: false,
  simulated: true,
  onboardingDone: true,
  perfil: "psicologia",
  workMode: "individual",
  currentContextId: "demo-individual",
  role: "proprietario",
  primaryUse: "fluxo-completo",
  startPage: "dashboard",
};

const inProgress: SimulatedSession = {
  version: 1,
  mode: "authenticated",
  name: NEUTRAL_NAME,
  remember: false,
  simulated: true,
  onboardingDone: false,
};

function makeFakeCore(initial: SimulatedSession | null) {
  let current = initial;
  const commits: SimulatedSession[] = [];
  let draftCleared = 0;
  const core: SessionCore = {
    getCurrentSession: () => current,
    commitSession: (next) => {
      // Simula validação idêntica à do provider real.
      const ok = validateSession(next);
      if (!ok) return false;
      current = ok;
      commits.push(ok);
      return true;
    },
    clearDraft: () => {
      draftCleared += 1;
    },
  };
  return {
    core,
    getCurrent: () => current,
    getCommits: () => commits,
    getDraftCleared: () => draftCleared,
  };
}

const goodResult: OnboardingResult = {
  perfil: "psicologia",
  workMode: "institucional",
  contextId: "demo-institucional",
  role: "leitura",
  primaryUse: "fluxo-completo",
  startPage: "processos",
  theme: "keep",
};

describe("completeOnboardingCore — retorno síncrono", () => {
  it("1) conclusão válida retorna true", () => {
    const h = makeFakeCore(inProgress);
    expect(completeOnboardingCore(h.core, goodResult)).toBe(true);
  });

  it("2) conclusão inválida retorna false", () => {
    const h = makeFakeCore(inProgress);
    const bad: OnboardingResult = { ...goodResult, workMode: "individual" };
    expect(completeOnboardingCore(h.core, bad)).toBe(false);
  });

  it("3) sucesso já disponibiliza a nova sessão no mesmo fluxo síncrono", () => {
    const h = makeFakeCore(inProgress);
    completeOnboardingCore(h.core, goodResult);
    expect(h.getCurrent()!.onboardingDone).toBe(true);
    expect(h.getCurrent()!.currentContextId).toBe("demo-institucional");
    expect(h.getCurrent()!.workMode).toBe("institucional");
    expect(h.getCurrent()!.role).toBe("administrador");
  });

  it("4) falha NÃO limpa o rascunho", () => {
    const h = makeFakeCore(inProgress);
    completeOnboardingCore(h.core, { ...goodResult, contextId: "nao-existe" });
    expect(h.getDraftCleared()).toBe(0);
  });

  it("5) sucesso limpa o rascunho", () => {
    const h = makeFakeCore(inProgress);
    completeOnboardingCore(h.core, goodResult);
    expect(h.getDraftCleared()).toBe(1);
  });

  it("sem sessão prévia retorna false", () => {
    const h = makeFakeCore(null);
    expect(completeOnboardingCore(h.core, goodResult)).toBe(false);
    expect(h.getCommits().length).toBe(0);
  });
});

describe("setCurrentContextCore — retorno síncrono", () => {
  it("6) contexto válido retorna true", () => {
    const h = makeFakeCore(baseSession);
    expect(setCurrentContextCore(h.core, "demo-institucional")).toBe(true);
  });

  it("7) contexto inválido retorna false", () => {
    const h = makeFakeCore(baseSession);
    expect(setCurrentContextCore(h.core, "nao-existe")).toBe(false);
    expect(setCurrentContextCore(h.core, "")).toBe(false);
    expect(setCurrentContextCore(h.core, undefined)).toBe(false);
  });

  it("8) falha não escreve no armazenamento", () => {
    const h = makeFakeCore(baseSession);
    setCurrentContextCore(h.core, "nao-existe");
    expect(h.getCommits().length).toBe(0);
    expect(h.getCurrent()).toEqual(baseSession);
  });

  it("9) sucesso atualiza ID, modo e papel", () => {
    const h = makeFakeCore(baseSession);
    setCurrentContextCore(h.core, "demo-institucional");
    const cur = h.getCurrent()!;
    expect(cur.currentContextId).toBe("demo-institucional");
    expect(cur.workMode).toBe("institucional");
    expect(cur.role).toBe("administrador");
  });

  it("10) duas trocas consecutivas usam a sessão mais recente", () => {
    const h = makeFakeCore(baseSession);
    expect(setCurrentContextCore(h.core, "demo-equipe")).toBe(true);
    expect(h.getCurrent()!.workMode).toBe("equipe");
    expect(setCurrentContextCore(h.core, "demo-institucional")).toBe(true);
    expect(h.getCurrent()!.workMode).toBe("institucional");
    expect(h.getCurrent()!.role).toBe("administrador");
    expect(h.getCommits().length).toBe(2);
  });

  it("sem sessão prévia retorna false", () => {
    const h = makeFakeCore(null);
    expect(setCurrentContextCore(h.core, "demo-equipe")).toBe(false);
  });
});

describe("commitSession — rejeita sessões inválidas", () => {
  it("commitSession rejeita e não altera estado quando validação falha", () => {
    const h = makeFakeCore(baseSession);
    // Injeta um "next" inválido diretamente (nome não neutro).
    const invalid = { ...baseSession, name: "Fulano" } as SimulatedSession;
    const ok = h.core.commitSession(invalid);
    expect(ok).toBe(false);
    expect(h.getCurrent()).toEqual(baseSession);
  });
});
