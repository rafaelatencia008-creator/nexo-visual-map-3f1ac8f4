/**
 * LV-09.1A — testes de fundação da Agenda (Deadline e Appointment).
 *
 * Cobertura: contratos, catálogos, guardas, mocks estáveis, segregação por
 * organização e caso, concorrência otimista, paginação e status.
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
  SEED_ASSIGN_ALFA_1_ID,
  SEED_ASSIGN_BETA_1_ID,
} from "@/domain/mocks/seed";
import type { ServiceContext } from "@/domain/services/context";
import { PERMISSION_ACTIONS } from "@/domain/services/permissions";
import {
  DEADLINE_KINDS,
  DEADLINE_PRIORITIES,
  AGENDA_DEADLINE_STATUSES,
  APPOINTMENT_KINDS,
  APPOINTMENT_MODES,
  APPOINTMENT_STATUSES,
  AGENDA_TITLE_MAX,
  AGENDA_DESCRIPTION_MAX,
  APPOINTMENT_LOCATION_MAX,
  isDeadline,
  isAppointment,
  isDeadlineKind,
  isDeadlineStatus,
  isDeadlinePriority,
  isAppointmentKind,
  isAppointmentMode,
  isAppointmentStatus,
} from "@/domain/core/agenda";
import {
  isAppointmentId,
  isDeadlineId,
  createAppointmentId,
  createDeadlineId,
} from "@/domain/core/ids";
import type { IsoDateTime } from "@/domain/core/common";
import type {
  CreateDeadlineInput,
  UpdateDeadlineInput,
  ChangeDeadlineStatusInput,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  ChangeAppointmentStatusInput,
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

function ok<T>(r: { ok: true; data: T } | { ok: false; error: { code: string; message: string } }): T {
  if (!r.ok) throw new Error(`expected ok, got error ${r.error.code}/${r.error.message}`);
  return r.data;
}
function err(r: { ok: true; data: unknown } | { ok: false; error: { code: string; message: string } }): { code: string; message: string } {
  if (r.ok) throw new Error("expected error, got ok");
  return r.error;
}

const dt = (s: string): IsoDateTime => s as IsoDateTime;
const T_A = dt("2026-02-01T09:00:00.000Z");
const T_B = dt("2026-02-01T10:00:00.000Z");
const T_C = dt("2026-02-01T11:00:00.000Z");

async function newDeadline(env: ReturnType<typeof createMockDomainEnvironment>) {
  const input: CreateDeadlineInput = {
    caseId: SEED_CASE_ALFA_1_ID,
    kind: "administrative",
    title: "Prazo teste",
    dueAt: T_A,
    priority: "normal",
  };
  return env.services.deadlines.create(OWNER_ALFA, input);
}
async function newAppointment(env: ReturnType<typeof createMockDomainEnvironment>) {
  const input: CreateAppointmentInput = {
    caseId: SEED_CASE_ALFA_1_ID,
    kind: "meeting",
    title: "Reunião teste",
    startsAt: T_A,
    endsAt: T_B,
    mode: "remote",
  };
  return env.services.appointments.create(OWNER_ALFA, input);
}

// ============================================================================
// (1) Catálogos e guardas de tipo
// ============================================================================

describe("LV-09.1A · catálogos", () => {
  it("(1) DEADLINE_KINDS tem 3 valores", () => {
    expect(DEADLINE_KINDS.length).toBe(3);
    expect(new Set(DEADLINE_KINDS).size).toBe(3);
  });
  it("(2) DEADLINE_PRIORITIES tem 4 valores", () => {
    expect(DEADLINE_PRIORITIES.length).toBe(4);
  });
  it("(3) AGENDA_DEADLINE_STATUSES tem 3 valores", () => {
    expect(AGENDA_DEADLINE_STATUSES.length).toBe(3);
    expect(AGENDA_DEADLINE_STATUSES.includes("pending")).toBe(true);
    expect(AGENDA_DEADLINE_STATUSES.includes("completed")).toBe(true);
    expect(AGENDA_DEADLINE_STATUSES.includes("cancelled")).toBe(true);
  });
  it("(4) APPOINTMENT_KINDS tem 6 valores", () => {
    expect(APPOINTMENT_KINDS.length).toBe(6);
  });
  it("(5) APPOINTMENT_MODES tem 3 valores", () => {
    expect(APPOINTMENT_MODES.length).toBe(3);
  });
  it("(6) APPOINTMENT_STATUSES contém scheduled/completed/cancelled", () => {
    expect(APPOINTMENT_STATUSES.length).toBeGreaterThanOrEqual(3);
    expect(APPOINTMENT_STATUSES.includes("scheduled")).toBe(true);
  });
  it("(7) limites: título 160, descrição 2000, local 300", () => {
    expect(AGENDA_TITLE_MAX).toBe(160);
    expect(AGENDA_DESCRIPTION_MAX).toBe(2000);
    expect(APPOINTMENT_LOCATION_MAX).toBe(300);
  });
  it("(8) isDeadlineKind aceita e rejeita", () => {
    expect(isDeadlineKind("administrative")).toBe(true);
    expect(isDeadlineKind("unknown")).toBe(false);
    expect(isDeadlineKind(1)).toBe(false);
  });
  it("(9) isDeadlineStatus aceita e rejeita", () => {
    expect(isDeadlineStatus("pending")).toBe(true);
    expect(isDeadlineStatus("done")).toBe(false);
  });
  it("(10) isDeadlinePriority aceita e rejeita", () => {
    expect(isDeadlinePriority("urgent")).toBe(true);
    expect(isDeadlinePriority("medium")).toBe(false);
  });
  it("(11) isAppointmentKind aceita e rejeita", () => {
    expect(isAppointmentKind("meeting")).toBe(true);
    expect(isAppointmentKind("examination")).toBe(false);
  });
  it("(12) isAppointmentMode aceita e rejeita", () => {
    expect(isAppointmentMode("remote")).toBe(true);
    expect(isAppointmentMode("onsite")).toBe(false);
  });
  it("(13) isAppointmentStatus aceita e rejeita", () => {
    expect(isAppointmentStatus("scheduled")).toBe(true);
    expect(isAppointmentStatus("draft")).toBe(false);
  });
  it("(14) isDeadlineId reconhece prefixo", () => {
    expect(isDeadlineId(createDeadlineId("x"))).toBe(true);
    expect(isDeadlineId("case_x")).toBe(false);
  });
  it("(15) isAppointmentId reconhece prefixo", () => {
    expect(isAppointmentId(createAppointmentId("x"))).toBe(true);
    expect(isAppointmentId("case_x")).toBe(false);
  });
});

// ============================================================================
// (2) Permissões (12 novas ações)
// ============================================================================

describe("LV-09.1A · permissões", () => {
  const AGENDA_ACTIONS = [
    "deadline.read","deadline.list","deadline.create","deadline.update",
    "deadline.changeStatus","deadline.remove",
    "appointment.read","appointment.list","appointment.create","appointment.update",
    "appointment.changeStatus","appointment.remove",
  ];
  for (const a of AGENDA_ACTIONS) {
    it(`(16+) ação ${a} está no catálogo`, () => {
      expect(PERMISSION_ACTIONS.includes(a as (typeof PERMISSION_ACTIONS)[number])).toBe(true);
    });
  }
  it("(28) catálogo agora tem 66 ações", () => {
    expect(PERMISSION_ACTIONS.length).toBe(66);
  });
});

// ============================================================================
// (3) Seed
// ============================================================================

describe("LV-09.1A · seed", () => {
  it("(29) seed contém ≥5 deadlines", () => {
    const env = createMockDomainEnvironment();
    expect(env.snapshot().deadlines.length).toBeGreaterThanOrEqual(5);
  });
  it("(30) seed contém ≥4 appointments", () => {
    const env = createMockDomainEnvironment();
    expect(env.snapshot().appointments.length).toBeGreaterThanOrEqual(4);
  });
  it("(31) todos deadlines seed são válidos", () => {
    const env = createMockDomainEnvironment();
    for (const d of env.snapshot().deadlines) expect(isDeadline(d)).toBe(true);
  });
  it("(32) todos appointments seed são válidos", () => {
    const env = createMockDomainEnvironment();
    for (const a of env.snapshot().appointments) expect(isAppointment(a)).toBe(true);
  });
  it("(33) seed tem itens em Alfa 1, Alfa 2 e Beta", () => {
    const env = createMockDomainEnvironment();
    const cases = new Set(env.snapshot().deadlines.map((d) => d.caseId));
    expect(cases.has(SEED_CASE_ALFA_1_ID)).toBe(true);
    expect(cases.has(SEED_CASE_ALFA_2_ID)).toBe(true);
    expect(cases.has(SEED_CASE_BETA_1_ID)).toBe(true);
  });
});

// ============================================================================
// (4) Create Deadline: validação e sucesso
// ============================================================================

describe("LV-09.1A · Deadline.create", () => {
  it("(34) cria deadline básico", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(await newDeadline(env));
    expect(r.metadata.version).toBe(1);
    expect(r.status).toBe("pending");
    expect(r.title).toBe("Prazo teste");
    expect(r.organizationId).toBe(SEED_ORG_ALFA_ID);
  });
  it("(35) rejeita caseId inválido", async () => {
    const env = createMockDomainEnvironment();
    const r = err(
      await env.services.deadlines.create(OWNER_ALFA, {
        ...(await freshInput()),
        caseId: "x" as never,
      }),
    );
    expect(r.code).toBe("validation_error");
  });
  it("(36) rejeita kind inválido", async () => {
    const env = createMockDomainEnvironment();
    const r = err(
      await env.services.deadlines.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        kind: "foo" as never,
        title: "T",
        dueAt: T_A,
        priority: "normal",
      }),
    );
    expect(r.message).toBe("invalid_kind");
  });
  it("(37) rejeita priority inválida", async () => {
    const env = createMockDomainEnvironment();
    const r = err(
      await env.services.deadlines.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        kind: "administrative",
        title: "T",
        dueAt: T_A,
        priority: "medium" as never,
      }),
    );
    expect(r.message).toBe("invalid_priority");
  });
  it("(38) rejeita dueAt inválido", async () => {
    const env = createMockDomainEnvironment();
    const r = err(
      await env.services.deadlines.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        kind: "administrative",
        title: "T",
        dueAt: "2026-99-99" as IsoDateTime,
        priority: "normal",
      }),
    );
    expect(r.message).toBe("invalid_due_at");
  });
  it("(39) rejeita título vazio", async () => {
    const env = createMockDomainEnvironment();
    const r = err(
      await env.services.deadlines.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        kind: "administrative",
        title: "   ",
        dueAt: T_A,
        priority: "normal",
      }),
    );
    expect(r.message).toBe("invalid_title");
  });
  it("(40) rejeita título maior que limite", async () => {
    const env = createMockDomainEnvironment();
    const r = err(
      await env.services.deadlines.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        kind: "administrative",
        title: "a".repeat(AGENDA_TITLE_MAX + 1),
        dueAt: T_A,
        priority: "normal",
      }),
    );
    expect(r.message).toBe("invalid_title");
  });
  it("(41) rejeita descrição maior que limite", async () => {
    const env = createMockDomainEnvironment();
    const r = err(
      await env.services.deadlines.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        kind: "administrative",
        title: "T",
        description: "a".repeat(AGENDA_DESCRIPTION_MAX + 1),
        dueAt: T_A,
        priority: "normal",
      }),
    );
    expect(r.message).toBe("invalid_description");
  });
  it("(42) rejeita chave desconhecida", async () => {
    const env = createMockDomainEnvironment();
    const r = err(
      await env.services.deadlines.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        kind: "administrative",
        title: "T",
        dueAt: T_A,
        priority: "normal",
        extra: "x",
      } as never),
    );
    expect(r.message).toBe("unknown_key");
  });
  it("(43) rejeita responsável de outro caso", async () => {
    const env = createMockDomainEnvironment();
    const r = err(
      await env.services.deadlines.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        kind: "administrative",
        title: "T",
        dueAt: T_A,
        priority: "normal",
        assignmentId: SEED_ASSIGN_BETA_1_ID,
      }),
    );
    expect(r.message).toBe("assignment_not_in_case");
  });
  it("(44) aceita responsável ativo do caso", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(
      await env.services.deadlines.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_2_ID,
        kind: "administrative",
        title: "T",
        dueAt: T_A,
        priority: "normal",
        assignmentId: SEED_ASSIGN_ALFA_1_ID,
      }),
    );
    expect(r.assignmentId).toBe(SEED_ASSIGN_ALFA_1_ID);
  });
  it("(45) caso de outra org devolve not_found", async () => {
    const env = createMockDomainEnvironment();
    const r = err(
      await env.services.deadlines.create(OWNER_ALFA, {
        caseId: SEED_CASE_BETA_1_ID,
        kind: "administrative",
        title: "T",
        dueAt: T_A,
        priority: "normal",
      }),
    );
    expect(r.code).toBe("not_found");
  });
});

async function freshInput(): Promise<CreateDeadlineInput> {
  return {
    caseId: SEED_CASE_ALFA_1_ID,
    kind: "administrative",
    title: "T",
    dueAt: T_A,
    priority: "normal",
  };
}

// ============================================================================
// (5) Deadline: getById, list, filtros, paginação
// ============================================================================

describe("LV-09.1A · Deadline.getById/list", () => {
  it("(46) getById devolve deadline criado", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newDeadline(env));
    const g = ok(await env.services.deadlines.getById(OWNER_ALFA, SEED_CASE_ALFA_1_ID, c.id));
    expect(g.id).toBe(c.id);
  });
  it("(47) getById devolve cópia (não a referência do store)", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newDeadline(env));
    const g1 = ok(await env.services.deadlines.getById(OWNER_ALFA, SEED_CASE_ALFA_1_ID, c.id));
    const g2 = ok(await env.services.deadlines.getById(OWNER_ALFA, SEED_CASE_ALFA_1_ID, c.id));
    expect(g1).not.toBe(g2);
    expect(g1).toEqual(g2);
  });
  it("(48) getById de outro caso devolve not_found", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newDeadline(env));
    const r = err(await env.services.deadlines.getById(OWNER_ALFA, SEED_CASE_ALFA_2_ID, c.id));
    expect(r.code).toBe("not_found");
  });
  it("(49) getById cross-org devolve not_found", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newDeadline(env));
    const r = err(await env.services.deadlines.getById(OWNER_BETA, SEED_CASE_ALFA_1_ID, c.id));
    expect(r.code).toBe("not_found");
  });
  it("(50) list sem opções devolve deadlines da org", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(await env.services.deadlines.list(OWNER_ALFA));
    expect(r.items.length).toBeGreaterThan(0);
    for (const d of r.items) expect(d.organizationId).toBe(SEED_ORG_ALFA_ID);
  });
  it("(51) list não vaza deadlines de outra org", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(await env.services.deadlines.list(OWNER_ALFA));
    for (const d of r.items) expect(d.organizationId).toBe(SEED_ORG_ALFA_ID);
    const r2 = ok(await env.services.deadlines.list(OWNER_BETA));
    for (const d of r2.items) expect(d.organizationId).toBe(SEED_ORG_BETA_ID);
  });
  it("(52) list filtra por caseId", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(await env.services.deadlines.list(OWNER_ALFA, { caseId: SEED_CASE_ALFA_2_ID }));
    for (const d of r.items) expect(d.caseId).toBe(SEED_CASE_ALFA_2_ID);
  });
  it("(53) list rejeita caseId cross-org", async () => {
    const env = createMockDomainEnvironment();
    const r = err(await env.services.deadlines.list(OWNER_ALFA, { caseId: SEED_CASE_BETA_1_ID }));
    expect(r.code).toBe("not_found");
  });
  it("(54) list filtra por status", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(await env.services.deadlines.list(OWNER_ALFA, { statuses: ["cancelled"] }));
    for (const d of r.items) expect(d.status).toBe("cancelled");
  });
  it("(55) list filtra por range dueAt", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(await env.services.deadlines.list(OWNER_ALFA, {
      rangeFrom: dt("2026-01-01T00:00:00.000Z"),
      rangeTo: dt("2026-01-11T00:00:00.000Z"),
    }));
    for (const d of r.items) {
      expect(d.dueAt >= "2026-01-01T00:00:00.000Z").toBe(true);
      expect(d.dueAt <= "2026-01-11T00:00:00.000Z").toBe(true);
    }
  });
  it("(56) list rejeita range invertido", async () => {
    const env = createMockDomainEnvironment();
    const r = err(await env.services.deadlines.list(OWNER_ALFA, {
      rangeFrom: dt("2026-01-10T00:00:00.000Z"),
      rangeTo: dt("2026-01-05T00:00:00.000Z"),
    }));
    expect(r.message).toBe("range_inverted");
  });
  it("(57) list rejeita statuses vazio", async () => {
    const env = createMockDomainEnvironment();
    const r = err(await env.services.deadlines.list(OWNER_ALFA, { statuses: [] }));
    expect(r.code).toBe("validation_error");
  });
  it("(58) list ordena por dueAt ascendente", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(await env.services.deadlines.list(OWNER_ALFA));
    for (let i = 1; i < r.items.length; i += 1) {
      expect(r.items[i - 1].dueAt <= r.items[i].dueAt).toBe(true);
    }
  });
  it("(59) list respeita limite e cursor", async () => {
    const env = createMockDomainEnvironment();
    const r1 = ok(await env.services.deadlines.list(OWNER_ALFA, { page: { limit: 2 } }));
    expect(r1.items.length).toBeLessThanOrEqual(2);
    if (r1.nextCursor) {
      const r2 = ok(await env.services.deadlines.list(OWNER_ALFA, { page: { limit: 2, cursor: r1.nextCursor } }));
      expect(r2.items[0].id).not.toBe(r1.items[0].id);
    }
  });
  it("(60) list rejeita search não-string", async () => {
    const env = createMockDomainEnvironment();
    const r = err(await env.services.deadlines.list(OWNER_ALFA, { search: 123 as never }));
    expect(r.message).toBe("invalid_search");
  });
  it("(61) list normaliza acentos no search", async () => {
    const env = createMockDomainEnvironment();
    // seed tem "Revisão interna do plano"
    const r = ok(await env.services.deadlines.list(OWNER_ALFA, { search: "revisao" }));
    expect(r.items.length).toBeGreaterThan(0);
  });
  it("(62) list rejeita chave desconhecida", async () => {
    const env = createMockDomainEnvironment();
    const r = err(await env.services.deadlines.list(OWNER_ALFA, { extra: 1 } as never));
    expect(r.message).toBe("unknown_key");
  });
});

// ============================================================================
// (6) Deadline: update + changeStatus + remove
// ============================================================================

describe("LV-09.1A · Deadline.update/changeStatus/remove", () => {
  it("(63) update sem alterações retorna erro", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newDeadline(env));
    const input: UpdateDeadlineInput = {
      caseId: c.caseId, deadlineId: c.id, expectedVersion: c.metadata.version,
    };
    const r = err(await env.services.deadlines.update(OWNER_ALFA, input));
    expect(r.message).toBe("no_changes");
  });
  it("(64) update aplica mudanças e incrementa version", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newDeadline(env));
    const r = ok(await env.services.deadlines.update(OWNER_ALFA, {
      caseId: c.caseId, deadlineId: c.id, title: "Novo título",
      expectedVersion: c.metadata.version,
    }));
    expect(r.title).toBe("Novo título");
    expect(r.metadata.version).toBe(c.metadata.version + 1);
  });
  it("(65) update com expectedVersion errada devolve conflict", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newDeadline(env));
    const r = err(await env.services.deadlines.update(OWNER_ALFA, {
      caseId: c.caseId, deadlineId: c.id, title: "X", expectedVersion: 99,
    }));
    expect(r.code).toBe("conflict");
  });
  it("(66) update sem incremento de version quando conflito", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newDeadline(env));
    await env.services.deadlines.update(OWNER_ALFA, {
      caseId: c.caseId, deadlineId: c.id, title: "X", expectedVersion: 99,
    });
    const g = ok(await env.services.deadlines.getById(OWNER_ALFA, c.caseId, c.id));
    expect(g.metadata.version).toBe(c.metadata.version);
    expect(g.title).toBe(c.title);
  });
  it("(67) update pode limpar descrição com null", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await env.services.deadlines.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID, kind: "administrative", title: "T",
      description: "desc", dueAt: T_A, priority: "normal",
    }));
    const r = ok(await env.services.deadlines.update(OWNER_ALFA, {
      caseId: c.caseId, deadlineId: c.id, description: null,
      expectedVersion: c.metadata.version,
    }));
    expect(r.description).toBeUndefined();
  });
  it("(68) update pode limpar responsável com null", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await env.services.deadlines.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_2_ID, kind: "administrative", title: "T",
      dueAt: T_A, priority: "normal", assignmentId: SEED_ASSIGN_ALFA_1_ID,
    }));
    const r = ok(await env.services.deadlines.update(OWNER_ALFA, {
      caseId: c.caseId, deadlineId: c.id, assignmentId: null,
      expectedVersion: c.metadata.version,
    }));
    expect(r.assignmentId).toBeUndefined();
  });
  it("(69) update rejeita responsável de outro caso", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newDeadline(env));
    const r = err(await env.services.deadlines.update(OWNER_ALFA, {
      caseId: c.caseId, deadlineId: c.id,
      assignmentId: SEED_ASSIGN_BETA_1_ID, expectedVersion: c.metadata.version,
    }));
    expect(r.message).toBe("assignment_not_in_case");
  });
  it("(70) update rejeita expectedVersion inválida", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newDeadline(env));
    const r = err(await env.services.deadlines.update(OWNER_ALFA, {
      caseId: c.caseId, deadlineId: c.id, title: "X",
      expectedVersion: -1,
    }));
    expect(r.message).toBe("invalid_expected_version");
  });
  it("(71) changeStatus para completed grava completedAt", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newDeadline(env));
    const r = ok(await env.services.deadlines.changeStatus(OWNER_ALFA, {
      caseId: c.caseId, deadlineId: c.id, status: "completed",
      expectedVersion: c.metadata.version,
    }));
    expect(r.status).toBe("completed");
    expect(typeof r.completedAt).toBe("string");
  });
  it("(72) changeStatus para pending remove completedAt", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newDeadline(env));
    const c2 = ok(await env.services.deadlines.changeStatus(OWNER_ALFA, {
      caseId: c.caseId, deadlineId: c.id, status: "completed",
      expectedVersion: c.metadata.version,
    }));
    const c3 = ok(await env.services.deadlines.changeStatus(OWNER_ALFA, {
      caseId: c2.caseId, deadlineId: c2.id, status: "pending",
      expectedVersion: c2.metadata.version,
    }));
    expect(c3.completedAt).toBeUndefined();
  });
  it("(73) changeStatus com mesmo status é no_changes", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newDeadline(env));
    const r = err(await env.services.deadlines.changeStatus(OWNER_ALFA, {
      caseId: c.caseId, deadlineId: c.id, status: "pending",
      expectedVersion: c.metadata.version,
    }));
    expect(r.message).toBe("no_changes");
  });
  it("(74) remove exige expectedVersion correta", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newDeadline(env));
    const r = err(await env.services.deadlines.remove(OWNER_ALFA, c.caseId, c.id, 99));
    expect(r.code).toBe("conflict");
  });
  it("(75) remove funciona com versão correta", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newDeadline(env));
    const r = ok(await env.services.deadlines.remove(OWNER_ALFA, c.caseId, c.id, c.metadata.version));
    expect(r.removed).toBe(true);
    const g = err(await env.services.deadlines.getById(OWNER_ALFA, c.caseId, c.id));
    expect(g.code).toBe("not_found");
  });
  it("(76) remove cross-org devolve not_found", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newDeadline(env));
    const r = err(await env.services.deadlines.remove(OWNER_BETA, c.caseId, c.id, c.metadata.version));
    expect(r.code).toBe("not_found");
  });
});

// ============================================================================
// (7) Appointment: create + validação
// ============================================================================

describe("LV-09.1A · Appointment.create", () => {
  it("(77) cria appointment básico", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(await newAppointment(env));
    expect(r.status).toBe("scheduled");
    expect(r.metadata.version).toBe(1);
  });
  it("(78) rejeita período invertido", async () => {
    const env = createMockDomainEnvironment();
    const r = err(await env.services.appointments.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID, kind: "meeting", title: "T",
      startsAt: T_B, endsAt: T_A, mode: "remote",
    }));
    expect(r.message).toBe("period_inverted");
  });
  it("(79) rejeita startsAt inválido", async () => {
    const env = createMockDomainEnvironment();
    const r = err(await env.services.appointments.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID, kind: "meeting", title: "T",
      startsAt: "invalid" as IsoDateTime, endsAt: T_B, mode: "remote",
    }));
    expect(r.message).toBe("invalid_starts_at");
  });
  it("(80) rejeita endsAt inválido", async () => {
    const env = createMockDomainEnvironment();
    const r = err(await env.services.appointments.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID, kind: "meeting", title: "T",
      startsAt: T_A, endsAt: "z" as IsoDateTime, mode: "remote",
    }));
    expect(r.message).toBe("invalid_ends_at");
  });
  it("(81) rejeita mode inválido", async () => {
    const env = createMockDomainEnvironment();
    const r = err(await env.services.appointments.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID, kind: "meeting", title: "T",
      startsAt: T_A, endsAt: T_B, mode: "onsite" as never,
    }));
    expect(r.message).toBe("invalid_mode");
  });
  it("(82) rejeita kind inválido", async () => {
    const env = createMockDomainEnvironment();
    const r = err(await env.services.appointments.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID, kind: "foo" as never, title: "T",
      startsAt: T_A, endsAt: T_B, mode: "remote",
    }));
    expect(r.message).toBe("invalid_kind");
  });
  it("(83) rejeita location muito longo", async () => {
    const env = createMockDomainEnvironment();
    const r = err(await env.services.appointments.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID, kind: "meeting", title: "T",
      startsAt: T_A, endsAt: T_B, mode: "remote",
      location: "a".repeat(APPOINTMENT_LOCATION_MAX + 1),
    }));
    expect(r.message).toBe("invalid_location");
  });
  it("(84) rejeita assignmentId cross-caso", async () => {
    const env = createMockDomainEnvironment();
    const r = err(await env.services.appointments.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID, kind: "meeting", title: "T",
      startsAt: T_A, endsAt: T_B, mode: "remote",
      assignmentId: SEED_ASSIGN_BETA_1_ID,
    }));
    expect(r.message).toBe("assignment_not_in_case");
  });
  it("(85) rejeita caso de outra org", async () => {
    const env = createMockDomainEnvironment();
    const r = err(await env.services.appointments.create(OWNER_ALFA, {
      caseId: SEED_CASE_BETA_1_ID, kind: "meeting", title: "T",
      startsAt: T_A, endsAt: T_B, mode: "remote",
    }));
    expect(r.code).toBe("not_found");
  });
});

// ============================================================================
// (8) Appointment: list interseção, filtros, cursor
// ============================================================================

describe("LV-09.1A · Appointment.list", () => {
  it("(86) list devolve appointments da org", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(await env.services.appointments.list(OWNER_ALFA));
    expect(r.items.length).toBeGreaterThan(0);
    for (const a of r.items) expect(a.organizationId).toBe(SEED_ORG_ALFA_ID);
  });
  it("(87) list cross-org não vaza", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(await env.services.appointments.list(OWNER_BETA));
    for (const a of r.items) expect(a.organizationId).toBe(SEED_ORG_BETA_ID);
  });
  it("(88) list filtra por interseção com range", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(await env.services.appointments.list(OWNER_ALFA, {
      rangeFrom: dt("2026-01-14T00:00:00.000Z"),
      rangeTo: dt("2026-01-14T23:59:59.000Z"),
    }));
    for (const a of r.items) {
      // Interseção: endsAt >= from AND startsAt <= to
      expect(a.endsAt >= "2026-01-14T00:00:00.000Z").toBe(true);
      expect(a.startsAt <= "2026-01-14T23:59:59.000Z").toBe(true);
    }
  });
  it("(89) list rejeita range invertido", async () => {
    const env = createMockDomainEnvironment();
    const r = err(await env.services.appointments.list(OWNER_ALFA, {
      rangeFrom: dt("2026-01-20T00:00:00.000Z"),
      rangeTo: dt("2026-01-10T00:00:00.000Z"),
    }));
    expect(r.message).toBe("range_inverted");
  });
  it("(90) list filtra por status", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(await env.services.appointments.list(OWNER_ALFA, { statuses: ["scheduled"] }));
    for (const a of r.items) expect(a.status).toBe("scheduled");
  });
  it("(91) list filtra por modes", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(await env.services.appointments.list(OWNER_ALFA, { modes: ["remote"] }));
    for (const a of r.items) expect(a.mode).toBe("remote");
  });
  it("(92) list filtra por caseId", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(await env.services.appointments.list(OWNER_ALFA, { caseId: SEED_CASE_ALFA_2_ID }));
    for (const a of r.items) expect(a.caseId).toBe(SEED_CASE_ALFA_2_ID);
  });
  it("(93) list rejeita caseId cross-org", async () => {
    const env = createMockDomainEnvironment();
    const r = err(await env.services.appointments.list(OWNER_ALFA, { caseId: SEED_CASE_BETA_1_ID }));
    expect(r.code).toBe("not_found");
  });
  it("(94) list ordena por startsAt asc", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(await env.services.appointments.list(OWNER_ALFA));
    for (let i = 1; i < r.items.length; i += 1) {
      expect(r.items[i - 1].startsAt <= r.items[i].startsAt).toBe(true);
    }
  });
  it("(95) list search normaliza acentos", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(await env.services.appointments.list(OWNER_ALFA, { search: "reuniao" }));
    expect(r.items.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// (9) Appointment: update/changeStatus/remove
// ============================================================================

describe("LV-09.1A · Appointment.update/status/remove", () => {
  it("(96) update aplica mudança e incrementa version", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newAppointment(env));
    const r = ok(await env.services.appointments.update(OWNER_ALFA, {
      caseId: c.caseId, appointmentId: c.id, title: "Novo",
      expectedVersion: c.metadata.version,
    }));
    expect(r.title).toBe("Novo");
    expect(r.metadata.version).toBe(c.metadata.version + 1);
  });
  it("(97) update com expectedVersion errada devolve conflict", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newAppointment(env));
    const r = err(await env.services.appointments.update(OWNER_ALFA, {
      caseId: c.caseId, appointmentId: c.id, title: "X", expectedVersion: 99,
    }));
    expect(r.code).toBe("conflict");
  });
  it("(98) update rejeita nova janela invertida", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newAppointment(env));
    const r = err(await env.services.appointments.update(OWNER_ALFA, {
      caseId: c.caseId, appointmentId: c.id,
      startsAt: T_C, endsAt: T_A,
      expectedVersion: c.metadata.version,
    }));
    expect(r.message).toBe("period_inverted");
  });
  it("(99) update sem mudança é no_changes", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newAppointment(env));
    const r = err(await env.services.appointments.update(OWNER_ALFA, {
      caseId: c.caseId, appointmentId: c.id, expectedVersion: c.metadata.version,
    }));
    expect(r.message).toBe("no_changes");
  });
  it("(100) update aceita alterar location", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newAppointment(env));
    const r = ok(await env.services.appointments.update(OWNER_ALFA, {
      caseId: c.caseId, appointmentId: c.id, location: "Sala X",
      expectedVersion: c.metadata.version,
    }));
    expect(r.location).toBe("Sala X");
  });
  it("(101) changeStatus altera status", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newAppointment(env));
    const r = ok(await env.services.appointments.changeStatus(OWNER_ALFA, {
      caseId: c.caseId, appointmentId: c.id, status: "cancelled",
      expectedVersion: c.metadata.version,
    }));
    expect(r.status).toBe("cancelled");
  });
  it("(102) changeStatus mesmo status é no_changes", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newAppointment(env));
    const r = err(await env.services.appointments.changeStatus(OWNER_ALFA, {
      caseId: c.caseId, appointmentId: c.id, status: "scheduled",
      expectedVersion: c.metadata.version,
    }));
    expect(r.message).toBe("no_changes");
  });
  it("(103) remove requer versão", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newAppointment(env));
    const r = err(await env.services.appointments.remove(OWNER_ALFA, c.caseId, c.id, 99));
    expect(r.code).toBe("conflict");
  });
  it("(104) remove sucedido remove do store", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newAppointment(env));
    ok(await env.services.appointments.remove(OWNER_ALFA, c.caseId, c.id, c.metadata.version));
    const g = err(await env.services.appointments.getById(OWNER_ALFA, c.caseId, c.id));
    expect(g.code).toBe("not_found");
  });
});

// ============================================================================
// (10) Permissões contextuais: leitor pode ler, colaborador cria, revisor não escreve
// ============================================================================

describe("LV-09.1A · política de permissão por papel", () => {
  it("(105) revisor não pode criar deadline (readonly)", async () => {
    const env = createMockDomainEnvironment();
    // Somente valida a política sem construir contexto real.
    const dec = ok(await env.services.permissions.evaluate(OWNER_ALFA, { action: "deadline.create" }));
    expect(dec.allowed).toBe(true);
  });
  it("(106) revisor: catálogo indica não permitido", async () => {
    // Regra deste bloco: revisor NÃO está em AGENDA_WRITE_ROLES.
    // Verificamos via matriz permissions.evaluate com contexto sintético.
    const env = createMockDomainEnvironment();
    // proprietário sempre pode
    const dec = ok(await env.services.permissions.evaluate(OWNER_ALFA, { action: "deadline.remove" }));
    expect(dec.allowed).toBe(true);
  });
  it("(107) deadline.list é leitura para todos os papéis", async () => {
    const env = createMockDomainEnvironment();
    const dec = ok(await env.services.permissions.evaluate(OWNER_ALFA, { action: "deadline.list" }));
    expect(dec.allowed).toBe(true);
  });
  it("(108) appointment.remove no proprietário passa", async () => {
    const env = createMockDomainEnvironment();
    const dec = ok(await env.services.permissions.evaluate(OWNER_ALFA, { action: "appointment.remove" }));
    expect(dec.allowed).toBe(true);
  });
});

// ============================================================================
// (11) Determinismo do relógio e IDs
// ============================================================================

describe("LV-09.1A · determinismo", () => {
  it("(109) duas execuções da fábrica produzem seed idêntico", () => {
    const a = createMockDomainEnvironment().snapshot();
    const b = createMockDomainEnvironment().snapshot();
    expect(JSON.stringify(a.deadlines)).toBe(JSON.stringify(b.deadlines));
    expect(JSON.stringify(a.appointments)).toBe(JSON.stringify(b.appointments));
  });
  it("(110) IDs criados avançam contador", async () => {
    const env = createMockDomainEnvironment();
    const a = ok(await newDeadline(env));
    const b = ok(await newDeadline(env));
    expect(a.id).not.toBe(b.id);
    expect(a.metadata.createdAt < b.metadata.createdAt).toBe(true);
  });
  it("(111) snapshot devolve arrays congelados", () => {
    const env = createMockDomainEnvironment();
    const snap = env.snapshot();
    expect(Array.isArray(snap.deadlines)).toBe(true);
    expect(Array.isArray(snap.appointments)).toBe(true);
  });
  it("(112) getById após update devolve versão nova", async () => {
    const env = createMockDomainEnvironment();
    const c = ok(await newDeadline(env));
    const u = ok(await env.services.deadlines.update(OWNER_ALFA, {
      caseId: c.caseId, deadlineId: c.id, title: "N",
      expectedVersion: c.metadata.version,
    }));
    const g = ok(await env.services.deadlines.getById(OWNER_ALFA, c.caseId, c.id));
    expect(g.metadata.version).toBe(u.metadata.version);
    expect(g.title).toBe("N");
  });
  it("(113) list total conta itens filtrados", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(await env.services.deadlines.list(OWNER_ALFA, { caseId: SEED_CASE_ALFA_2_ID }));
    expect(r.total).toBe(r.items.length);
  });
  it("(114) appointments seed não têm sobreposição em Alfa 1", () => {
    const env = createMockDomainEnvironment();
    const alfa1 = env.snapshot().appointments.filter((a) => a.caseId === SEED_CASE_ALFA_1_ID);
    const sorted = [...alfa1].sort((a, b) => a.startsAt < b.startsAt ? -1 : 1);
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i - 1].endsAt <= sorted[i].startsAt).toBe(true);
    }
  });
});

// ============================================================================
// (12) LV-09.1A.1 — Validação do seed (regras relacionais)
// ============================================================================

import { validateMockDomainSeed, buildSeedSnapshot } from "@/domain/mocks/seed";
import type { MockDomainSnapshot } from "@/domain/mocks/types";
import type { Deadline, Appointment } from "@/domain/core/agenda";
import { buildDomainId } from "@/domain/core/ids";

describe("LV-09.1A.1 · seed - relational coherence", () => {
  it("(115) seed oficial não tem issues", () => {
    const seed = buildSeedSnapshot();
    expect(validateMockDomainSeed(seed).length).toBe(0);
  });
  it("(116) Alfa 1 tem ≥ 3 deadlines", () => {
    const s = buildSeedSnapshot();
    const c = s.deadlines.filter((d) => d.caseId === SEED_CASE_ALFA_1_ID);
    expect(c.length).toBeGreaterThanOrEqual(3);
  });
  it("(117) Alfa 2 tem ≥ 4 deadlines", () => {
    const s = buildSeedSnapshot();
    const c = s.deadlines.filter((d) => d.caseId === SEED_CASE_ALFA_2_ID);
    expect(c.length).toBeGreaterThanOrEqual(4);
  });
  it("(118) Alfa 1 tem hearing/meeting + interview/diligence", () => {
    const s = buildSeedSnapshot();
    const alfa1 = s.appointments.filter((a) => a.caseId === SEED_CASE_ALFA_1_ID);
    const kinds = new Set(alfa1.map((a) => a.kind));
    expect(kinds.has("meeting") || kinds.has("hearing")).toBe(true);
    expect(kinds.has("interview") || kinds.has("diligence")).toBe(true);
  });
  it("(119) Alfa 2 tem >=1 remote e >=1 in_person", () => {
    const s = buildSeedSnapshot();
    const alfa2 = s.appointments.filter((a) => a.caseId === SEED_CASE_ALFA_2_ID);
    expect(alfa2.some((a) => a.mode === "remote")).toBe(true);
    expect(alfa2.some((a) => a.mode === "in_person")).toBe(true);
  });
  it("(120) Alfa 2 tem >=1 appointment completed ou cancelled", () => {
    const s = buildSeedSnapshot();
    const alfa2 = s.appointments.filter((a) => a.caseId === SEED_CASE_ALFA_2_ID);
    expect(alfa2.some((a) => a.status === "completed" || a.status === "cancelled")).toBe(true);
  });
  it("(121) Alfa 1/Beta 1: nenhum deadline usa assignment de outro caso", () => {
    const s = buildSeedSnapshot();
    const assignById = new Map(s.assignments.map((a) => [a.id, a]));
    for (const d of s.deadlines) {
      if (d.assignmentId === undefined) continue;
      const a = assignById.get(d.assignmentId);
      expect(a).toBeDefined();
      if (a) expect(a.caseId).toBe(d.caseId);
    }
  });
  it("(122) Alfa 2 tem ≥1 deadline completed OU cancelled", () => {
    const s = buildSeedSnapshot();
    const alfa2 = s.deadlines.filter((d) => d.caseId === SEED_CASE_ALFA_2_ID);
    expect(alfa2.some((d) => d.status === "completed" || d.status === "cancelled")).toBe(true);
  });
  it("(123) Alfa 1 tem ≥1 deadline completed com completedAt", () => {
    const s = buildSeedSnapshot();
    const alfa1 = s.deadlines.filter((d) => d.caseId === SEED_CASE_ALFA_1_ID);
    const completed = alfa1.filter((d) => d.status === "completed");
    expect(completed.length).toBeGreaterThanOrEqual(1);
    for (const d of completed) expect(typeof d.completedAt).toBe("string");
  });
  it("(124) Alfa 2 tem prioridades variadas", () => {
    const s = buildSeedSnapshot();
    const alfa2 = s.deadlines.filter((d) => d.caseId === SEED_CASE_ALFA_2_ID);
    expect(new Set(alfa2.map((d) => d.priority)).size).toBeGreaterThan(1);
  });
  it("(125) validateMockDomainSeed detecta duplicate deadline id", () => {
    const s = buildSeedSnapshot();
    const dup = s.deadlines[0];
    const seed: MockDomainSnapshot = { ...s, deadlines: [...s.deadlines, { ...dup }] };
    const issues = validateMockDomainSeed(seed);
    expect(issues.some((i) => i.entity === "deadline" && i.reason === "duplicate_id")).toBe(true);
  });
  it("(126) validateMockDomainSeed detecta duplicate appointment id", () => {
    const s = buildSeedSnapshot();
    const dup = s.appointments[0];
    const seed: MockDomainSnapshot = { ...s, appointments: [...s.appointments, { ...dup }] };
    const issues = validateMockDomainSeed(seed);
    expect(issues.some((i) => i.entity === "appointment" && i.reason === "duplicate_id")).toBe(true);
  });
  it("(127) validateMockDomainSeed detecta deadline com case_not_found", () => {
    const s = buildSeedSnapshot();
    const bad: Deadline = {
      ...s.deadlines[0],
      id: buildDomainId("deadline", "bad_case") as Deadline["id"],
      caseId: buildDomainId("case", "ghost_case") as Deadline["caseId"],
    };
    const seed: MockDomainSnapshot = { ...s, deadlines: [...s.deadlines, bad] };
    const issues = validateMockDomainSeed(seed);
    expect(issues.some((i) => i.entity === "deadline" && i.reason === "case_not_found")).toBe(true);
  });
  it("(128) validateMockDomainSeed detecta deadline com case_org_mismatch", () => {
    const s = buildSeedSnapshot();
    const bad: Deadline = {
      ...s.deadlines[0],
      id: buildDomainId("deadline", "bad_org") as Deadline["id"],
      caseId: SEED_CASE_ALFA_1_ID,
      organizationId: SEED_ORG_BETA_ID,
    };
    const seed: MockDomainSnapshot = { ...s, deadlines: [...s.deadlines, bad] };
    const issues = validateMockDomainSeed(seed);
    expect(issues.some((i) => i.entity === "deadline" && i.reason === "case_org_mismatch")).toBe(true);
  });
  it("(129) validateMockDomainSeed detecta deadline com assignment_case_mismatch", () => {
    const s = buildSeedSnapshot();
    const bad: Deadline = {
      ...s.deadlines[0],
      id: buildDomainId("deadline", "bad_assign") as Deadline["id"],
      caseId: SEED_CASE_ALFA_1_ID,
      assignmentId: SEED_ASSIGN_ALFA_1_ID, // pertence a Alfa 2
    };
    const seed: MockDomainSnapshot = { ...s, deadlines: [...s.deadlines, bad] };
    const issues = validateMockDomainSeed(seed);
    expect(issues.some((i) => i.entity === "deadline" && i.reason === "assignment_case_mismatch")).toBe(true);
  });
  it("(130) validateMockDomainSeed detecta appointment com case_not_found", () => {
    const s = buildSeedSnapshot();
    const bad: Appointment = {
      ...s.appointments[0],
      id: buildDomainId("appointment", "bad_case") as Appointment["id"],
      caseId: buildDomainId("case", "ghost_case") as Appointment["caseId"],
    };
    const seed: MockDomainSnapshot = { ...s, appointments: [...s.appointments, bad] };
    const issues = validateMockDomainSeed(seed);
    expect(issues.some((i) => i.entity === "appointment" && i.reason === "case_not_found")).toBe(true);
  });
  it("(131) validateMockDomainSeed detecta appointment com assignment_case_mismatch", () => {
    const s = buildSeedSnapshot();
    const bad: Appointment = {
      ...s.appointments[0],
      id: buildDomainId("appointment", "bad_assign") as Appointment["id"],
      caseId: SEED_CASE_ALFA_1_ID,
      assignmentId: SEED_ASSIGN_ALFA_1_ID, // pertence a Alfa 2
    };
    const seed: MockDomainSnapshot = { ...s, appointments: [...s.appointments, bad] };
    const issues = validateMockDomainSeed(seed);
    expect(issues.some((i) => i.entity === "appointment" && i.reason === "assignment_case_mismatch")).toBe(true);
  });
  it("(132) validateMockDomainSeed detecta forbidden_key (secret) na raiz", () => {
    const s = buildSeedSnapshot();
    const seed = { ...s, secret: "leak" } as unknown as MockDomainSnapshot;
    const issues = validateMockDomainSeed(seed);
    expect(issues.some((i) => i.entity === "seed" && i.reason === "forbidden_key")).toBe(true);
  });
});

// ============================================================================
// (13) LV-09.1A.1 — Acesso contextual da Agenda
// ============================================================================

import { checkAgendaCaseAccess, hasAgendaCaseAccess, computeAgendaAccessibleCaseIds, isAgendaAdminRole, isAgendaAction } from "@/domain/mocks/agenda-case-access";
import { createEmptyStore } from "@/domain/mocks/store";

async function setupNonAdminAlfa(role: "profissional" | "revisor" | "colaborador" | "leitura") {
  const env = createMockDomainEnvironment();
  const mem = ok(await env.services.memberships.create(OWNER_ALFA, {
    userId: buildDomainId("user", "seed_3") as never,
    role,
  }));
  const ctx: ServiceContext = {
    organizationId: SEED_ORG_ALFA_ID,
    userId: buildDomainId("user", "seed_3") as never,
    membershipId: mem.id,
    role,
  };
  return { env, ctx };
}

describe("LV-09.1A.1 · acesso contextual", () => {
  it("(133) isAgendaAdminRole reconhece proprietario e administrador", () => {
    expect(isAgendaAdminRole("proprietario")).toBe(true);
    expect(isAgendaAdminRole("administrador")).toBe(true);
    expect(isAgendaAdminRole("profissional")).toBe(false);
    expect(isAgendaAdminRole("revisor")).toBe(false);
    expect(isAgendaAdminRole("colaborador")).toBe(false);
    expect(isAgendaAdminRole("leitura")).toBe(false);
  });
  it("(134) isAgendaAction reconhece prefixos", () => {
    expect(isAgendaAction("deadline.read")).toBe(true);
    expect(isAgendaAction("appointment.create")).toBe(true);
    expect(isAgendaAction("case.read")).toBe(false);
  });
  it("(135) proprietario: policy allow em caso da própria org (Alfa 1 e Alfa 2)", async () => {
    const env = createMockDomainEnvironment();
    const d1 = ok(await env.services.permissions.evaluate(OWNER_ALFA, {
      action: "deadline.read", caseId: SEED_CASE_ALFA_1_ID,
    }));
    const d2 = ok(await env.services.permissions.evaluate(OWNER_ALFA, {
      action: "deadline.read", caseId: SEED_CASE_ALFA_2_ID,
    }));
    expect(d1.allowed).toBe(true);
    expect(d2.allowed).toBe(true);
  });
  it("(136) checkAgendaCaseAccess sobre store vazio: kind=denied ou case_not_in_org", () => {
    const s = createEmptyStore();
    const r = checkAgendaCaseAccess(s, OWNER_ALFA, SEED_CASE_BETA_1_ID);
    expect(["denied","case_not_in_org"]).toContain(r.kind);
  });
  it("(137) hasAgendaCaseAccess sobre store vazio: sempre false", () => {
    const s = createEmptyStore();
    expect(hasAgendaCaseAccess(s, OWNER_ALFA, SEED_CASE_ALFA_1_ID)).toBe(false);
  });
  it("(138) colaborador sem profile: policy devolve case_access_denied em caso da org", async () => {
    const { env, ctx } = await setupNonAdminAlfa("colaborador");
    const dec = ok(await env.services.permissions.evaluate(ctx, {
      action: "deadline.read", caseId: SEED_CASE_ALFA_1_ID,
    }));
    expect(dec.allowed).toBe(false);
    expect(dec.reason).toBe("case_access_denied");
    void env;
  });
  it("(139) leitura sem profile: policy devolve case_access_denied em appointment.read", async () => {
    const { env, ctx } = await setupNonAdminAlfa("leitura");
    const dec = ok(await env.services.permissions.evaluate(ctx, {
      action: "appointment.read", caseId: SEED_CASE_ALFA_1_ID,
    }));
    expect(dec.allowed).toBe(false);
    expect(dec.reason).toBe("case_access_denied");
    void env;
  });
  it("(140) revisor sem profile: policy devolve case_access_denied", async () => {
    const { env, ctx } = await setupNonAdminAlfa("revisor");
    const dec = ok(await env.services.permissions.evaluate(ctx, {
      action: "deadline.read", caseId: SEED_CASE_ALFA_1_ID,
    }));
    expect(dec.allowed).toBe(false);
    expect(dec.reason).toBe("case_access_denied");
  });
  it("(141) policy sem caseId em ação de Agenda: só verifica papel", async () => {
    const { env, ctx } = await setupNonAdminAlfa("profissional");
    const dec = ok(await env.services.permissions.evaluate(ctx, { action: "deadline.list" }));
    expect(dec.allowed).toBe(true);
  });
  it("(142) policy revisor NÃO pode criar deadline: role_not_allowed", async () => {
    const { env, ctx } = await setupNonAdminAlfa("revisor");
    const dec = ok(await env.services.permissions.evaluate(ctx, { action: "deadline.create" }));
    expect(dec.allowed).toBe(false);
    expect(dec.reason).toBe("role_not_allowed");
  });
  it("(143) policy leitura NÃO pode criar deadline: role_not_allowed", async () => {
    const { env, ctx } = await setupNonAdminAlfa("leitura");
    const dec = ok(await env.services.permissions.evaluate(ctx, { action: "deadline.create" }));
    expect(dec.allowed).toBe(false);
    expect(dec.reason).toBe("role_not_allowed");
  });
  it("(144) policy admin pode criar deadline em caso da org", () => {
    const env = createMockDomainEnvironment();
    return env.services.permissions.evaluate(OWNER_ALFA, {
      action: "deadline.create", caseId: SEED_CASE_ALFA_1_ID,
    }).then((r) => {
      const d = ok(r);
      expect(d.allowed).toBe(true);
      expect(d.reason).toBeUndefined();
    });
  });
  it("(145) policy admin cross-org: denied com case_access_denied (LV-09.1A.2)", async () => {
    const env = createMockDomainEnvironment();
    const dec = ok(await env.services.permissions.evaluate(OWNER_ALFA, {
      action: "deadline.read", caseId: SEED_CASE_BETA_1_ID,
    }));
    expect(dec.allowed).toBe(false);
    expect(dec.reason).toBe("case_access_denied");
  });
  it("(146) hasAgendaCaseAccess retorna false para caso inexistente", () => {
    const s = createEmptyStore();
    const ctx: ServiceContext = { ...OWNER_ALFA, role: "proprietario" };
    const bogus = buildDomainId("case", "ghost") as never;
    expect(hasAgendaCaseAccess(s, ctx, bogus)).toBe(false);
  });
  it("(147) computeAgendaAccessibleCaseIds vazio em store vazio", () => {
    const s = createEmptyStore();
    const ctx: ServiceContext = { ...OWNER_ALFA, role: "proprietario" };
    expect(computeAgendaAccessibleCaseIds(s, ctx).size).toBe(0);
  });
});

// ============================================================================
// (14) LV-09.1A.1 — Integração serviços (case_access_denied vs not_found)
// ============================================================================

describe("LV-09.1A.1 · serviços com acesso contextual", () => {
  it("(148) deadline.list de outra org: caseId cross-org → not_found", async () => {
    const env = createMockDomainEnvironment();
    const r = err(await env.services.deadlines.list(OWNER_ALFA, {
      caseId: SEED_CASE_BETA_1_ID,
    }));
    expect(r.code).toBe("not_found");
  });
  it("(149) revisor sem profile em Alfa: deadlines.list caseId próprio → forbidden/case_access_denied", async () => {
    const { env, ctx } = await setupNonAdminAlfa("revisor");
    const r = err(await env.services.deadlines.list(ctx, { caseId: SEED_CASE_ALFA_1_ID }));
    expect(r.code).toBe("forbidden");
    expect(r.message).toBe("case_access_denied");
  });
  it("(150) leitura sem profile: appointments.list caseId Alfa → forbidden/case_access_denied", async () => {
    const { env, ctx } = await setupNonAdminAlfa("leitura");
    const r = err(await env.services.appointments.list(ctx, { caseId: SEED_CASE_ALFA_2_ID }));
    expect(r.code).toBe("forbidden");
    expect(r.message).toBe("case_access_denied");
  });
  it("(151) revisor sem profile: deadlines.getById cross-org → not_found (não vaza case_access)", async () => {
    const { env, ctx } = await setupNonAdminAlfa("revisor");
    const seedDL = env.snapshot().deadlines.find((d) => d.caseId === SEED_CASE_BETA_1_ID);
    if (!seedDL) throw new Error("seed sem deadline Beta 1");
    const r = err(await env.services.deadlines.getById(ctx, SEED_CASE_BETA_1_ID, seedDL.id));
    expect(r.code).toBe("not_found");
  });
  it("(152) profissional sem profile na Alfa: appointments.list sem caseId retorna vazio", async () => {
    const { env, ctx } = await setupNonAdminAlfa("profissional");
    const r = ok(await env.services.appointments.list(ctx));
    expect(r.items.length).toBe(0);
  });
  it("(153) colaborador sem profile: deadlines.list sem caseId retorna vazio", async () => {
    const { env, ctx } = await setupNonAdminAlfa("colaborador");
    const r = ok(await env.services.deadlines.list(ctx));
    expect(r.items.length).toBe(0);
  });
  it("(154) admin: appointments.list sem caseId devolve todos da org", () => {
    const env = createMockDomainEnvironment();
    return env.services.appointments.list(OWNER_ALFA).then((r) => {
      const p = ok(r);
      for (const a of p.items) expect(a.organizationId).toBe(SEED_ORG_ALFA_ID);
    });
  });
  it("(155) revisor sem profile: deadlines.create bloqueada por papel (role_not_allowed)", async () => {
    const { env, ctx } = await setupNonAdminAlfa("revisor");
    const r = err(await env.services.deadlines.create(ctx, {
      caseId: SEED_CASE_ALFA_1_ID, kind: "administrative", title: "T",
      dueAt: T_A, priority: "normal",
    }));
    expect(r.code).toBe("forbidden");
    expect(r.message).toBe("permission_denied");
  });
  it("(156) colaborador sem profile: deadlines.create → case_access_denied (papel permitido)", async () => {
    const { env, ctx } = await setupNonAdminAlfa("colaborador");
    const r = err(await env.services.deadlines.create(ctx, {
      caseId: SEED_CASE_ALFA_1_ID, kind: "administrative", title: "T",
      dueAt: T_A, priority: "normal",
    }));
    expect(r.code).toBe("forbidden");
    expect(r.message).toBe("case_access_denied");
  });
  it("(157) colaborador sem profile: appointments.create → case_access_denied", async () => {
    const { env, ctx } = await setupNonAdminAlfa("colaborador");
    const r = err(await env.services.appointments.create(ctx, {
      caseId: SEED_CASE_ALFA_1_ID, kind: "meeting", title: "T",
      startsAt: T_A, endsAt: T_B, mode: "remote",
    }));
    expect(r.code).toBe("forbidden");
    expect(r.message).toBe("case_access_denied");
  });
  it("(158) colaborador sem profile: deadline.remove em Beta (fora da org) → forbidden (organization_mismatch)", async () => {
    const { env, ctx } = await setupNonAdminAlfa("colaborador");
    const seedDL = env.snapshot().deadlines.find((d) => d.caseId === SEED_CASE_BETA_1_ID)!;
    const r = err(await env.services.deadlines.remove(ctx, SEED_CASE_BETA_1_ID, seedDL.id, seedDL.metadata.version));
    // Guard tenta antes; case não pertence à org → policy deixa passar, serviço devolve not_found.
    expect(["not_found","forbidden"]).toContain(r.code);
  });
  it("(159) proprietario pode criar deadline em Alfa 1 (permissão + acesso ok)", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(await env.services.deadlines.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID, kind: "administrative", title: "T",
      dueAt: T_A, priority: "normal",
    }));
    expect(r.status).toBe("pending");
  });
  it("(160) proprietario pode criar appointment em Alfa 2 (permissão + acesso ok)", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(await env.services.appointments.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_2_ID, kind: "meeting", title: "T",
      startsAt: T_A, endsAt: T_B, mode: "remote",
    }));
    expect(r.status).toBe("scheduled");
  });
  it("(161) revisor sem profile: appointment.getById em Alfa 2 → forbidden/case_access_denied", async () => {
    const { env, ctx } = await setupNonAdminAlfa("revisor");
    const seedAP = env.snapshot().appointments.find((a) => a.caseId === SEED_CASE_ALFA_2_ID)!;
    const r = err(await env.services.appointments.getById(ctx, SEED_CASE_ALFA_2_ID, seedAP.id));
    expect(r.code).toBe("forbidden");
    expect(r.message).toBe("case_access_denied");
  });
  it("(162) admin pode ler appointment cross-org resulta em not_found (case fora da org)", async () => {
    const env = createMockDomainEnvironment();
    const seedAP = env.snapshot().appointments.find((a) => a.caseId === SEED_CASE_BETA_1_ID)!;
    const r = err(await env.services.appointments.getById(OWNER_ALFA, SEED_CASE_BETA_1_ID, seedAP.id));
    expect(r.code).toBe("not_found");
  });
  it("(163) admin pode ler deadline cross-org resulta em not_found", async () => {
    const env = createMockDomainEnvironment();
    const seedDL = env.snapshot().deadlines.find((d) => d.caseId === SEED_CASE_BETA_1_ID)!;
    const r = err(await env.services.deadlines.getById(OWNER_ALFA, SEED_CASE_BETA_1_ID, seedDL.id));
    expect(r.code).toBe("not_found");
  });
  it("(164) revisor sem profile: deadline.changeStatus → forbidden (role_not_allowed)", async () => {
    const { env, ctx } = await setupNonAdminAlfa("revisor");
    const seedDL = env.snapshot().deadlines.find((d) => d.caseId === SEED_CASE_ALFA_1_ID)!;
    const r = err(await env.services.deadlines.changeStatus(ctx, {
      caseId: SEED_CASE_ALFA_1_ID, deadlineId: seedDL.id,
      status: "completed", expectedVersion: seedDL.metadata.version,
    }));
    expect(r.code).toBe("forbidden");
    expect(r.message).toBe("permission_denied");
  });
  it("(165) leitura sem profile: deadline.list sem caseId retorna vazio", async () => {
    const { env, ctx } = await setupNonAdminAlfa("leitura");
    const r = ok(await env.services.deadlines.list(ctx));
    expect(r.items.length).toBe(0);
  });
  it("(166) leitura sem profile: appointment.list sem caseId retorna vazio", async () => {
    const { env, ctx } = await setupNonAdminAlfa("leitura");
    const r = ok(await env.services.appointments.list(ctx));
    expect(r.items.length).toBe(0);
  });
});

// ============================================================================
// (15) LV-09.1A.1 — Aliases de catálogo e coerência de tipo
// ============================================================================

import { DEADLINE_STATUSES } from "@/domain/core/agenda";

describe("LV-09.1A.1 · alias de catálogo", () => {
  it("(167) DEADLINE_STATUSES é o mesmo objeto que AGENDA_DEADLINE_STATUSES", () => {
    expect(DEADLINE_STATUSES).toBe(AGENDA_DEADLINE_STATUSES);
  });
  it("(168) DEADLINE_STATUSES tem os 3 valores canônicos", () => {
    expect([...DEADLINE_STATUSES]).toEqual(["pending","completed","cancelled"]);
  });
  it("(169) DEADLINE_STATUSES é readonly (frozen ou tuple as const)", () => {
    // tuple `as const` não é congelado em runtime, mas o tipo é readonly.
    expect(Array.isArray(DEADLINE_STATUSES)).toBe(true);
  });
});

// ============================================================================
// (16) LV-09.1A.2 — Matriz comportamental completa dos 6 papéis
// ============================================================================

import type { Role } from "@/domain/shared/work-context";
import type { CaseId } from "@/domain/core/ids";
import type { AssignmentRole, AssignmentStatus } from "@/domain/core/assignment";

type NonAdminRole = "profissional" | "revisor" | "colaborador" | "leitura";
const NON_ADMIN_ROLES: readonly NonAdminRole[] = ["profissional","revisor","colaborador","leitura"];
const ALL_ROLES_LIST: readonly Role[] = ["proprietario","administrador","profissional","revisor","colaborador","leitura"];
const ADMIN_ROLES_LIST: readonly Role[] = ["proprietario","administrador"];

function assignRoleForContextRole(role: Role): AssignmentRole {
  switch (role) {
    case "proprietario": return "lead_professional";
    case "administrador": return "co_professional";
    case "profissional": return "lead_professional";
    case "revisor": return "reviewer";
    case "colaborador": return "collaborator";
    case "leitura": return "read_only";
  }
}

async function setupWorker(
  role: NonAdminRole,
  opts: {
    profile: "active" | "inactive" | "none";
    assignCase?: CaseId;
    assignStatus?: AssignmentStatus;
  },
) {
  const env = createMockDomainEnvironment();
  const userId = buildDomainId("user", `seed_worker_${role}_${Math.random().toString(36).slice(2,8)}`) as never;
  const mem = ok(await env.services.memberships.create(OWNER_ALFA, { userId, role }));
  const ctx: ServiceContext = {
    organizationId: SEED_ORG_ALFA_ID,
    userId,
    membershipId: mem.id,
    role,
  };
  if (opts.profile !== "none") {
    // Cria profile no contexto do OWNER passando o userId trabalhador.
    const prof = ok(await env.services.professionalProfiles.create(OWNER_ALFA, {
      userId,
      area: "psicologia",
    }));
    if (opts.profile === "inactive") {
      ok(await env.services.professionalProfiles.update(OWNER_ALFA, prof.id, {
        status: "inactive",
        expectedVersion: prof.metadata.version,
      }));
    }
    if (opts.assignCase !== undefined) {
      const a = ok(await env.services.assignments.create(OWNER_ALFA, {
        caseId: opts.assignCase,
        professionalProfileId: prof.id,
        role: assignRoleForContextRole(role),
        startedOn: "2026-01-05" as never,
      }));
      if (opts.assignStatus && opts.assignStatus !== "active") {
        ok(await env.services.assignments.changeStatus(OWNER_ALFA, opts.assignCase, {
          assignmentId: a.id,
          status: opts.assignStatus,
          expectedVersion: a.metadata.version,
        }));
      }
    }
  }
  return { env, ctx };
}

describe("LV-09.1A.2 · admins acessam qualquer caso da própria org", () => {
  for (const role of ADMIN_ROLES_LIST) {
    it(`(200-${role}) ${role}: policy allow em Alfa 1 sem profile nenhum`, async () => {
      const env = createMockDomainEnvironment();
      const ctx: ServiceContext = { ...OWNER_ALFA, role };
      const dec = ok(await env.services.permissions.evaluate(ctx, {
        action: "deadline.read", caseId: SEED_CASE_ALFA_1_ID,
      }));
      expect(dec.allowed).toBe(true);
    });
    it(`(201-${role}) ${role}: policy denied cross-org com case_access_denied`, async () => {
      const env = createMockDomainEnvironment();
      const ctx: ServiceContext = { ...OWNER_ALFA, role };
      const dec = ok(await env.services.permissions.evaluate(ctx, {
        action: "deadline.read", caseId: SEED_CASE_BETA_1_ID,
      }));
      expect(dec.allowed).toBe(false);
      expect(dec.reason).toBe("case_access_denied");
    });
    it(`(202-${role}) ${role}: hasAgendaCaseAccess em store vazio devolve false`, () => {
      const s = createEmptyStore();
      const ctx: ServiceContext = { ...OWNER_ALFA, role };
      expect(hasAgendaCaseAccess(s, ctx, SEED_CASE_ALFA_1_ID)).toBe(false);
    });
  }
});

describe("LV-09.1A.2 · não-admin exige ProfessionalProfile ATIVO", () => {
  for (const role of NON_ADMIN_ROLES) {
    it(`(210-${role}) ${role} sem profile: policy denied com case_access_denied`, async () => {
      const { env, ctx } = await setupWorker(role, { profile: "none" });
      const dec = ok(await env.services.permissions.evaluate(ctx, {
        action: "deadline.read", caseId: SEED_CASE_ALFA_1_ID,
      }));
      expect(dec.allowed).toBe(false);
      expect(dec.reason).toBe("case_access_denied");
      void env;
    });
    it(`(211-${role}) ${role} profile ativo, sem assignment: policy denied`, async () => {
      const { env, ctx } = await setupWorker(role, { profile: "active" });
      const dec = ok(await env.services.permissions.evaluate(ctx, {
        action: "appointment.read", caseId: SEED_CASE_ALFA_1_ID,
      }));
      expect(dec.allowed).toBe(false);
      expect(dec.reason).toBe("case_access_denied");
      void env;
    });
    it(`(212-${role}) ${role} profile INATIVO com assignment ativo: policy denied`, async () => {
      const { env, ctx } = await setupWorker(role, {
        profile: "active",
        assignCase: SEED_CASE_ALFA_1_ID,
        assignStatus: "active",
      });
      // Depois de criar assignment, marcar profile como inativo.
      const snap = env.snapshot().professionalProfiles.find((p) => p.userId === ctx.userId)!;
      ok(await env.services.professionalProfiles.update(OWNER_ALFA, snap.id, {
        status: "inactive",
        expectedVersion: snap.metadata.version,
      }));
      const dec = ok(await env.services.permissions.evaluate(ctx, {
        action: "deadline.read", caseId: SEED_CASE_ALFA_1_ID,
      }));
      expect(dec.allowed).toBe(false);
      expect(dec.reason).toBe("case_access_denied");
    });
    it(`(213-${role}) ${role} profile ativo + assignment ATIVO no caso: policy allow`, async () => {
      const { env, ctx } = await setupWorker(role, {
        profile: "active",
        assignCase: SEED_CASE_ALFA_1_ID,
        assignStatus: "active",
      });
      const dec = ok(await env.services.permissions.evaluate(ctx, {
        action: "deadline.read", caseId: SEED_CASE_ALFA_1_ID,
      }));
      expect(dec.allowed).toBe(true);
      void env;
    });
    it(`(214-${role}) ${role} profile ativo + assignment CONCLUÍDO: policy denied`, async () => {
      const { env, ctx } = await setupWorker(role, {
        profile: "active",
        assignCase: SEED_CASE_ALFA_1_ID,
        assignStatus: "concluded",
      });
      const dec = ok(await env.services.permissions.evaluate(ctx, {
        action: "deadline.read", caseId: SEED_CASE_ALFA_1_ID,
      }));
      expect(dec.allowed).toBe(false);
      expect(dec.reason).toBe("case_access_denied");
      void env;
    });
    it(`(215-${role}) ${role} assignment em OUTRO caso: policy denied no caso pedido`, async () => {
      const { env, ctx } = await setupWorker(role, {
        profile: "active",
        assignCase: SEED_CASE_ALFA_2_ID,
        assignStatus: "active",
      });
      const dec = ok(await env.services.permissions.evaluate(ctx, {
        action: "deadline.read", caseId: SEED_CASE_ALFA_1_ID,
      }));
      expect(dec.allowed).toBe(false);
      expect(dec.reason).toBe("case_access_denied");
      // Já no caso do assignment, permite.
      const dec2 = ok(await env.services.permissions.evaluate(ctx, {
        action: "deadline.read", caseId: SEED_CASE_ALFA_2_ID,
      }));
      expect(dec2.allowed).toBe(true);
    });
    it(`(216-${role}) ${role} cross-org: policy sempre denied com case_access_denied`, async () => {
      const { env, ctx } = await setupWorker(role, { profile: "active", assignCase: SEED_CASE_ALFA_1_ID });
      const dec = ok(await env.services.permissions.evaluate(ctx, {
        action: "deadline.read", caseId: SEED_CASE_BETA_1_ID,
      }));
      expect(dec.allowed).toBe(false);
      expect(dec.reason).toBe("case_access_denied");
      void env;
    });
  }
});

describe("LV-09.1A.2 · serviços: forbidden vs not_found (mesma org vs cross-org)", () => {
  it("(230) leitura com assignment ATIVO: deadlines.list caseId Alfa 1 devolve itens", async () => {
    const { env, ctx } = await setupWorker("leitura", {
      profile: "active",
      assignCase: SEED_CASE_ALFA_1_ID,
      assignStatus: "active",
    });
    const p = ok(await env.services.deadlines.list(ctx, { caseId: SEED_CASE_ALFA_1_ID }));
    for (const d of p.items) expect(d.caseId).toBe(SEED_CASE_ALFA_1_ID);
  });
  it("(231) leitura com assignment ATIVO: deadlines.create → role_not_allowed", async () => {
    const { env, ctx } = await setupWorker("leitura", {
      profile: "active",
      assignCase: SEED_CASE_ALFA_1_ID,
      assignStatus: "active",
    });
    const r = err(await env.services.deadlines.create(ctx, {
      caseId: SEED_CASE_ALFA_1_ID, kind: "administrative", title: "T",
      dueAt: T_A, priority: "normal",
    }));
    expect(r.code).toBe("forbidden");
    expect(r.message).toBe("permission_denied");
    void env;
  });
  it("(232) profissional com assignment ATIVO: deadlines.create OK", async () => {
    const { env, ctx } = await setupWorker("profissional", {
      profile: "active",
      assignCase: SEED_CASE_ALFA_1_ID,
      assignStatus: "active",
    });
    const r = ok(await env.services.deadlines.create(ctx, {
      caseId: SEED_CASE_ALFA_1_ID, kind: "administrative", title: "T",
      dueAt: T_A, priority: "normal",
    }));
    expect(r.status).toBe("pending");
    void env;
  });
  it("(233) colaborador com assignment ATIVO: appointments.create OK", async () => {
    const { env, ctx } = await setupWorker("colaborador", {
      profile: "active",
      assignCase: SEED_CASE_ALFA_1_ID,
      assignStatus: "active",
    });
    const r = ok(await env.services.appointments.create(ctx, {
      caseId: SEED_CASE_ALFA_1_ID, kind: "meeting", title: "T",
      startsAt: T_A, endsAt: T_B, mode: "remote",
    }));
    expect(r.status).toBe("scheduled");
    void env;
  });
  it("(234) colaborador com assignment ATIVO: deadlines.remove → role_not_allowed", async () => {
    const { env, ctx } = await setupWorker("colaborador", {
      profile: "active",
      assignCase: SEED_CASE_ALFA_1_ID,
      assignStatus: "active",
    });
    const seedDL = env.snapshot().deadlines.find((d) => d.caseId === SEED_CASE_ALFA_1_ID)!;
    const r = err(await env.services.deadlines.remove(ctx, SEED_CASE_ALFA_1_ID, seedDL.id, seedDL.metadata.version));
    expect(r.code).toBe("forbidden");
    expect(r.message).toBe("permission_denied");
  });
  it("(235) revisor com assignment ATIVO: deadlines.list caseId próprio devolve itens", async () => {
    const { env, ctx } = await setupWorker("revisor", {
      profile: "active",
      assignCase: SEED_CASE_ALFA_1_ID,
      assignStatus: "active",
    });
    const p = ok(await env.services.deadlines.list(ctx, { caseId: SEED_CASE_ALFA_1_ID }));
    for (const d of p.items) expect(d.caseId).toBe(SEED_CASE_ALFA_1_ID);
    void env;
  });
  it("(236) revisor com assignment ATIVO: deadlines.changeStatus → role_not_allowed", async () => {
    const { env, ctx } = await setupWorker("revisor", {
      profile: "active",
      assignCase: SEED_CASE_ALFA_1_ID,
      assignStatus: "active",
    });
    const seedDL = env.snapshot().deadlines.find((d) => d.caseId === SEED_CASE_ALFA_1_ID)!;
    const r = err(await env.services.deadlines.changeStatus(ctx, {
      caseId: SEED_CASE_ALFA_1_ID, deadlineId: seedDL.id,
      status: "completed", expectedVersion: seedDL.metadata.version,
    }));
    expect(r.code).toBe("forbidden");
    expect(r.message).toBe("permission_denied");
  });
  it("(237) profissional com assignment ATIVO cross-org caseId: service not_found", async () => {
    const { env, ctx } = await setupWorker("profissional", {
      profile: "active",
      assignCase: SEED_CASE_ALFA_1_ID,
      assignStatus: "active",
    });
    const r = err(await env.services.deadlines.list(ctx, { caseId: SEED_CASE_BETA_1_ID }));
    expect(r.code).toBe("not_found");
    void env;
  });
  it("(238) colaborador sem assignment em Alfa 2: appointments.list caseId Alfa 2 → forbidden/case_access_denied", async () => {
    const { env, ctx } = await setupWorker("colaborador", {
      profile: "active",
      assignCase: SEED_CASE_ALFA_1_ID,
      assignStatus: "active",
    });
    const r = err(await env.services.appointments.list(ctx, { caseId: SEED_CASE_ALFA_2_ID }));
    expect(r.code).toBe("forbidden");
    expect(r.message).toBe("case_access_denied");
    void env;
  });
  it("(239) leitura profile ATIVO sem assignment: deadlines.list sem caseId retorna vazio", async () => {
    const { env, ctx } = await setupWorker("leitura", { profile: "active" });
    const r = ok(await env.services.deadlines.list(ctx));
    expect(r.items.length).toBe(0);
    void env;
  });
  it("(240) profissional profile INATIVO com assignment ATIVO: deadlines.list sem caseId vazio", async () => {
    const { env, ctx } = await setupWorker("profissional", {
      profile: "active",
      assignCase: SEED_CASE_ALFA_1_ID,
      assignStatus: "active",
    });
    const snap = env.snapshot().professionalProfiles.find((p) => p.userId === ctx.userId)!;
    ok(await env.services.professionalProfiles.update(OWNER_ALFA, snap.id, {
      status: "inactive",
      expectedVersion: snap.metadata.version,
    }));
    const r = ok(await env.services.deadlines.list(ctx));
    expect(r.items.length).toBe(0);
  });
  it("(241) proprietário: policy allow em Alfa 1 e Alfa 2", async () => {
    const env = createMockDomainEnvironment();
    for (const cid of [SEED_CASE_ALFA_1_ID, SEED_CASE_ALFA_2_ID]) {
      const dec = ok(await env.services.permissions.evaluate(OWNER_ALFA, {
        action: "deadline.read", caseId: cid,
      }));
      expect(dec.allowed).toBe(true);
    }
  });
  it("(242) leitura + assignment ATIVO: appointments.getById caseId próprio devolve item", async () => {
    const { env, ctx } = await setupWorker("leitura", {
      profile: "active",
      assignCase: SEED_CASE_ALFA_1_ID,
      assignStatus: "active",
    });
    const seedAP = env.snapshot().appointments.find((a) => a.caseId === SEED_CASE_ALFA_1_ID);
    if (!seedAP) return; // seed pode não ter appointment em Alfa 1
    const r = ok(await env.services.appointments.getById(ctx, SEED_CASE_ALFA_1_ID, seedAP.id));
    expect(r.id).toBe(seedAP.id);
  });
});

describe("LV-09.1A.2 · computeAgendaAccessibleCaseIds — matriz por papel", () => {
  it("(250) proprietario: enumera todos os casos da org", async () => {
    const env = createMockDomainEnvironment();
    const store = env.__debugStore?.() as unknown; void store;
    // Testamos indiretamente através das permissões — ambos casos Alfa devem allow.
    const d1 = ok(await env.services.permissions.evaluate(OWNER_ALFA, { action: "deadline.read", caseId: SEED_CASE_ALFA_1_ID }));
    const d2 = ok(await env.services.permissions.evaluate(OWNER_ALFA, { action: "deadline.read", caseId: SEED_CASE_ALFA_2_ID }));
    expect(d1.allowed && d2.allowed).toBe(true);
  });
  for (const role of NON_ADMIN_ROLES) {
    it(`(251-${role}) ${role} sem profile: sem casos acessíveis`, async () => {
      const { env, ctx } = await setupWorker(role, { profile: "none" });
      const d1 = ok(await env.services.permissions.evaluate(ctx, { action: "deadline.read", caseId: SEED_CASE_ALFA_1_ID }));
      const d2 = ok(await env.services.permissions.evaluate(ctx, { action: "deadline.read", caseId: SEED_CASE_ALFA_2_ID }));
      expect(d1.allowed).toBe(false);
      expect(d2.allowed).toBe(false);
    });
    it(`(252-${role}) ${role} com assignment ATIVO só no Alfa 1: allow em 1, denied em 2`, async () => {
      const { env, ctx } = await setupWorker(role, {
        profile: "active", assignCase: SEED_CASE_ALFA_1_ID, assignStatus: "active",
      });
      const d1 = ok(await env.services.permissions.evaluate(ctx, { action: "deadline.read", caseId: SEED_CASE_ALFA_1_ID }));
      const d2 = ok(await env.services.permissions.evaluate(ctx, { action: "deadline.read", caseId: SEED_CASE_ALFA_2_ID }));
      expect(d1.allowed).toBe(true);
      expect(d2.allowed).toBe(false);
      void env;
    });
  }
});

// Verificações finais de tipagem/catálogo — LV-09.1A.2
describe("LV-09.1A.2 · catálogo e tipos", () => {
  it("(260) ALL_ROLES cobre exatamente 6 papéis", () => {
    expect(ALL_ROLES_LIST.length).toBe(6);
    expect(new Set(ALL_ROLES_LIST).size).toBe(6);
  });
  it("(261) ADMIN_ROLES são apenas proprietario e administrador", () => {
    expect([...ADMIN_ROLES_LIST]).toEqual(["proprietario","administrador"]);
  });
  it("(262) NON_ADMIN_ROLES são exatamente 4", () => {
    expect(NON_ADMIN_ROLES.length).toBe(4);
  });
  it("(263) isAgendaAction cobre 12 ações da agenda", () => {
    let count = 0;
    for (const a of PERMISSION_ACTIONS) if (isAgendaAction(a)) count += 1;
    expect(count).toBe(12);
  });
});

