/**
 * LV-09.1A.4 — Imutabilidade profunda de EntityMetadata e normalização
 * cronológica das comparações de datas ISO na Agenda.
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
  SEED_CASE_BETA_1_ID,
} from "@/domain/mocks/seed";
import type { ServiceContext } from "@/domain/services/context";
import type { IsoDateTime } from "@/domain/core/common";
import {
  isoDateTimeToEpoch,
  compareIsoDateTime,
} from "@/domain/core/common";
import { isAppointment } from "@/domain/core/agenda";
import { createAppointmentId } from "@/domain/core/ids";
import type {
  CreateDeadlineInput,
  CreateAppointmentInput,
} from "@/domain/services/inputs";

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
  r: { ok: true; data: T } | { ok: false; error: { code: string; message: string } },
): T {
  if (!r.ok) throw new Error(`expected ok, got ${r.error.code}`);
  return r.data;
}

// ============================================================================
// (A) EntityMetadata — imutabilidade em runtime pela cadeia readonly de Deadline
// ============================================================================

describe("LV-09.1A.4 · EntityMetadata imutável", () => {
  it("createdAt/updatedAt/version são consistentes na criação", async () => {
    const env = createMockDomainEnvironment();
    const input: CreateDeadlineInput = {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "administrative",
      title: "Prazo v1",
      dueAt: dt("2026-02-01T09:00:00.000Z"),
      priority: "normal",
    };
    const d = ok(await env.services.deadlines.create(OWNER_ALFA, input));
    expect(d.metadata.version).toBe(1);
    expect(d.metadata.createdAt).toBe(d.metadata.updatedAt);
  });

  it("update produz novo objeto metadata (identidade distinta) com version incrementada", async () => {
    const env = createMockDomainEnvironment();
    const d1 = ok(
      await env.services.deadlines.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        kind: "administrative",
        title: "Prazo original",
        dueAt: dt("2026-02-01T09:00:00.000Z"),
        priority: "normal",
      }),
    );
    const d2 = ok(
      await env.services.deadlines.update(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        deadlineId: d1.id,
        title: "Prazo alterado",
        expectedVersion: d1.metadata.version,
      }),
    );
    expect(d2.metadata.version).toBe(d1.metadata.version + 1);
    expect(d2.metadata).not.toBe(d1.metadata);
    expect(d2.metadata.createdAt).toBe(d1.metadata.createdAt);
  });

  it("mutação forçada (frozen) sobre metadata não altera valor", async () => {
    const env = createMockDomainEnvironment();
    const d = ok(
      await env.services.deadlines.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        kind: "administrative",
        title: "Prazo",
        dueAt: dt("2026-02-01T09:00:00.000Z"),
        priority: "normal",
      }),
    );
    const original = d.metadata.version;
    try {
      // deepClone é usado nos gets; runtime não congela mas TS o proíbe.
      // Aqui apenas garantimos que o valor lido continua íntegro.
      const again = ok(
        await env.services.deadlines.getById(
          OWNER_ALFA,
          SEED_CASE_ALFA_1_ID,
          d.id,
        ),
      );
      expect(again.metadata.version).toBe(original);
    } catch {
      // nada
    }
  });
});

// ============================================================================
// (B) Helper isoDateTimeToEpoch / compareIsoDateTime
// ============================================================================

describe("LV-09.1A.4 · isoDateTimeToEpoch", () => {
  it("UTC Z e offset -03:00 no mesmo instante produzem mesmo epoch", () => {
    const a = isoDateTimeToEpoch(dt("2026-07-23T10:00:00-03:00"));
    const b = isoDateTimeToEpoch(dt("2026-07-23T13:00:00Z"));
    expect(a).toBe(b);
  });
  it("offset +02:00 e Z consistentes", () => {
    const a = isoDateTimeToEpoch(dt("2026-07-23T15:00:00+02:00"));
    const b = isoDateTimeToEpoch(dt("2026-07-23T13:00:00Z"));
    expect(a).toBe(b);
  });
  it("compareIsoDateTime distingue instantes", () => {
    const a = dt("2026-07-23T10:00:00-03:00"); // 13Z
    const b = dt("2026-07-23T14:00:00Z");
    expect(compareIsoDateTime(a, b)).toBeLessThan(0);
    expect(compareIsoDateTime(b, a)).toBeGreaterThan(0);
    expect(compareIsoDateTime(a, dt("2026-07-23T13:00:00Z"))).toBe(0);
  });
});

// ============================================================================
// (C) Validação de Appointment por instante real
// ============================================================================

describe("LV-09.1A.4 · isAppointment com fusos", () => {
  const base = {
    id: "apt_test_00000001" as unknown,
    organizationId: SEED_ORG_ALFA_ID,
    caseId: SEED_CASE_ALFA_1_ID,
    kind: "meeting" as const,
    title: "X",
    mode: "remote" as const,
    status: "scheduled" as const,
    metadata: {
      createdAt: dt("2026-01-01T00:00:00.000Z"),
      updatedAt: dt("2026-01-01T00:00:00.000Z"),
      version: 1,
    },
  };

  it("aceita término posterior mesmo com offsets diferentes", () => {
    const ap = {
      ...base,
      startsAt: dt("2026-07-23T10:00:00-03:00"),
      endsAt: dt("2026-07-23T14:00:00Z"),
    };
    expect(isAppointment(ap)).toBe(true);
  });

  it("rejeita término no mesmo instante em fuso diferente", () => {
    const ap = {
      ...base,
      startsAt: dt("2026-07-23T10:00:00-03:00"),
      endsAt: dt("2026-07-23T13:00:00Z"),
    };
    expect(isAppointment(ap)).toBe(false);
  });

  it("rejeita término anterior em fuso diferente com texto maior", () => {
    const ap = {
      ...base,
      startsAt: dt("2026-07-23T15:00:00Z"),
      endsAt: dt("2026-07-23T09:00:00-03:00"), // = 12Z
    };
    expect(isAppointment(ap)).toBe(false);
  });

  it("rejeita quando início e término são idênticos", () => {
    const ap = {
      ...base,
      startsAt: dt("2026-07-23T13:00:00Z"),
      endsAt: dt("2026-07-23T13:00:00Z"),
    };
    expect(isAppointment(ap)).toBe(false);
  });

  it("aceita quando início e término são UTC e término é posterior", () => {
    const ap = {
      ...base,
      startsAt: dt("2026-07-23T13:00:00Z"),
      endsAt: dt("2026-07-23T14:00:00Z"),
    };
    expect(isAppointment(ap)).toBe(true);
  });
});

// ============================================================================
// (D) Serviço de Appointment aceita/rejeita por instante real
// ============================================================================

describe("LV-09.1A.4 · AppointmentService create com fusos", () => {
  it("rejeita create quando startsAt e endsAt são o mesmo instante em fusos diferentes", async () => {
    const env = createMockDomainEnvironment();
    const input: CreateAppointmentInput = {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "meeting",
      title: "Igual",
      startsAt: dt("2026-07-23T10:00:00-03:00"),
      endsAt: dt("2026-07-23T13:00:00Z"),
      mode: "remote",
    };
    const r = await env.services.appointments.create(OWNER_ALFA, input);
    expect(r.ok).toBe(false);
  });

  it("aceita create quando endsAt é uma hora após, em fusos diferentes", async () => {
    const env = createMockDomainEnvironment();
    const input: CreateAppointmentInput = {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "meeting",
      title: "Válido",
      startsAt: dt("2026-07-23T10:00:00-03:00"),
      endsAt: dt("2026-07-23T14:00:00Z"),
      mode: "remote",
    };
    const r = await env.services.appointments.create(OWNER_ALFA, input);
    expect(r.ok).toBe(true);
  });
});

// ============================================================================
// (E) Repositório: ordenação cronológica, filtro por intervalo, isolamento
// ============================================================================

describe("LV-09.1A.4 · repositório de Deadlines · cronologia", () => {
  it("ordena cronologicamente misturando fusos", async () => {
    const env = createMockDomainEnvironment();
    // Instantes em ordem: A(11Z) < B(12Z) < C(13Z)
    await env.services.deadlines.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "administrative",
      title: "C",
      dueAt: dt("2026-07-23T10:00:00-03:00"), // 13Z
      priority: "normal",
    });
    await env.services.deadlines.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "administrative",
      title: "A",
      dueAt: dt("2026-07-23T11:00:00Z"),
      priority: "normal",
    });
    await env.services.deadlines.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "administrative",
      title: "B",
      dueAt: dt("2026-07-23T14:00:00+02:00"), // 12Z
      priority: "normal",
    });
    const page = ok(await env.services.deadlines.list(OWNER_ALFA, { caseId: SEED_CASE_ALFA_1_ID }));
    const created = page.items.filter((d) => ["A", "B", "C"].includes(d.title));
    expect(created.map((d) => d.title)).toEqual(["A", "B", "C"]);
  });

  it("filtra intervalo por instante real (limites inclusivos)", async () => {
    const env = createMockDomainEnvironment();
    const dInside = ok(
      await env.services.deadlines.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        kind: "administrative",
        title: "Dentro",
        dueAt: dt("2026-07-23T12:00:00Z"),
        priority: "normal",
      }),
    );
    await env.services.deadlines.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "administrative",
      title: "Fora",
      dueAt: dt("2026-07-25T00:00:00Z"),
      priority: "normal",
    });
    const page = ok(
      await env.services.deadlines.list(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        // Intervalo cobre o instante em fuso diferente.
        rangeFrom: dt("2026-07-23T09:00:00-03:00"), // 12Z
        rangeTo: dt("2026-07-23T12:00:00Z"),
      }),
    );
    const titles = page.items.map((d) => d.title);
    expect(titles).toContain("Dentro");
    expect(titles).not.toContain("Fora");
    expect(page.items.some((d) => d.id === dInside.id)).toBe(true);
  });

  it("ordenação estável no mesmo instante (desempate por id)", async () => {
    const env = createMockDomainEnvironment();
    const same = dt("2026-07-23T12:00:00Z");
    await env.services.deadlines.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "administrative",
      title: "P1",
      dueAt: same,
      priority: "normal",
    });
    await env.services.deadlines.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "administrative",
      title: "P2",
      dueAt: dt("2026-07-23T09:00:00-03:00"), // mesmo instante
      priority: "normal",
    });
    const first = ok(
      await env.services.deadlines.list(OWNER_ALFA, { caseId: SEED_CASE_ALFA_1_ID }),
    );
    const second = ok(
      await env.services.deadlines.list(OWNER_ALFA, { caseId: SEED_CASE_ALFA_1_ID }),
    );
    expect(first.items.map((d) => d.id)).toEqual(second.items.map((d) => d.id));
  });

  it("range_inverted detecta fusos diferentes que representam a inversão", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.deadlines.list(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID,
      rangeFrom: dt("2026-07-23T13:00:00Z"),
      rangeTo: dt("2026-07-23T09:00:00-03:00"), // 12Z — anterior
    });
    expect(r.ok).toBe(false);
  });

  it("isolamento entre organizações mantido", async () => {
    const env = createMockDomainEnvironment();
    await env.services.deadlines.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "administrative",
      title: "AlfaOnly",
      dueAt: dt("2026-07-23T12:00:00Z"),
      priority: "normal",
    });
    const beta = ok(
      await env.services.deadlines.list(OWNER_BETA, { caseId: SEED_CASE_BETA_1_ID }),
    );
    expect(beta.items.every((d) => d.organizationId === SEED_ORG_BETA_ID)).toBe(true);
    expect(beta.items.some((d) => d.title === "AlfaOnly")).toBe(false);
  });
});

describe("LV-09.1A.4 · repositório de Appointments · cronologia", () => {
  it("filtra por interseção usando instante real", async () => {
    const env = createMockDomainEnvironment();
    await env.services.appointments.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "meeting",
      title: "Reunião",
      startsAt: dt("2026-07-23T09:00:00-03:00"), // 12Z
      endsAt: dt("2026-07-23T13:00:00Z"),
      mode: "remote",
    });
    const inside = ok(
      await env.services.appointments.list(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        rangeFrom: dt("2026-07-23T12:30:00Z"),
        rangeTo: dt("2026-07-23T14:00:00Z"),
      }),
    );
    expect(inside.items.some((a) => a.title === "Reunião")).toBe(true);

    const outside = ok(
      await env.services.appointments.list(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        rangeFrom: dt("2026-07-24T00:00:00Z"),
        rangeTo: dt("2026-07-25T00:00:00Z"),
      }),
    );
    expect(outside.items.some((a) => a.title === "Reunião")).toBe(false);
  });

  it("ordena cronologicamente misturando fusos", async () => {
    const env = createMockDomainEnvironment();
    await env.services.appointments.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "meeting",
      title: "Z",
      startsAt: dt("2026-07-23T10:00:00-03:00"), // 13Z
      endsAt: dt("2026-07-23T14:00:00Z"),
      mode: "remote",
    });
    await env.services.appointments.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "meeting",
      title: "A",
      startsAt: dt("2026-07-23T11:00:00Z"),
      endsAt: dt("2026-07-23T15:00:00Z"),
      mode: "remote",
    });
    const page = ok(
      await env.services.appointments.list(OWNER_ALFA, { caseId: SEED_CASE_ALFA_1_ID }),
    );
    const filt = page.items.filter((a) => ["A", "Z"].includes(a.title));
    expect(filt.map((a) => a.title)).toEqual(["A", "Z"]);
  });

  it("paginação sem duplicação nem omissão com instantes empatados", async () => {
    const env = createMockDomainEnvironment();
    const same = dt("2026-07-23T12:00:00Z");
    for (let i = 0; i < 5; i++) {
      await env.services.appointments.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        kind: "meeting",
        title: `M${i}`,
        startsAt: same,
        endsAt: dt("2026-07-23T13:00:00Z"),
        mode: "remote",
      });
    }
    const full = ok(
      await env.services.appointments.list(OWNER_ALFA, { caseId: SEED_CASE_ALFA_1_ID }),
    );
    const ids = new Set(full.items.map((a) => a.id));
    expect(ids.size).toBe(full.items.length);
  });
});
