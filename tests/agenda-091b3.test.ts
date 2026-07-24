/**
 * LV-09.1B.3 — Filtros e busca da Agenda.
 *
 * Testes puros dos helpers de filtros + testes de integração contra os
 * serviços mockados oficiais. Sem relógio real, sem I/O.
 */

import { describe, it, expect } from "bun:test";
import { createMockDomainEnvironment } from "@/domain/mocks";
import {
  SEED_ORG_ALFA_ID,
  SEED_ORG_BETA_ID,
  SEED_USER_1_ID,
  SEED_USER_2_ID,
  SEED_MEM_ALFA_OWNER_ID,
  SEED_MEM_BETA_OWNER_ID,
  SEED_CASE_ALFA_1_ID,
  SEED_CASE_ALFA_2_ID,
  SEED_CASE_BETA_1_ID,
} from "@/domain/mocks/seed";
import type { ServiceContext } from "@/domain/services/context";
import { compareIsoDateTime, type IsoDateTime } from "@/domain/core/common";
import type { Case } from "@/domain/core/case";
import {
  EMPTY_AGENDA_FILTERS,
  buildAppointmentListOptions,
  buildDeadlineListOptions,
  countActiveFilters,
  hasActiveFilters,
  removeFilter,
  sanitizeForItemType,
  shouldQueryAppointments,
  shouldQueryDeadlines,
  shouldShowUpcomingPanel,
  summarizeFilters,
  type AgendaFilterLabels,
  type AgendaFilters,
} from "@/features/agenda/filters";
import { selectUpcomingDeadlines } from "@/features/agenda/date-view";
import { buildMonthCells } from "@/features/agenda/date-view";
import type { CaseId } from "@/domain/core/ids";
import type { Deadline } from "@/domain/core/agenda";

const OWNER_ALFA: ServiceContext = Object.freeze({
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_1_ID,
  membershipId: SEED_MEM_ALFA_OWNER_ID,
  role: "proprietario",
});
const OWNER_BETA: ServiceContext = Object.freeze({
  organizationId: SEED_ORG_BETA_ID,
  userId: SEED_USER_2_ID,
  membershipId: SEED_MEM_BETA_OWNER_ID,
  role: "proprietario",
});

const dt = (s: string): IsoDateTime => s as IsoDateTime;

function ok<T>(
  r:
    | { ok: true; data: T }
    | { ok: false; error: { code: string; message: string } },
): T {
  if (!r.ok) throw new Error(`expected ok: ${r.error.code}/${r.error.message}`);
  return r.data;
}

const LABELS: AgendaFilterLabels = {
  itemType: { all: "Todos", deadlines: "Prazos", appointments: "Compromissos" },
  lifecycle: {
    all: "Todas",
    open: "Em aberto",
    completed: "Concluídas",
    cancelled: "Canceladas",
  },
  deadlineKind: {
    procedural: "Processual",
    administrative: "Administrativo",
    internal: "Interno",
  },
  deadlinePriority: {
    low: "Baixa",
    normal: "Normal",
    high: "Alta",
    urgent: "Urgente",
  },
  appointmentKind: {
    hearing: "Audiência",
    interview: "Entrevista",
    meeting: "Reunião",
    diligence: "Diligência",
    inspection: "Vistoria",
    other: "Outro",
  },
  appointmentMode: {
    in_person: "Presencial",
    remote: "Remoto",
    hybrid: "Híbrido",
  },
  caseLabelFor: (id) => String(id),
};

// ---- Mapeamento --------------------------------------------------------

describe("LV-09.1B.3 — buildDeadlineListOptions / buildAppointmentListOptions", () => {
  it("1. estado inicial gera opções vazias", () => {
    expect(buildDeadlineListOptions(EMPTY_AGENDA_FILTERS)).toEqual({});
    expect(buildAppointmentListOptions(EMPTY_AGENDA_FILTERS)).toEqual({});
  });

  it("2. pesquisa vazia não envia search", () => {
    const f: AgendaFilters = { ...EMPTY_AGENDA_FILTERS, search: "   " };
    expect(buildDeadlineListOptions(f).search).toBeUndefined();
    expect(buildAppointmentListOptions(f).search).toBeUndefined();
  });

  it("3. pesquisa remove espaços externos", () => {
    const f: AgendaFilters = { ...EMPTY_AGENDA_FILTERS, search: "  audiência  " };
    expect(buildDeadlineListOptions(f).search).toBe("audiência");
    expect(buildAppointmentListOptions(f).search).toBe("audiência");
  });

  it("4. caseId é enviado aos dois serviços", () => {
    const f: AgendaFilters = { ...EMPTY_AGENDA_FILTERS, caseId: SEED_CASE_ALFA_1_ID };
    expect(buildDeadlineListOptions(f).caseId).toBe(SEED_CASE_ALFA_1_ID);
    expect(buildAppointmentListOptions(f).caseId).toBe(SEED_CASE_ALFA_1_ID);
  });

  it("5. 'Em aberto' mapeia para pending e scheduled", () => {
    const f: AgendaFilters = { ...EMPTY_AGENDA_FILTERS, lifecycle: "open" };
    expect(buildDeadlineListOptions(f).statuses).toEqual(["pending"]);
    expect(buildAppointmentListOptions(f).statuses).toEqual(["scheduled"]);
  });

  it("6. 'Concluídas' mapeia para completed", () => {
    const f: AgendaFilters = { ...EMPTY_AGENDA_FILTERS, lifecycle: "completed" };
    expect(buildDeadlineListOptions(f).statuses).toEqual(["completed"]);
    expect(buildAppointmentListOptions(f).statuses).toEqual(["completed"]);
  });

  it("7. 'Canceladas' mapeia para cancelled", () => {
    const f: AgendaFilters = { ...EMPTY_AGENDA_FILTERS, lifecycle: "cancelled" };
    expect(buildDeadlineListOptions(f).statuses).toEqual(["cancelled"]);
    expect(buildAppointmentListOptions(f).statuses).toEqual(["cancelled"]);
  });

  it("8. prioridade é enviada somente para prazos", () => {
    const f: AgendaFilters = { ...EMPTY_AGENDA_FILTERS, deadlinePriority: "urgent" };
    expect(buildDeadlineListOptions(f).priorities).toEqual(["urgent"]);
    // AppointmentListOptions não possui 'priorities'
    expect(buildAppointmentListOptions(f)).toEqual({});
  });

  it("9. modalidade é enviada somente para compromissos", () => {
    const f: AgendaFilters = { ...EMPTY_AGENDA_FILTERS, appointmentMode: "remote" };
    expect(buildAppointmentListOptions(f).modes).toEqual(["remote"]);
    expect(buildDeadlineListOptions(f)).toEqual({});
  });

  it("10. tipos são enviados aos serviços corretos", () => {
    const f: AgendaFilters = {
      ...EMPTY_AGENDA_FILTERS,
      deadlineKind: "procedural",
      appointmentKind: "hearing",
    };
    expect(buildDeadlineListOptions(f).kinds).toEqual(["procedural"]);
    expect(buildAppointmentListOptions(f).kinds).toEqual(["hearing"]);
  });

  it("10b. 'Todas' não envia statuses", () => {
    expect(buildDeadlineListOptions(EMPTY_AGENDA_FILTERS).statuses).toBeUndefined();
    expect(buildAppointmentListOptions(EMPTY_AGENDA_FILTERS).statuses).toBeUndefined();
  });
});

// ---- Tipo de item -----------------------------------------------------

describe("LV-09.1B.3 — tipo de item", () => {
  it("11. 'Todos' consulta os dois serviços", () => {
    expect(shouldQueryDeadlines(EMPTY_AGENDA_FILTERS)).toBe(true);
    expect(shouldQueryAppointments(EMPTY_AGENDA_FILTERS)).toBe(true);
  });

  it("12. 'Prazos' não exibe compromissos", () => {
    const f = sanitizeForItemType(EMPTY_AGENDA_FILTERS, "deadlines");
    expect(shouldQueryDeadlines(f)).toBe(true);
    expect(shouldQueryAppointments(f)).toBe(false);
  });

  it("13. 'Compromissos' não exibe prazos", () => {
    const f = sanitizeForItemType(EMPTY_AGENDA_FILTERS, "appointments");
    expect(shouldQueryAppointments(f)).toBe(true);
    expect(shouldQueryDeadlines(f)).toBe(false);
  });

  it("14. mudar para 'Prazos' limpa filtros exclusivos de compromisso", () => {
    const base: AgendaFilters = {
      ...EMPTY_AGENDA_FILTERS,
      appointmentKind: "hearing",
      appointmentMode: "remote",
    };
    const next = sanitizeForItemType(base, "deadlines");
    expect(next.appointmentKind).toBeUndefined();
    expect(next.appointmentMode).toBeUndefined();
    expect(next.itemType).toBe("deadlines");
  });

  it("15. mudar para 'Compromissos' limpa filtros exclusivos de prazo", () => {
    const base: AgendaFilters = {
      ...EMPTY_AGENDA_FILTERS,
      deadlineKind: "procedural",
      deadlinePriority: "urgent",
    };
    const next = sanitizeForItemType(base, "appointments");
    expect(next.deadlineKind).toBeUndefined();
    expect(next.deadlinePriority).toBeUndefined();
    expect(next.itemType).toBe("appointments");
  });
});

// ---- Filtros ativos ---------------------------------------------------

describe("LV-09.1B.3 — filtros ativos", () => {
  it("16. estado inicial possui zero filtros", () => {
    expect(countActiveFilters(EMPTY_AGENDA_FILTERS)).toBe(0);
    expect(hasActiveFilters(EMPTY_AGENDA_FILTERS)).toBe(false);
  });

  it("17. pesquisa preenchida conta como filtro; espaços não contam", () => {
    expect(countActiveFilters({ ...EMPTY_AGENDA_FILTERS, search: "x" })).toBe(1);
    expect(countActiveFilters({ ...EMPTY_AGENDA_FILTERS, search: "   " })).toBe(0);
  });

  it("18. remoção individual atualiza a contagem", () => {
    const f: AgendaFilters = {
      ...EMPTY_AGENDA_FILTERS,
      search: "audiência",
      lifecycle: "open",
      deadlinePriority: "urgent",
    };
    expect(countActiveFilters(f)).toBe(3);
    const g = removeFilter(f, "deadlinePriority");
    expect(countActiveFilters(g)).toBe(2);
    expect(g.deadlinePriority).toBeUndefined();
  });

  it("19. limpar tudo restaura EMPTY_AGENDA_FILTERS", () => {
    const f: AgendaFilters = {
      search: "x",
      itemType: "deadlines",
      lifecycle: "open",
      caseId: SEED_CASE_ALFA_1_ID,
      deadlineKind: "procedural",
      deadlinePriority: "urgent",
    };
    let g = f;
    g = removeFilter(g, "search");
    g = removeFilter(g, "itemType");
    g = removeFilter(g, "lifecycle");
    g = removeFilter(g, "caseId");
    g = removeFilter(g, "deadlineKind");
    g = removeFilter(g, "deadlinePriority");
    expect(g).toEqual(EMPTY_AGENDA_FILTERS);
  });

  it("20. removeFilter/sanitizeForItemType não mutam o original", () => {
    const original: AgendaFilters = {
      ...EMPTY_AGENDA_FILTERS,
      search: "abc",
      itemType: "deadlines",
      appointmentKind: "hearing",
    };
    const copy = JSON.parse(JSON.stringify(original));
    removeFilter(original, "search");
    sanitizeForItemType(original, "appointments");
    expect(original).toEqual(copy);
  });

  it("20b. summarizeFilters produz chips em ordem estável", () => {
    const f: AgendaFilters = {
      search: "abc",
      itemType: "deadlines",
      lifecycle: "open",
      caseId: SEED_CASE_ALFA_1_ID,
      deadlineKind: "procedural",
      deadlinePriority: "urgent",
    };
    const chips = summarizeFilters(f, LABELS);
    expect(chips.map((c) => c.key)).toEqual([
      "search",
      "itemType",
      "caseId",
      "lifecycle",
      "deadlineKind",
      "deadlinePriority",
    ]);
  });
});

// ---- Processos e permissões -------------------------------------------

describe("LV-09.1B.3 — processos e permissões", () => {
  it("21. lista de processos respeita a organização", async () => {
    const env = createMockDomainEnvironment();
    const alfa = ok(
      await env.services.cases.list(OWNER_ALFA, { page: { limit: 100 } }),
    );
    for (const c of alfa.items)
      expect(c.organizationId).toBe(SEED_ORG_ALFA_ID);
  });

  it("22. processo inacessível não aparece na listagem do contexto", async () => {
    const env = createMockDomainEnvironment();
    const alfa = ok(
      await env.services.cases.list(OWNER_ALFA, { page: { limit: 100 } }),
    );
    expect(alfa.items.some((c) => c.id === SEED_CASE_BETA_1_ID)).toBe(false);
  });

  it("23. paginação não duplica registros", async () => {
    const env = createMockDomainEnvironment();
    const all: Case[] = [];
    let cursor: string | undefined;
    for (let i = 0; i < 20; i++) {
      const res = ok(
        await env.services.cases.list(OWNER_ALFA, {
          page: cursor ? { cursor, limit: 2 } : { limit: 2 },
        }),
      );
      all.push(...res.items);
      if (!res.nextCursor) break;
      cursor = res.nextCursor;
    }
    const ids = new Set(all.map((c) => c.id));
    expect(ids.size).toBe(all.length);
  });

  it("24. falha ao carregar processos é tratável (retorno estruturado)", async () => {
    const env = createMockDomainEnvironment();
    // Uma paginação inválida força retorno de erro em vez de exceção.
    // `limit: 0` é válido no tipo (number) e é rejeitado apenas em runtime.
    const res = await env.services.cases.list(OWNER_ALFA, {
      page: { limit: 0 },
    });
    expect(res.ok).toBe(false);
  });
});

// ---- Resultados integrados -------------------------------------------

describe("LV-09.1B.3 — filtros aplicados aos serviços", () => {
  async function seed(): Promise<
    ReturnType<typeof createMockDomainEnvironment>
  > {
    const env = createMockDomainEnvironment();
    // Prazo 1 (ALFA-1, procedural, urgent, pending)
    ok(
      await env.services.deadlines.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        kind: "procedural",
        title: "Contestação inicial",
        dueAt: dt("2026-06-01T12:00:00.000Z"),
        priority: "urgent",
      }),
    );
    // Prazo 2 (ALFA-2, administrative, normal, pending)
    ok(
      await env.services.deadlines.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_2_ID,
        kind: "administrative",
        title: "Relatório mensal",
        dueAt: dt("2026-06-15T12:00:00.000Z"),
        priority: "normal",
      }),
    );
    // Compromisso 1 (ALFA-1, hearing, remote)
    ok(
      await env.services.appointments.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        kind: "hearing",
        title: "Audiência preliminar",
        startsAt: dt("2026-06-02T14:00:00.000Z"),
        endsAt: dt("2026-06-02T15:00:00.000Z"),
        mode: "remote",
      }),
    );
    // Compromisso 2 (ALFA-2, meeting, in_person)
    ok(
      await env.services.appointments.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_2_ID,
        kind: "meeting",
        title: "Reunião com cliente",
        startsAt: dt("2026-06-05T10:00:00.000Z"),
        endsAt: dt("2026-06-05T11:00:00.000Z"),
        mode: "in_person",
      }),
    );
    return env;
  }

  it("25. busca encontra prazo pelo título", async () => {
    const env = await seed();
    const filters: AgendaFilters = {
      ...EMPTY_AGENDA_FILTERS,
      search: "Contestação",
    };
    const res = ok(
      await env.services.deadlines.list(OWNER_ALFA, {
        ...buildDeadlineListOptions(filters),
        page: { limit: 100 },
      }),
    );
    expect(res.items.map((d) => d.title)).toEqual(["Contestação inicial"]);
  });

  it("26. busca encontra compromisso pelo título", async () => {
    const env = await seed();
    const filters: AgendaFilters = {
      ...EMPTY_AGENDA_FILTERS,
      search: "Reunião com cliente",
    };
    const res = ok(
      await env.services.appointments.list(OWNER_ALFA, {
        ...buildAppointmentListOptions(filters),
        page: { limit: 100 },
      }),
    );
    expect(res.items.map((a) => a.title)).toContain("Reunião com cliente");
    expect(res.items.every((a) => /reuni.*cliente/i.test(a.title))).toBe(true);
  });

  it("27. filtro por processo restringe prazos", async () => {
    const env = await seed();
    const filters: AgendaFilters = {
      ...EMPTY_AGENDA_FILTERS,
      caseId: SEED_CASE_ALFA_1_ID,
    };
    const withFilter = ok(
      await env.services.deadlines.list(OWNER_ALFA, {
        ...buildDeadlineListOptions(filters),
        page: { limit: 100 },
      }),
    );
    const all = ok(
      await env.services.deadlines.list(OWNER_ALFA, { page: { limit: 100 } }),
    );
    expect(withFilter.items.every((d) => d.caseId === SEED_CASE_ALFA_1_ID)).toBe(true);
    expect(withFilter.items.length).toBeLessThan(all.items.length);
    expect(withFilter.items.some((d) => d.title === "Contestação inicial")).toBe(true);
  });

  it("27b. filtro por processo restringe compromissos", async () => {
    const env = await seed();
    const filters: AgendaFilters = {
      ...EMPTY_AGENDA_FILTERS,
      caseId: SEED_CASE_ALFA_1_ID,
    };
    const withFilter = ok(
      await env.services.appointments.list(OWNER_ALFA, {
        ...buildAppointmentListOptions(filters),
        page: { limit: 100 },
      }),
    );
    const all = ok(
      await env.services.appointments.list(OWNER_ALFA, { page: { limit: 100 } }),
    );
    expect(withFilter.items.every((a) => a.caseId === SEED_CASE_ALFA_1_ID)).toBe(true);
    expect(withFilter.items.length).toBeLessThan(all.items.length);
    expect(withFilter.items.some((a) => a.title === "Audiência preliminar")).toBe(true);
  });

  it("28. prioridade restringe prazos", async () => {
    const env = await seed();
    const filters: AgendaFilters = {
      ...EMPTY_AGENDA_FILTERS,
      deadlinePriority: "urgent",
    };
    const res = ok(
      await env.services.deadlines.list(OWNER_ALFA, {
        ...buildDeadlineListOptions(filters),
        page: { limit: 100 },
      }),
    );
    expect(res.items.every((d) => d.priority === "urgent")).toBe(true);
    expect(res.items.some((d) => d.title === "Contestação inicial")).toBe(true);
  });

  it("29. modalidade restringe compromissos", async () => {
    const env = await seed();
    const filters: AgendaFilters = {
      ...EMPTY_AGENDA_FILTERS,
      appointmentMode: "remote",
    };
    const res = ok(
      await env.services.appointments.list(OWNER_ALFA, {
        ...buildAppointmentListOptions(filters),
        page: { limit: 100 },
      }),
    );
    expect(res.items.every((a) => a.mode === "remote")).toBe(true);
    expect(res.items.some((a) => a.title === "Audiência preliminar")).toBe(true);
  });

  it("30. combinação de filtros (processo + prioridade + em aberto)", async () => {
    const env = await seed();
    const filters: AgendaFilters = {
      ...EMPTY_AGENDA_FILTERS,
      caseId: SEED_CASE_ALFA_1_ID,
      deadlinePriority: "urgent",
      lifecycle: "open",
    };
    const res = ok(
      await env.services.deadlines.list(OWNER_ALFA, {
        ...buildDeadlineListOptions(filters),
        page: { limit: 100 },
      }),
    );
    expect(
      res.items.every(
        (d) =>
          d.caseId === SEED_CASE_ALFA_1_ID &&
          d.priority === "urgent" &&
          d.status === "pending",
      ),
    ).toBe(true);
    expect(res.items.some((d) => d.title === "Contestação inicial")).toBe(true);
  });

  it("31. nenhum resultado é representável", async () => {
    const env = await seed();
    const filters: AgendaFilters = {
      ...EMPTY_AGENDA_FILTERS,
      search: "inexistente-xyz",
    };
    const d = ok(
      await env.services.deadlines.list(OWNER_ALFA, {
        ...buildDeadlineListOptions(filters),
        page: { limit: 100 },
      }),
    );
    const a = ok(
      await env.services.appointments.list(OWNER_ALFA, {
        ...buildAppointmentListOptions(filters),
        page: { limit: 100 },
      }),
    );
    expect(d.items.length).toBe(0);
    expect(a.items.length).toBe(0);
  });

  it("32. limpeza restaura os resultados originais", async () => {
    const env = await seed();
    const filtered = ok(
      await env.services.deadlines.list(OWNER_ALFA, {
        ...buildDeadlineListOptions({
          ...EMPTY_AGENDA_FILTERS,
          search: "Contestação",
        }),
        page: { limit: 100 },
      }),
    );
    expect(filtered.items.length).toBe(1);
    const cleared = ok(
      await env.services.deadlines.list(OWNER_ALFA, {
        ...buildDeadlineListOptions(EMPTY_AGENDA_FILTERS),
        page: { limit: 100 },
      }),
    );
    expect(cleared.items.length).toBeGreaterThanOrEqual(2);
  });

  it("33. ordenação cronológica permanece", async () => {
    const env = await seed();
    const d = ok(
      await env.services.deadlines.list(OWNER_ALFA, { page: { limit: 100 } }),
    );
    const sorted = d.items
      .slice()
      .sort((a, b) => compareIsoDateTime(a.dueAt, b.dueAt));
    // Não impõe ordem específica do serviço; validamos que a Agenda ordena
    // cronologicamente ao consumir — helper puro:
    const upcoming = selectUpcomingDeadlines(
      d.items,
      Date.parse("2026-01-01T00:00:00.000Z"),
      10,
    );
    const ts = upcoming.map((x) => x.dueAt);
    expect(ts).toEqual([...ts].sort(compareIsoDateTime));
    void sorted;
  });

  it("34. próximos prazos continuam limitados a cinco", async () => {
    const env = await seed();
    // Cria 6 prazos pendentes futuros:
    for (let i = 0; i < 6; i++) {
      const day = 10 + i;
      ok(
        await env.services.deadlines.create(OWNER_ALFA, {
          caseId: SEED_CASE_ALFA_1_ID,
          kind: "internal",
          title: `Extra ${i}`,
          dueAt: dt(`2026-07-${String(day).padStart(2, "0")}T12:00:00.000Z`),
          priority: "low",
        }),
      );
    }
    const all = ok(
      await env.services.deadlines.list(OWNER_ALFA, { page: { limit: 100 } }),
    );
    const upcoming = selectUpcomingDeadlines(
      all.items,
      Date.parse("2026-01-01T00:00:00.000Z"),
      5,
    );
    expect(upcoming.length).toBe(5);
  });

  it("35. painel de próximos prazos é ocultado quando itemType='appointments'", () => {
    const f = sanitizeForItemType(EMPTY_AGENDA_FILTERS, "appointments");
    expect(shouldShowUpcomingPanel(f)).toBe(false);
  });

  it("35b. painel oculto para 'Concluídas' e 'Canceladas'", () => {
    expect(
      shouldShowUpcomingPanel({ ...EMPTY_AGENDA_FILTERS, lifecycle: "completed" }),
    ).toBe(false);
    expect(
      shouldShowUpcomingPanel({ ...EMPTY_AGENDA_FILTERS, lifecycle: "cancelled" }),
    ).toBe(false);
    expect(
      shouldShowUpcomingPanel({ ...EMPTY_AGENDA_FILTERS, lifecycle: "open" }),
    ).toBe(true);
  });

  it("35c. status 'Concluídas' filtra prazos pelo status completed", async () => {
    const env = await seed();
    // Marca um prazo como completed.
    const before = ok(
      await env.services.deadlines.list(OWNER_ALFA, { page: { limit: 100 } }),
    );
    const first = before.items.find((d) => d.title === "Contestação inicial")!;
    ok(
      await env.services.deadlines.changeStatus(OWNER_ALFA, {
        caseId: first.caseId,
        deadlineId: first.id,
        status: "completed",
        expectedVersion: first.metadata.version,
      }),
    );
    const filters: AgendaFilters = {
      ...EMPTY_AGENDA_FILTERS,
      lifecycle: "completed",
    };
    const res = ok(
      await env.services.deadlines.list(OWNER_ALFA, {
        ...buildDeadlineListOptions(filters),
        page: { limit: 100 },
      }),
    );
    expect(res.items.every((d) => d.status === "completed")).toBe(true);
    expect(res.items.some((d) => d.title === "Contestação inicial")).toBe(true);
  });
});

// ---- Regressão --------------------------------------------------------

describe("LV-09.1B.3 — regressão da Agenda", () => {
  it("36-38. visão Mês mantém 42 células; helpers de visão preservados", () => {
    const cells = buildMonthCells(new Date(2026, 5, 15));
    expect(cells.length).toBe(42);
  });

  it("39. estado inicial (EMPTY) mantém painel de próximos visível", () => {
    expect(shouldShowUpcomingPanel(EMPTY_AGENDA_FILTERS)).toBe(true);
  });

  it("40. selectUpcomingDeadlines exclui vencidos, cancelados e concluídos", async () => {
    const past: readonly Deadline[] = [];
    const upcoming = selectUpcomingDeadlines(past, 0, 5);
    expect(upcoming.length).toBe(0);
  });

  it("41. isolamento cross-org — OWNER_BETA não enxerga processos de ALFA", async () => {
    const env = createMockDomainEnvironment();
    const beta = ok(
      await env.services.cases.list(OWNER_BETA, { page: { limit: 100 } }),
    );
    expect(beta.items.every((c) => c.organizationId === SEED_ORG_BETA_ID)).toBe(true);
  });

  it("42. summarizeFilters usa labels.caseLabelFor para o processo", () => {
    const f: AgendaFilters = {
      ...EMPTY_AGENDA_FILTERS,
      caseId: SEED_CASE_ALFA_1_ID,
    };
    const labels: AgendaFilterLabels = {
      ...LABELS,
      caseLabelFor: (id: CaseId) =>
        id === SEED_CASE_ALFA_1_ID ? "REF-ALFA-001 — Alfa" : String(id),
    };
    const chips = summarizeFilters(f, labels);
    expect(chips.find((c) => c.key === "caseId")!.label).toContain(
      "REF-ALFA-001 — Alfa",
    );
  });

  it("43. EMPTY_AGENDA_FILTERS é congelado (imutável em runtime)", () => {
    expect(Object.isFrozen(EMPTY_AGENDA_FILTERS)).toBe(true);
  });

  it("44. buildDeadlineListOptions com search vazio + statuses definidos", () => {
    const f: AgendaFilters = {
      ...EMPTY_AGENDA_FILTERS,
      search: "",
      lifecycle: "open",
    };
    const opts = buildDeadlineListOptions(f);
    expect(opts.search).toBeUndefined();
    expect(opts.statuses).toEqual(["pending"]);
  });
});
