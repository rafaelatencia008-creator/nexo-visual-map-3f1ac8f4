/**
 * LV-09.1B.2.1 — Regressão da Agenda:
 *  - grade mensal com 42 células;
 *  - próximos prazos (limite, filtros, ordenação e desempate);
 *  - representabilidade dos estados loading/ready/error.
 */

import { describe, it, expect } from "bun:test";
import { createMockDomainEnvironment } from "@/domain/mocks";
import {
  SEED_ORG_ALFA_ID,
  SEED_USER_1_ID,
  SEED_MEM_ALFA_OWNER_ID,
  SEED_CASE_ALFA_1_ID,
} from "@/domain/mocks/seed";
import type { ServiceContext } from "@/domain/services/context";
import type { IsoDateTime } from "@/domain/core/common";
import type { Appointment, Deadline } from "@/domain/core/agenda";
import {
  buildMonthCells,
  selectUpcomingDeadlines,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "@/features/agenda/date-view";

const OWNER: ServiceContext = Object.freeze({
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_1_ID,
  membershipId: SEED_MEM_ALFA_OWNER_ID,
  role: "proprietario",
});

const dt = (s: string): IsoDateTime => s as IsoDateTime;

function ok<T>(
  r:
    | { ok: true; data: T }
    | { ok: false; error: { code: string; message: string } },
): T {
  if (!r.ok) throw new Error(`expected ok: ${r.error.code}`);
  return r.data;
}

async function makeDeadline(
  overrides: {
    dueAt: IsoDateTime;
    title?: string;
    priority?: Deadline["priority"];
  },
  opts: { status?: "completed" | "cancelled" } = {},
): Promise<Deadline> {
  const env = createMockDomainEnvironment();
  const created = ok(
    await env.services.deadlines.create(OWNER, {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "administrative",
      title: overrides.title ?? "Prazo",
      priority: overrides.priority ?? "normal",
      dueAt: overrides.dueAt,
    }),
  );
  if (opts.status) {
    return ok(
      await env.services.deadlines.changeStatus(OWNER, {
        caseId: SEED_CASE_ALFA_1_ID,
        deadlineId: created.id,
        status: opts.status,
        expectedVersion: created.metadata.version,
      }),
    );
  }
  return created;
}

// ============================================================================
// (A) buildMonthCells — 42 células, começando na segunda-feira anterior
// ============================================================================

describe("LV-09.1B.2.1 · buildMonthCells", () => {
  it("sempre retorna exatamente 42 células", () => {
    const anchors = [
      new Date(2026, 0, 15),
      new Date(2026, 1, 15), // fev
      new Date(2024, 1, 15), // fev bissexto
      new Date(2026, 5, 1), // mês começa numa segunda
      new Date(2026, 10, 30), // mês termina numa segunda
    ];
    for (const a of anchors) {
      const cells = buildMonthCells(a);
      expect(cells.length).toBe(42);
    }
  });

  it("primeira célula é uma segunda-feira <= primeiro dia do mês", () => {
    const anchor = new Date(2026, 5, 15); // junho/2026
    const cells = buildMonthCells(anchor);
    const first = startOfMonth(anchor);
    // Segunda-feira (padrão pt-BR): getDay() usando startOfWeek
    expect(cells[0].getTime()).toBe(startOfWeek(first).getTime());
    expect(cells[0].getTime()).toBeLessThanOrEqual(first.getTime());
  });

  it("células são dias consecutivos", () => {
    const cells = buildMonthCells(new Date(2026, 8, 10));
    for (let i = 1; i < cells.length; i++) {
      const diff = cells[i].getTime() - cells[i - 1].getTime();
      expect(diff).toBe(24 * 60 * 60 * 1000);
    }
  });

  it("cobre o mês inteiro do anchor", () => {
    const anchor = new Date(2026, 1, 10); // fev/2026
    const cells = buildMonthCells(anchor);
    const inMonth = cells.filter((c) => c.getMonth() === anchor.getMonth());
    // fev/2026 tem 28 dias — todos devem estar cobertos
    expect(inMonth.length).toBe(28);
  });
});

// ============================================================================
// (B) selectUpcomingDeadlines — limite, filtros, ordenação
// ============================================================================

const REF = Date.parse("2026-06-15T12:00:00Z");

describe("LV-09.1B.2.1 · selectUpcomingDeadlines", () => {
  it("limita a cinco resultados por padrão", async () => {
    const items = await Promise.all(
      [1, 2, 3, 4, 5, 6, 7].map((i) =>
        makeDeadline({ dueAt: dt(`2026-07-0${i}T09:00:00Z`) }),
      ),
    );
    const r = selectUpcomingDeadlines(items, REF);
    expect(r.length).toBe(5);
  });

  it("inclui apenas registros pendentes", async () => {
    const pending = await makeDeadline({ dueAt: dt("2026-07-01T09:00:00Z") });
    const r = selectUpcomingDeadlines([pending], REF);
    expect(r.length).toBe(1);
    expect(r[0].status).toBe("pending");
  });

  it("exclui registros concluídos", async () => {
    const done = await makeDeadline(
      { dueAt: dt("2026-07-01T09:00:00Z") },
      { status: "completed" },
    );
    expect(selectUpcomingDeadlines([done], REF).length).toBe(0);
  });

  it("exclui registros cancelados", async () => {
    const cancelled = await makeDeadline(
      { dueAt: dt("2026-07-01T09:00:00Z") },
      { status: "cancelled" },
    );
    expect(selectUpcomingDeadlines([cancelled], REF).length).toBe(0);
  });

  it("exclui prazos anteriores ao instante de referência", async () => {
    const past = await makeDeadline({ dueAt: dt("2026-06-15T11:59:59Z") });
    const future = await makeDeadline({ dueAt: dt("2026-06-15T12:00:01Z") });
    const r = selectUpcomingDeadlines([past, future], REF);
    expect(r.length).toBe(1);
    expect(r[0].id).toBe(future.id);
  });

  it("inclui prazo exatamente igual à referência (limite inferior inclusivo)", async () => {
    const eq = await makeDeadline({ dueAt: dt("2026-06-15T12:00:00Z") });
    const r = selectUpcomingDeadlines([eq], REF);
    expect(r.length).toBe(1);
  });

  it("mantém ordenação cronológica ascendente", async () => {
    const a = await makeDeadline({ dueAt: dt("2026-08-01T09:00:00Z") });
    const b = await makeDeadline({ dueAt: dt("2026-07-01T09:00:00Z") });
    const c = await makeDeadline({ dueAt: dt("2026-07-15T09:00:00Z") });
    const r = selectUpcomingDeadlines([a, b, c], REF);
    expect(r.map((d) => d.dueAt)).toEqual([b.dueAt, c.dueAt, a.dueAt]);
  });

  it("desempate por id (estável) quando dueAt é idêntico", async () => {
    // Cria vários com o mesmo dueAt e valida que a ordem final segue id asc
    const same = dt("2026-07-01T09:00:00Z");
    const items = await Promise.all([
      makeDeadline({ dueAt: same, title: "A" }),
      makeDeadline({ dueAt: same, title: "B" }),
      makeDeadline({ dueAt: same, title: "C" }),
    ]);
    const r1 = selectUpcomingDeadlines(items, REF);
    const r2 = selectUpcomingDeadlines([...items].reverse(), REF);
    expect(r1.map((d) => d.id)).toEqual(r2.map((d) => d.id));
    const ids = r1.map((d) => d.id);
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });

  it("respeita limite customizado", async () => {
    const items = await Promise.all(
      [1, 2, 3].map((i) =>
        makeDeadline({ dueAt: dt(`2026-07-0${i}T09:00:00Z`) }),
      ),
    );
    expect(selectUpcomingDeadlines(items, REF, 2).length).toBe(2);
    expect(selectUpcomingDeadlines(items, REF, 0).length).toBe(0);
  });

  it("é puro — não muta a lista de entrada", async () => {
    const items = await Promise.all([
      makeDeadline({ dueAt: dt("2026-08-01T09:00:00Z") }),
      makeDeadline({ dueAt: dt("2026-07-01T09:00:00Z") }),
    ]);
    const snapshot = items.map((d) => d.id);
    selectUpcomingDeadlines(items, REF);
    expect(items.map((d) => d.id)).toEqual(snapshot);
  });
});

// ============================================================================
// (C) Transição Semana → Dia (conceitual, sem UI)
// ============================================================================

describe("LV-09.1B.2.1 · transição Semana → Dia", () => {
  it("selecionar um dia da semana produz âncora do respectivo dia", () => {
    const anchor = new Date(2026, 5, 17); // qua, jun/2026
    const weekStart = startOfWeek(anchor);
    // Simula clique no 3º dia (quarta) na visão Semana:
    const pick = new Date(weekStart);
    pick.setDate(pick.getDate() + 2);
    const dayAnchor = startOfDay(pick);
    expect(dayAnchor.getTime()).toBe(startOfDay(anchor).getTime());
  });
});

// ============================================================================
// (D) Estados loading / ready / error — representabilidade
// ============================================================================

type LoadState =
  | { kind: "loading" }
  | {
      kind: "ready";
      data: {
        readonly deadlines: readonly Deadline[];
        readonly appointments: readonly Appointment[];
      };
    }
  | { kind: "error"; message: string };

describe("LV-09.1B.2.1 · estados da tela representáveis", () => {
  it("estado vazio é representável (ready com listas vazias)", () => {
    const s: LoadState = { kind: "ready", data: { deadlines: [], appointments: [] } };
    expect(s.kind).toBe("ready");
    if (s.kind === "ready") {
      expect(s.data.deadlines.length).toBe(0);
      expect(s.data.appointments.length).toBe(0);
    }
  });

  it("estado de carregamento é representável", () => {
    const s: LoadState = { kind: "loading" };
    expect(s.kind).toBe("loading");
  });

  it("estado de erro é representável e carrega mensagem", () => {
    const s: LoadState = { kind: "error", message: "Falha ao carregar agenda." };
    expect(s.kind).toBe("error");
    if (s.kind === "error") {
      expect(s.message.length).toBeGreaterThan(0);
    }
  });
});
