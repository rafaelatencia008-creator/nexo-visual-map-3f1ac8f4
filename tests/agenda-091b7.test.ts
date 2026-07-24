/**
 * LV-09.1B.7.1 — Motor consultivo de disponibilidade da Agenda.
 *
 * Cobertura obrigatória: sobreposição semiaberta, limites encostados,
 * statuses ignorados, isolamento por assignment, ausência de assignment,
 * intervalos inválidos, edição, paginação completa, falhas de serviço,
 * dedupe e ordenação, ausência de efeitos colaterais e não-alteração
 * das rotas/domínio existentes.
 */

import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createMockDomainEnvironment } from "@/domain/mocks";
import {
  SEED_ORG_ALFA_ID,
  SEED_ORG_BETA_ID,
  SEED_USER_1_ID,
  SEED_USER_2_ID,
  SEED_MEM_ALFA_OWNER_ID,
  SEED_MEM_BETA_OWNER_ID,
  SEED_CASE_ALFA_2_ID,
  SEED_ASSIGN_ALFA_1_ID,
  SEED_ASSIGN_BETA_1_ID,
} from "@/domain/mocks/seed";
import type { ServiceContext } from "@/domain/services/context";
import type { AppointmentService } from "@/domain/services/appointment-service";
import type { IsoDateTime } from "@/domain/core/common";
import type { Appointment, AppointmentStatus } from "@/domain/core/agenda";
import type { AppointmentId } from "@/domain/core/ids";
import { createAppointmentId } from "@/domain/core/ids";
import type { CreateAppointmentInput } from "@/domain/services/inputs";
import {
  checkAppointmentAvailability,
  AVAILABILITY_MAX_PAGES,
  AVAILABILITY_PAGE_LIMIT,
  type AvailabilityEnvironment,
  type CheckAppointmentAvailabilityInput,
} from "@/features/agenda/check-appointment-availability";
import {
  dedupeAndSortConflicts,
  decisionAvailable,
  decisionConflict,
  decisionIndeterminate,
  intervalsOverlap,
  isCandidateForConflict,
  isValidInterval,
  normalizeInterval,
  toConflict,
  type AppointmentAvailabilityConflict,
} from "@/features/agenda/availability";

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

// Janela usada nos testes com env real. Escolhida bem depois dos seeds
// para não conflitar com dados pré-existentes do repositório.
const D1_09 = dt("2027-03-10T09:00:00.000Z");
const D1_10 = dt("2027-03-10T10:00:00.000Z");
const D1_1030 = dt("2027-03-10T10:30:00.000Z");
const D1_11 = dt("2027-03-10T11:00:00.000Z");
const D1_0930 = dt("2027-03-10T09:30:00.000Z");
const D1_0959 = dt("2027-03-10T09:59:00.000Z");
const D1_0800 = dt("2027-03-10T08:00:00.000Z");
const D1_0830 = dt("2027-03-10T08:30:00.000Z");
const D1_1200 = dt("2027-03-10T12:00:00.000Z");

function ok<T>(r: { ok: true; data: T } | { ok: false; error: unknown }): T {
  if (!r.ok) throw new Error("expected ok");
  return r.data;
}

async function seedAppointment(
  env: ReturnType<typeof createMockDomainEnvironment>,
  ctx: ServiceContext,
  overrides: Partial<CreateAppointmentInput> = {},
): Promise<Appointment> {
  const input: CreateAppointmentInput = {
    caseId: SEED_CASE_ALFA_2_ID,
    kind: "meeting",
    title: "Reunião base",
    startsAt: D1_09,
    endsAt: D1_10,
    mode: "remote",
    assignmentId: SEED_ASSIGN_ALFA_1_ID,
    ...overrides,
  };
  return ok(await env.services.appointments.create(ctx, input));
}

// ---- Ambientes falsos para pagination_limit / consultation_failed --------

type PagePayload = Readonly<{
  items: readonly Appointment[];
  nextCursor?: string;
}>;

function buildFakeEnv(
  pages:
    | ReadonlyArray<PagePayload>
    | ((cursor: string | undefined) => PagePayload | { readonly failure: true }),
  opts: { rejectOn?: number; failOn?: number } = {},
): {
  env: AvailabilityEnvironment;
  calls: Array<{ cursor: string | undefined }>;
} {
  const calls: Array<{ cursor: string | undefined }> = [];
  let idx = 0;
  const list: AppointmentService["list"] = async (_ctx, options) => {
    const cursor = options?.page?.cursor;
    calls.push({ cursor });
    if (opts.rejectOn !== undefined && idx === opts.rejectOn) {
      idx += 1;
      throw new Error("boom");
    }
    if (opts.failOn !== undefined && idx === opts.failOn) {
      idx += 1;
      return { ok: false, error: { code: "unavailable", message: "x" } };
    }
    let payload: PagePayload | { readonly failure: true };
    if (typeof pages === "function") payload = pages(cursor);
    else payload = pages[idx] ?? { items: [] };
    idx += 1;
    if ("failure" in payload) {
      return { ok: false, error: { code: "unavailable", message: "x" } };
    }
    return {
      ok: true,
      data: {
        items: payload.items,
        nextCursor: payload.nextCursor,
        total: undefined,
      },
    };
  };
  return {
    env: { services: { appointments: { list } } },
    calls,
  };
}

function makeFakeAppointment(
  id: string,
  startsAt: IsoDateTime,
  endsAt: IsoDateTime,
  extras: Partial<Appointment> = {},
): Appointment {
  return Object.freeze({
    id: createAppointmentId(id),
    organizationId: SEED_ORG_ALFA_ID,
    caseId: SEED_CASE_ALFA_2_ID,
    kind: "meeting",
    title: `Fake ${id}`,
    startsAt,
    endsAt,
    mode: "remote",
    status: "scheduled" satisfies AppointmentStatus,
    assignmentId: SEED_ASSIGN_ALFA_1_ID,
    metadata: {
      createdAt: startsAt,
      updatedAt: startsAt,
      version: 1,
    },
    ...extras,
  }) as unknown as Appointment;
}

// =========================================================================
// (A) Motor puro — sobreposição de intervalos
// =========================================================================

describe("LV-09.1B.7.1 · motor puro de intervalos", () => {
  it("1. intervalo totalmente separado não conflita", () => {
    // proposto 08:00–08:30 vs existente 09:00–10:00
    expect(
      intervalsOverlap(
        Date.parse(D1_0800),
        Date.parse(D1_0830),
        Date.parse(D1_09),
        Date.parse(D1_10),
      ),
    ).toBe(false);
  });
  it("2. sobreposição no início conflita", () => {
    // proposto 09:59–11:00 vs existente 09:00–10:00
    expect(
      intervalsOverlap(
        Date.parse(D1_0959),
        Date.parse(D1_11),
        Date.parse(D1_09),
        Date.parse(D1_10),
      ),
    ).toBe(true);
  });
  it("3. sobreposição no final conflita", () => {
    // proposto 08:00–09:30 vs existente 09:00–10:00
    expect(
      intervalsOverlap(
        Date.parse(D1_0800),
        Date.parse(D1_0930),
        Date.parse(D1_09),
        Date.parse(D1_10),
      ),
    ).toBe(true);
  });
  it("4. proposto contido no existente conflita", () => {
    expect(
      intervalsOverlap(
        Date.parse(D1_0930),
        Date.parse(D1_0959),
        Date.parse(D1_09),
        Date.parse(D1_10),
      ),
    ).toBe(true);
  });
  it("5. existente contido no proposto conflita", () => {
    expect(
      intervalsOverlap(
        Date.parse(D1_0800),
        Date.parse(D1_1200),
        Date.parse(D1_09),
        Date.parse(D1_10),
      ),
    ).toBe(true);
  });
  it("6. intervalos exatamente iguais conflitam", () => {
    expect(
      intervalsOverlap(Date.parse(D1_09), Date.parse(D1_10), Date.parse(D1_09), Date.parse(D1_10)),
    ).toBe(true);
  });
  it("7. término do existente == início do proposto NÃO conflita", () => {
    expect(
      intervalsOverlap(Date.parse(D1_10), Date.parse(D1_11), Date.parse(D1_09), Date.parse(D1_10)),
    ).toBe(false);
  });
  it("8. término do proposto == início do existente NÃO conflita", () => {
    expect(
      intervalsOverlap(
        Date.parse(D1_0800),
        Date.parse(D1_09),
        Date.parse(D1_09),
        Date.parse(D1_10),
      ),
    ).toBe(false);
  });
});

describe("LV-09.1B.7.1 · validação de intervalo", () => {
  it("9. endsAt > startsAt é válido", () => {
    expect(isValidInterval(D1_09, D1_10)).toBe(true);
    expect(normalizeInterval(D1_09, D1_10)).not.toBeNull();
  });
  it("10. endsAt == startsAt é inválido", () => {
    expect(isValidInterval(D1_09, D1_09)).toBe(false);
    expect(normalizeInterval(D1_09, D1_09)).toBeNull();
  });
  it("11. endsAt < startsAt é inválido", () => {
    expect(isValidInterval(D1_10, D1_09)).toBe(false);
    expect(normalizeInterval(D1_10, D1_09)).toBeNull();
  });
});

// =========================================================================
// (B) Elegibilidade por status/assignment
// =========================================================================

describe("LV-09.1B.7.1 · elegibilidade de candidatos", () => {
  it("12. scheduled é candidato", () => {
    const a = makeFakeAppointment("a1", D1_09, D1_10);
    expect(isCandidateForConflict(a, SEED_ASSIGN_ALFA_1_ID, undefined)).toBe(true);
  });
  it("13. completed é ignorado", () => {
    const a = makeFakeAppointment("a2", D1_09, D1_10, { status: "completed" });
    expect(isCandidateForConflict(a, SEED_ASSIGN_ALFA_1_ID, undefined)).toBe(false);
  });
  it("14. cancelled é ignorado", () => {
    const a = makeFakeAppointment("a3", D1_09, D1_10, { status: "cancelled" });
    expect(isCandidateForConflict(a, SEED_ASSIGN_ALFA_1_ID, undefined)).toBe(false);
  });
  it("15. assignment diferente é ignorado", () => {
    const a = makeFakeAppointment("a4", D1_09, D1_10, {
      assignmentId: SEED_ASSIGN_BETA_1_ID,
    });
    expect(isCandidateForConflict(a, SEED_ASSIGN_ALFA_1_ID, undefined)).toBe(false);
  });
  it("16. sem assignment no existente é ignorado", () => {
    const a = makeFakeAppointment("a5", D1_09, D1_10, { assignmentId: undefined });
    expect(isCandidateForConflict(a, SEED_ASSIGN_ALFA_1_ID, undefined)).toBe(false);
  });
  it("17. excludeAppointmentId ignora o próprio", () => {
    const a = makeFakeAppointment("a6", D1_09, D1_10);
    expect(isCandidateForConflict(a, SEED_ASSIGN_ALFA_1_ID, a.id)).toBe(false);
  });
});

// =========================================================================
// (C) Decisão consultiva — cenários com serviço real
// =========================================================================

describe("LV-09.1B.7.1 · decisão consultiva (env real)", () => {
  it("18. intervalo totalmente separado → available", async () => {
    const env = createMockDomainEnvironment();
    await seedAppointment(env, OWNER_ALFA, { startsAt: D1_09, endsAt: D1_10 });
    const d = await checkAppointmentAvailability(env, OWNER_ALFA, {
      startsAt: D1_1030,
      endsAt: D1_11,
      assignmentId: SEED_ASSIGN_ALFA_1_ID,
    });
    expect(d.kind).toBe("available");
  });
  it("19. sobreposição parcial → conflict", async () => {
    const env = createMockDomainEnvironment();
    const a = await seedAppointment(env, OWNER_ALFA, { startsAt: D1_09, endsAt: D1_10 });
    const d = await checkAppointmentAvailability(env, OWNER_ALFA, {
      startsAt: D1_0959,
      endsAt: D1_11,
      assignmentId: SEED_ASSIGN_ALFA_1_ID,
    });
    expect(d.kind).toBe("conflict");
    if (d.kind === "conflict") {
      expect(d.conflicts.some((c) => c.appointmentId === a.id)).toBe(true);
    }
  });
  it("20. encostado (10:00 vs 10:00) NÃO conflita", async () => {
    const env = createMockDomainEnvironment();
    await seedAppointment(env, OWNER_ALFA, { startsAt: D1_09, endsAt: D1_10 });
    const d = await checkAppointmentAvailability(env, OWNER_ALFA, {
      startsAt: D1_10,
      endsAt: D1_11,
      assignmentId: SEED_ASSIGN_ALFA_1_ID,
    });
    expect(d.kind).toBe("available");
  });
  it("21. completed não conflita", async () => {
    const env = createMockDomainEnvironment();
    const a = await seedAppointment(env, OWNER_ALFA);
    ok(
      await env.services.appointments.changeStatus(OWNER_ALFA, {
        caseId: a.caseId,
        appointmentId: a.id,
        status: "completed",
        expectedVersion: a.metadata.version,
      }),
    );
    const d = await checkAppointmentAvailability(env, OWNER_ALFA, {
      startsAt: D1_09,
      endsAt: D1_10,
      assignmentId: SEED_ASSIGN_ALFA_1_ID,
    });
    expect(d.kind).toBe("available");
  });
  it("22. cancelled não conflita", async () => {
    const env = createMockDomainEnvironment();
    const a = await seedAppointment(env, OWNER_ALFA);
    ok(
      await env.services.appointments.changeStatus(OWNER_ALFA, {
        caseId: a.caseId,
        appointmentId: a.id,
        status: "cancelled",
        expectedVersion: a.metadata.version,
      }),
    );
    const d = await checkAppointmentAvailability(env, OWNER_ALFA, {
      startsAt: D1_09,
      endsAt: D1_10,
      assignmentId: SEED_ASSIGN_ALFA_1_ID,
    });
    expect(d.kind).toBe("available");
  });
  it("23. assignment diferente não conflita", async () => {
    const env = createMockDomainEnvironment();
    await seedAppointment(env, OWNER_ALFA, { assignmentId: SEED_ASSIGN_ALFA_1_ID });
    // Consulta usando outro assignment (Beta) — deve retornar available
    const d = await checkAppointmentAvailability(env, OWNER_BETA, {
      startsAt: D1_09,
      endsAt: D1_10,
      assignmentId: SEED_ASSIGN_BETA_1_ID,
    });
    expect(d.kind).toBe("available");
  });
  it("24. ausência de assignment → assignment_required", async () => {
    const env = createMockDomainEnvironment();
    const d = await checkAppointmentAvailability(env, OWNER_ALFA, {
      startsAt: D1_09,
      endsAt: D1_10,
    });
    expect(d.kind).toBe("indeterminate");
    if (d.kind === "indeterminate") expect(d.reason).toBe("assignment_required");
  });
  it("25. endsAt == startsAt → invalid_interval", async () => {
    const env = createMockDomainEnvironment();
    const d = await checkAppointmentAvailability(env, OWNER_ALFA, {
      startsAt: D1_09,
      endsAt: D1_09,
      assignmentId: SEED_ASSIGN_ALFA_1_ID,
    });
    expect(d.kind).toBe("indeterminate");
    if (d.kind === "indeterminate") expect(d.reason).toBe("invalid_interval");
  });
  it("26. endsAt < startsAt → invalid_interval", async () => {
    const env = createMockDomainEnvironment();
    const d = await checkAppointmentAvailability(env, OWNER_ALFA, {
      startsAt: D1_10,
      endsAt: D1_09,
      assignmentId: SEED_ASSIGN_ALFA_1_ID,
    });
    expect(d.kind).toBe("indeterminate");
    if (d.kind === "indeterminate") expect(d.reason).toBe("invalid_interval");
  });
  it("27. intervalo inválido não chama serviço", async () => {
    let called = 0;
    const env: AvailabilityEnvironment = {
      services: {
        appointments: {
          list: async () => {
            called += 1;
            return { ok: true, data: { items: [], nextCursor: undefined } };
          },
        },
      },
    };
    await checkAppointmentAvailability(env, OWNER_ALFA, {
      startsAt: D1_10,
      endsAt: D1_09,
      assignmentId: SEED_ASSIGN_ALFA_1_ID,
    });
    expect(called).toBe(0);
  });
  it("28. assignment_required não chama serviço", async () => {
    let called = 0;
    const env: AvailabilityEnvironment = {
      services: {
        appointments: {
          list: async () => {
            called += 1;
            return { ok: true, data: { items: [], nextCursor: undefined } };
          },
        },
      },
    };
    await checkAppointmentAvailability(env, OWNER_ALFA, {
      startsAt: D1_09,
      endsAt: D1_10,
    });
    expect(called).toBe(0);
  });
  it("29. excludeAppointmentId ignora o próprio", async () => {
    const env = createMockDomainEnvironment();
    const a = await seedAppointment(env, OWNER_ALFA, { startsAt: D1_09, endsAt: D1_10 });
    const d = await checkAppointmentAvailability(env, OWNER_ALFA, {
      startsAt: D1_09,
      endsAt: D1_10,
      assignmentId: SEED_ASSIGN_ALFA_1_ID,
      excludeAppointmentId: a.id,
    });
    expect(d.kind).toBe("available");
  });
  it("30. edição detecta outro compromisso conflitante", async () => {
    const env = createMockDomainEnvironment();
    const a = await seedAppointment(env, OWNER_ALFA, { startsAt: D1_09, endsAt: D1_10 });
    const b = await seedAppointment(env, OWNER_ALFA, {
      title: "Outro",
      startsAt: D1_1030,
      endsAt: D1_11,
    });
    const d = await checkAppointmentAvailability(env, OWNER_ALFA, {
      startsAt: D1_1030,
      endsAt: D1_11,
      assignmentId: SEED_ASSIGN_ALFA_1_ID,
      excludeAppointmentId: a.id,
    });
    expect(d.kind).toBe("conflict");
    if (d.kind === "conflict") {
      expect(d.conflicts.some((c) => c.appointmentId === b.id)).toBe(true);
      expect(d.conflicts.some((c) => c.appointmentId === a.id)).toBe(false);
    }
  });
});

// =========================================================================
// (D) Paginação e falhas
// =========================================================================

describe("LV-09.1B.7.1 · paginação e falhas", () => {
  it("31. AVAILABILITY_PAGE_LIMIT respeita máximo oficial", () => {
    expect(AVAILABILITY_PAGE_LIMIT).toBeGreaterThanOrEqual(1);
    expect(AVAILABILITY_PAGE_LIMIT).toBeLessThanOrEqual(100);
  });
  it("32. uma página sem conflito → available", async () => {
    const { env, calls } = buildFakeEnv([{ items: [], nextCursor: undefined }]);
    const d = await checkAppointmentAvailability(env, OWNER_ALFA, {
      startsAt: D1_09,
      endsAt: D1_10,
      assignmentId: SEED_ASSIGN_ALFA_1_ID,
    });
    expect(d.kind).toBe("available");
    expect(calls.length).toBe(1);
  });
  it("33. conflito na primeira página é detectado", async () => {
    const { env } = buildFakeEnv([
      { items: [makeFakeAppointment("p1", D1_0959, D1_11)], nextCursor: undefined },
    ]);
    const d = await checkAppointmentAvailability(env, OWNER_ALFA, {
      startsAt: D1_09,
      endsAt: D1_10,
      assignmentId: SEED_ASSIGN_ALFA_1_ID,
    });
    expect(d.kind).toBe("conflict");
  });
  it("34. conflito na última página é detectado", async () => {
    const { env, calls } = buildFakeEnv([
      {
        items: [
          makeFakeAppointment("p1", dt("2027-03-11T09:00:00.000Z"), dt("2027-03-11T10:00:00.000Z")),
        ],
        nextCursor: "c1",
      },
      { items: [makeFakeAppointment("p2", D1_0959, D1_11)], nextCursor: undefined },
    ]);
    const d = await checkAppointmentAvailability(env, OWNER_ALFA, {
      startsAt: D1_09,
      endsAt: D1_10,
      assignmentId: SEED_ASSIGN_ALFA_1_ID,
    });
    expect(d.kind).toBe("conflict");
    expect(calls.length).toBe(2);
    expect(calls[1].cursor).toBe("c1");
  });
  it("35. todas as páginas são percorridas", async () => {
    const { env, calls } = buildFakeEnv([
      { items: [], nextCursor: "c1" },
      { items: [], nextCursor: "c2" },
      { items: [], nextCursor: undefined },
    ]);
    const d = await checkAppointmentAvailability(env, OWNER_ALFA, {
      startsAt: D1_09,
      endsAt: D1_10,
      assignmentId: SEED_ASSIGN_ALFA_1_ID,
    });
    expect(d.kind).toBe("available");
    expect(calls.length).toBe(3);
    expect(calls.map((c) => c.cursor)).toEqual([undefined, "c1", "c2"]);
  });
  it("36. erro na primeira página → consultation_failed", async () => {
    const { env } = buildFakeEnv([{ items: [] }], { failOn: 0 });
    const d = await checkAppointmentAvailability(env, OWNER_ALFA, {
      startsAt: D1_09,
      endsAt: D1_10,
      assignmentId: SEED_ASSIGN_ALFA_1_ID,
    });
    expect(d.kind).toBe("indeterminate");
    if (d.kind === "indeterminate") expect(d.reason).toBe("consultation_failed");
  });
  it("37. erro em página posterior não retorna available", async () => {
    const { env } = buildFakeEnv([{ items: [], nextCursor: "c1" }, { items: [] }], { failOn: 1 });
    const d = await checkAppointmentAvailability(env, OWNER_ALFA, {
      startsAt: D1_09,
      endsAt: D1_10,
      assignmentId: SEED_ASSIGN_ALFA_1_ID,
    });
    expect(d.kind).toBe("indeterminate");
    if (d.kind === "indeterminate") expect(d.reason).toBe("consultation_failed");
  });
  it("38. Promise rejeitada → consultation_failed", async () => {
    const { env } = buildFakeEnv([{ items: [] }], { rejectOn: 0 });
    const d = await checkAppointmentAvailability(env, OWNER_ALFA, {
      startsAt: D1_09,
      endsAt: D1_10,
      assignmentId: SEED_ASSIGN_ALFA_1_ID,
    });
    expect(d.kind).toBe("indeterminate");
    if (d.kind === "indeterminate") expect(d.reason).toBe("consultation_failed");
  });
  it("39. paginação acima do limite → pagination_limit", async () => {
    // Serviço devolve sempre `nextCursor` — o motor deve abortar.
    const env: AvailabilityEnvironment = {
      services: {
        appointments: {
          list: async () => ({
            ok: true,
            data: { items: [], nextCursor: "infinite" },
          }),
        },
      },
    };
    const d = await checkAppointmentAvailability(env, OWNER_ALFA, {
      startsAt: D1_09,
      endsAt: D1_10,
      assignmentId: SEED_ASSIGN_ALFA_1_ID,
    });
    expect(d.kind).toBe("indeterminate");
    if (d.kind === "indeterminate") expect(d.reason).toBe("pagination_limit");
  });
  it("40. AVAILABILITY_MAX_PAGES é finito e razoável", () => {
    expect(Number.isInteger(AVAILABILITY_MAX_PAGES)).toBe(true);
    expect(AVAILABILITY_MAX_PAGES).toBeGreaterThan(0);
    expect(AVAILABILITY_MAX_PAGES).toBeLessThanOrEqual(1000);
  });
});

// =========================================================================
// (E) Dedupe e ordenação
// =========================================================================

describe("LV-09.1B.7.1 · dedupe e ordenação", () => {
  it("41. compromissos duplicados são deduplicados por appointmentId", () => {
    const a = makeFakeAppointment("dup1", D1_09, D1_10);
    const list: AppointmentAvailabilityConflict[] = [toConflict(a), toConflict(a)];
    const out = dedupeAndSortConflicts(list);
    expect(out.length).toBe(1);
  });
  it("42. conflitos ordenados por startsAt crescente", () => {
    const a = makeFakeAppointment(
      "z",
      dt("2027-03-10T11:00:00.000Z"),
      dt("2027-03-10T12:00:00.000Z"),
    );
    const b = makeFakeAppointment(
      "y",
      dt("2027-03-10T09:00:00.000Z"),
      dt("2027-03-10T10:00:00.000Z"),
    );
    const c = makeFakeAppointment(
      "x",
      dt("2027-03-10T10:00:00.000Z"),
      dt("2027-03-10T11:00:00.000Z"),
    );
    const out = dedupeAndSortConflicts([toConflict(a), toConflict(b), toConflict(c)]);
    expect(out.map((o) => o.appointmentId)).toEqual([b.id, c.id, a.id]);
  });
  it("43. empate em startsAt → endsAt crescente", () => {
    const a = makeFakeAppointment("a", D1_09, dt("2027-03-10T11:00:00.000Z"));
    const b = makeFakeAppointment("b", D1_09, D1_10);
    const out = dedupeAndSortConflicts([toConflict(a), toConflict(b)]);
    expect(out.map((o) => o.appointmentId)).toEqual([b.id, a.id]);
  });
  it("44. empate total → appointmentId crescente", () => {
    const a = makeFakeAppointment("mmm", D1_09, D1_10);
    const b = makeFakeAppointment("aaa", D1_09, D1_10);
    const out = dedupeAndSortConflicts([toConflict(a), toConflict(b)]);
    expect(out.map((o) => o.appointmentId)).toEqual([b.id, a.id]);
  });
  it("45. saída é congelada (Object.isFrozen)", () => {
    const out = dedupeAndSortConflicts([]);
    expect(Object.isFrozen(out)).toBe(true);
  });
});

// =========================================================================
// (F) Isolamento e ausência de mutação
// =========================================================================

describe("LV-09.1B.7.1 · isolamento e ausência de efeitos", () => {
  it("46. contexto recebido não é modificado", async () => {
    const env = createMockDomainEnvironment();
    const before = JSON.stringify(OWNER_ALFA);
    await checkAppointmentAvailability(env, OWNER_ALFA, {
      startsAt: D1_09,
      endsAt: D1_10,
      assignmentId: SEED_ASSIGN_ALFA_1_ID,
    });
    expect(JSON.stringify(OWNER_ALFA)).toBe(before);
  });
  it("47. snapshot do domínio não muda após consulta", async () => {
    const env = createMockDomainEnvironment();
    const before = env.snapshot().appointments.length;
    await checkAppointmentAvailability(env, OWNER_ALFA, {
      startsAt: D1_09,
      endsAt: D1_10,
      assignmentId: SEED_ASSIGN_ALFA_1_ID,
    });
    expect(env.snapshot().appointments.length).toBe(before);
  });
  it("48. isolamento organizacional: outra org não vê conflitos", async () => {
    const env = createMockDomainEnvironment();
    await seedAppointment(env, OWNER_ALFA, { startsAt: D1_09, endsAt: D1_10 });
    const d = await checkAppointmentAvailability(env, OWNER_BETA, {
      startsAt: D1_09,
      endsAt: D1_10,
      assignmentId: SEED_ASSIGN_BETA_1_ID,
    });
    expect(d.kind).toBe("available");
  });
  it("49. fábricas de decisão devolvem objetos congelados", () => {
    expect(Object.isFrozen(decisionAvailable())).toBe(true);
    expect(Object.isFrozen(decisionIndeterminate("assignment_required"))).toBe(true);
    expect(Object.isFrozen(decisionConflict([]))).toBe(true);
  });
});

// =========================================================================
// (G) Provas estruturais — arquivos e ausência de escopo proibido
// =========================================================================

function read(rel: string): string {
  return readFileSync(resolve(__dirname, "..", rel), "utf8");
}

describe("LV-09.1B.7.1 · provas estruturais", () => {
  const AV_SRC = read("src/features/agenda/availability.ts");
  const CHECK_SRC = read("src/features/agenda/check-appointment-availability.ts");

  it("50. availability.ts não importa React", () => {
    expect(AV_SRC).not.toMatch(/from\s+"react"/);
    expect(AV_SRC).not.toMatch(/from\s+"react-dom"/);
  });
  it("51. availability.ts não importa Router", () => {
    expect(AV_SRC).not.toMatch(/@tanstack\/react-router/);
  });
  it("52. check-appointment-availability.ts não importa React", () => {
    expect(CHECK_SRC).not.toMatch(/from\s+"react"/);
  });
  it("53. check-appointment-availability.ts não importa Router", () => {
    expect(CHECK_SRC).not.toMatch(/@tanstack\/react-router/);
  });
  it("54. orquestrador não usa toast", () => {
    expect(CHECK_SRC).not.toMatch(/toast/i);
    expect(AV_SRC).not.toMatch(/toast/i);
  });
  it("55. orquestrador não chama create/update/remove/changeStatus", () => {
    expect(CHECK_SRC).not.toMatch(/appointments\.(create|update|remove|changeStatus)/);
  });
  it("56. orquestrador usa apenas appointments.list", () => {
    expect(CHECK_SRC).toMatch(/appointments\.list/);
  });
  it("57. nenhuma rota de disponibilidade foi criada", () => {
    let exists = true;
    try {
      readFileSync(resolve(__dirname, "..", "src/routes/app.disponibilidade.tsx"), "utf8");
    } catch {
      exists = false;
    }
    expect(exists).toBe(false);
  });
  it("58. /app/agenda/$appointmentId permanece página canônica", () => {
    const src = read("src/routes/app.agenda.$appointmentId.tsx");
    expect(src).toMatch(/AgendaItemDetailContent/);
    expect(src).not.toMatch(/from\s+"@\/features\/agenda\/AgendaItemDetailDialog"/);
  });
  it("59. /app/agenda permanece usando o wrapper", () => {
    const src = read("src/routes/app.agenda.index.tsx");
    expect(src).toMatch(/AgendaItemDetailDialog/);
  });
  it("60. rota de criação /app/agenda/novo permanece intacta", () => {
    const src = read("src/routes/app.agenda.novo.tsx");
    expect(src).toMatch(/AgendaCreateContent/);
  });
  it("61. Content de detalhe permanece intacto (import de detail-activity)", () => {
    const src = read("src/features/agenda/AgendaItemDetailContent.tsx");
    expect(src).toMatch(/detail-activity/);
  });
  it("62. domínio agenda não referencia availability", () => {
    const src = read("src/domain/core/agenda.ts");
    expect(src).not.toMatch(/availability/);
  });
  it("63. serviços não referenciam availability", () => {
    const src = read("src/domain/services/appointment-service.ts");
    expect(src).not.toMatch(/availability/);
  });
  it("64. mocks não referenciam availability", () => {
    const src = read("src/domain/mocks/appointment-mock.ts");
    expect(src).not.toMatch(/availability/);
  });
  it("65. routeTree.gen.ts não menciona disponibilidade", () => {
    const src = read("src/routeTree.gen.ts");
    expect(src).not.toMatch(/disponibilidade/i);
  });
});

// Fake unused-var guards (mantém referências fortes para o typecheck)
const _tsGuard: CheckAppointmentAvailabilityInput | undefined = undefined;
void _tsGuard;
const _idGuard: AppointmentId | undefined = undefined;
void _idGuard;
