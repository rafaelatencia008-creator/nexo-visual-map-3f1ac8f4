/**
 * LV-09.1B.6.3A.3 — Testes da política de fechamento após criação bem-sucedida
 * na surface de criação da Agenda, e verificação estrutural da rota canônica.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { shouldCloseAgendaCreateAfterSuccess } from "../src/features/agenda/create-surface-policy";

function readSrc(rel: string): string {
  return readFileSync(resolve(__dirname, "..", rel), "utf8");
}

describe("shouldCloseAgendaCreateAfterSuccess — política pura", () => {
  it("propriedade omitida => fecha após sucesso", () => {
    expect(shouldCloseAgendaCreateAfterSuccess(undefined)).toBe(true);
  });

  it("closeAfterCreate=true => fecha após sucesso", () => {
    expect(shouldCloseAgendaCreateAfterSuccess(true)).toBe(true);
  });

  it("closeAfterCreate=false => NÃO fecha após sucesso", () => {
    expect(shouldCloseAgendaCreateAfterSuccess(false)).toBe(false);
  });

  it("é pura e determinística (múltiplas chamadas)", () => {
    for (let i = 0; i < 20; i++) {
      expect(shouldCloseAgendaCreateAfterSuccess(false)).toBe(false);
      expect(shouldCloseAgendaCreateAfterSuccess(true)).toBe(true);
      expect(shouldCloseAgendaCreateAfterSuccess(undefined)).toBe(true);
    }
  });

  it("não depende de tempo, timers ou async", () => {
    const before = Date.now();
    const a = shouldCloseAgendaCreateAfterSuccess(false);
    const b = shouldCloseAgendaCreateAfterSuccess(true);
    const after = Date.now();
    expect(a).toBe(false);
    expect(b).toBe(true);
    expect(after - before).toBeLessThan(1000);
  });
});

describe("AgendaCreateDialog — integração da política", () => {
  const src = readSrc("src/features/agenda/AgendaCreateDialog.tsx");

  it("expõe closeAfterCreate?: boolean em AgendaCreateDialogProps", () => {
    expect(src).toMatch(/closeAfterCreate\?\s*:\s*boolean/);
  });

  it("usa shouldCloseAgendaCreateAfterSuccess do helper puro", () => {
    expect(src).toMatch(/shouldCloseAgendaCreateAfterSuccess/);
    expect(src).toMatch(
      /from\s+["']\.\/create-surface-policy["']/,
    );
  });

  it("gate `if (shouldCloseAfterCreate)` envolve onOpenChange(false) após sucesso", () => {
    // Deve haver pelo menos duas ocorrências (prazo e compromisso).
    const matches = src.match(/if\s*\(\s*shouldCloseAfterCreate\s*\)\s*\{\s*\n\s*onOpenChange\(false\);\s*\n\s*\}/g);
    expect(matches).not.toBeNull();
    expect((matches ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("cancelamento e descarte continuam chamando onOpenChange(false) sem gate", () => {
    // Ainda existem chamadas diretas de onOpenChange(false) fora do gate:
    // requestClose (cancelar sem rascunho) e discardDraft.
    const all = src.match(/onOpenChange\(false\);/g) ?? [];
    expect(all.length).toBeGreaterThanOrEqual(4);
  });

  it("não introduz APIs de navegação proibidas", () => {
    expect(src).not.toMatch(/window\.location/);
    expect(src).not.toMatch(/location\.assign/);
    expect(src).not.toMatch(/history\.pushState/);
    // Nenhum setTimeout foi adicionado no fluxo de sucesso.
    const successRegion = src.split("toast.success").slice(1).join("toast.success");
    expect(successRegion).not.toMatch(/setTimeout/);
  });

  it("onCreated é chamado antes do fechamento condicional (ordem preservada)", () => {
    const deadlineIdx = src.indexOf('onCreated({ type: "deadline"');
    const apptIdx = src.indexOf('onCreated({ type: "appointment"');
    expect(deadlineIdx).toBeGreaterThan(0);
    expect(apptIdx).toBeGreaterThan(0);
    // O gate aparece depois de cada onCreated correspondente.
    const afterDeadline = src.slice(deadlineIdx, deadlineIdx + 400);
    const afterAppt = src.slice(apptIdx, apptIdx + 400);
    expect(afterDeadline).toMatch(/if\s*\(\s*shouldCloseAfterCreate\s*\)/);
    expect(afterAppt).toMatch(/if\s*\(\s*shouldCloseAfterCreate\s*\)/);
  });
});

describe("Rota canônica /app/agenda/novo", () => {
  const src = readSrc("src/routes/app.agenda.novo.tsx");

  it("passa closeAfterCreate={false} para AgendaCreateDialog", () => {
    expect(src).toMatch(/closeAfterCreate=\{false\}/);
  });

  it("mantém navegação para /app/agenda/$appointmentId quando cria compromisso", () => {
    expect(src).toMatch(/to:\s*["']\/app\/agenda\/\$appointmentId["']/);
  });

  it("mantém navegação para /app/agenda ao criar prazo", () => {
    expect(src).toMatch(/setPendingCreated\(/);
    expect(src).toMatch(/to:\s*["']\/app\/agenda["']/);
  });

  it("cancelamento (handleOpenChange) navega para /app/agenda", () => {
    expect(src).toMatch(/handleOpenChange/);
  });

  it("não usa APIs de navegação proibidas", () => {
    expect(src).not.toMatch(/window\.location/);
    expect(src).not.toMatch(/location\.assign/);
    expect(src).not.toMatch(/history\.pushState/);
    expect(src).not.toMatch(/setTimeout/);
  });
});

describe("Escopo — parcela B e LV-09.1B.7 continuam ausentes", () => {
  it("AgendaCreateContent ainda não existe", () => {
    expect(existsSync(resolve(__dirname, "..", "src/features/agenda/AgendaCreateContent.tsx"))).toBe(false);
  });

  it("AgendaItemDetailContent ainda não existe", () => {
    expect(existsSync(resolve(__dirname, "..", "src/features/agenda/AgendaItemDetailContent.tsx"))).toBe(false);
  });

  it("availability.ts continua ausente (LV-09.1B.7)", () => {
    expect(existsSync(resolve(__dirname, "..", "src/features/agenda/availability.ts"))).toBe(false);
  });

  it("check-appointment-availability.ts continua ausente", () => {
    expect(existsSync(resolve(__dirname, "..", "src/features/agenda/check-appointment-availability.ts"))).toBe(false);
  });

  it("/app/disponibilidade não existe", () => {
    expect(existsSync(resolve(__dirname, "..", "src/routes/app.disponibilidade.tsx"))).toBe(false);
  });

  it("tests/agenda-091b7.test.ts não existe", () => {
    expect(existsSync(resolve(__dirname, "..", "tests/agenda-091b7.test.ts"))).toBe(false);
  });
});

describe("Resolvedor e route-params intocados nesta correção", () => {
  it("resolve-appointment-route.ts existe (não foi removido)", () => {
    expect(existsSync(resolve(__dirname, "..", "src/features/agenda/resolve-appointment-route.ts"))).toBe(true);
  });

  it("route-params.ts existe (não foi removido)", () => {
    expect(existsSync(resolve(__dirname, "..", "src/features/agenda/route-params.ts"))).toBe(true);
  });
});
