/**
 * LV-09.1B.6.3A.3 — Testes da política de fechamento após criação bem-sucedida.
 *
 * A partir da LV-09.1B.6.3B.1 a lógica funcional vive em
 * `AgendaCreateContent`. O wrapper `AgendaCreateDialog` deixou de conter
 * a política; este arquivo passa a inspecionar o Content.
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

describe("AgendaCreateContent — integração da política", () => {
  const src = readSrc("src/features/agenda/AgendaCreateContent.tsx");

  it("expõe closeAfterCreate?: boolean em AgendaCreateContentProps", () => {
    expect(src).toMatch(/closeAfterCreate\?\s*:\s*boolean/);
  });

  it("usa shouldCloseAgendaCreateAfterSuccess do helper puro", () => {
    expect(src).toMatch(/shouldCloseAgendaCreateAfterSuccess/);
    expect(src).toMatch(/from\s+["']\.\/create-surface-policy["']/);
  });

  it("gate `if (shouldCloseAfterCreate)` envolve onRequestClose() após sucesso", () => {
    // Deve haver pelo menos duas ocorrências (prazo e compromisso).
    const matches = src.match(
      /if\s*\(\s*shouldCloseAfterCreate\s*\)\s*\{\s*\n\s*onRequestClose\(\);\s*\n\s*\}/g,
    );
    expect(matches).not.toBeNull();
    expect((matches ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("cancelamento e descarte continuam chamando onRequestClose() sem gate", () => {
    // requestClose (cancelar sem rascunho) e discardAndClose chamam direto.
    const all = src.match(/onRequestClose\(\);/g) ?? [];
    expect(all.length).toBeGreaterThanOrEqual(4);
  });

  it("não introduz APIs de navegação proibidas", () => {
    expect(src).not.toMatch(/window\.location/);
    expect(src).not.toMatch(/location\.assign/);
    expect(src).not.toMatch(/history\.pushState/);
    const successRegion = src.split("toast.success").slice(1).join("toast.success");
    expect(successRegion).not.toMatch(/setTimeout/);
  });

  it("onCreated é chamado antes do fechamento condicional (ordem preservada)", () => {
    const deadlineIdx = src.indexOf('onCreated({ type: "deadline"');
    const apptIdx = src.indexOf('onCreated({ type: "appointment"');
    expect(deadlineIdx).toBeGreaterThan(0);
    expect(apptIdx).toBeGreaterThan(0);
    const afterDeadline = src.slice(deadlineIdx, deadlineIdx + 400);
    const afterAppt = src.slice(apptIdx, apptIdx + 400);
    expect(afterDeadline).toMatch(/if\s*\(\s*shouldCloseAfterCreate\s*\)/);
    expect(afterAppt).toMatch(/if\s*\(\s*shouldCloseAfterCreate\s*\)/);
  });
});

describe("Rota canônica /app/agenda/novo", () => {
  const src = readSrc("src/routes/app.agenda.novo.tsx");

  it("passa closeAfterCreate={false} para AgendaCreateContent", () => {
    expect(src).toMatch(/closeAfterCreate=\{false\}/);
  });

  it("mantém navegação para /app/agenda/$appointmentId quando cria compromisso", () => {
    expect(src).toMatch(/to:\s*["']\/app\/agenda\/\$appointmentId["']/);
  });

  it("mantém navegação para /app/agenda ao criar prazo", () => {
    expect(src).toMatch(/setPendingCreated\(/);
    expect(src).toMatch(/to:\s*["']\/app\/agenda["']/);
  });

  it("cancelamento navega para /app/agenda via handleRequestClose", () => {
    expect(src).toMatch(/handleRequestClose/);
  });

  it("não usa APIs de navegação proibidas", () => {
    expect(src).not.toMatch(/window\.location/);
    expect(src).not.toMatch(/location\.assign/);
    expect(src).not.toMatch(/history\.pushState/);
    expect(src).not.toMatch(/setTimeout/);
  });
});

describe("Escopo — parcela B pendente (só criação extraída) e LV-09.1B.7 ausente", () => {
  it("AgendaCreateContent agora existe (extraído na LV-09.1B.6.3B.1)", () => {
    expect(
      existsSync(resolve(__dirname, "..", "src/features/agenda/AgendaCreateContent.tsx")),
    ).toBe(true);
  });

  it("AgendaItemDetailContent existe (extraído em LV-09.1B.6.3B.2.1)", () => {
    expect(
      existsSync(
        resolve(__dirname, "..", "src/features/agenda/AgendaItemDetailContent.tsx"),
      ),
    ).toBe(true);
  });


  it("availability.ts existe (LV-09.1B.7.1 iniciada)", () => {
    expect(
      existsSync(resolve(__dirname, "..", "src/features/agenda/availability.ts")),
    ).toBe(true);
  });

  it("check-appointment-availability.ts existe", () => {
    expect(
      existsSync(
        resolve(__dirname, "..", "src/features/agenda/check-appointment-availability.ts"),
      ),
    ).toBe(true);
  });

  it("/app/disponibilidade existe (LV-09.1B.7.2 concluída)", () => {
    expect(
      existsSync(resolve(__dirname, "..", "src/routes/app.disponibilidade.tsx")),
    ).toBe(true);
  });

  it("tests/agenda-091b7.test.ts existe", () => {
    expect(existsSync(resolve(__dirname, "..", "tests/agenda-091b7.test.ts"))).toBe(true);
  });
});

describe("Resolvedor e route-params intocados nesta correção", () => {
  it("resolve-appointment-route.ts existe (não foi removido)", () => {
    expect(
      existsSync(
        resolve(__dirname, "..", "src/features/agenda/resolve-appointment-route.ts"),
      ),
    ).toBe(true);
  });

  it("route-params.ts existe (não foi removido)", () => {
    expect(
      existsSync(resolve(__dirname, "..", "src/features/agenda/route-params.ts")),
    ).toBe(true);
  });
});
