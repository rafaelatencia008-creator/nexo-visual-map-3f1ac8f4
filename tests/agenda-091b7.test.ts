/**
 * LV-09.1B.7.1 — Motor consultivo de disponibilidade.
 *
 * Testes comportamentais dos helpers puros em `availability.ts` e do
 * orquestrador `checkAppointmentAvailability`.
 */

import { describe, expect, it } from "bun:test";
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
  SEED_CASE_ALFA_3_ID,
  SEED_CASE_BETA_1_ID,
  SEED_CASE_BETA_2_ID,
  SEED_ASSIGN_ALFA_1_ID,
  SEED_ASSIGN_BETA_1_ID,
  SEED_PROF_ALFA_ID,
  SEED_PROF_BETA_ID,
} from "@/domain/mocks/seed";
import type { ServiceContext } from "@/domain/services/context";
import type { ServiceResult } from "@/domain/services/result";
import type { Assignment } from "@/domain/core/assignment";
import type { Appointment } from "@/domain/core/agenda";
import type { CaseId } from "@/domain/core/ids";
import {
  isIsoDateTime,
  type IsoDate,
  type IsoDateTime,
} from "@/domain/core/common";
import {
  AVAILABILITY_SCOPE,
  availabilityAvailable,
  availabilityConflicts,
  availabilityError,
  availabilityNotApplicable,
  buildAppointmentAvailabilityListOptions,
  collectProfessionalAssignmentIds,
  filterAppointmentAvailabilityConflicts,
  periodsOverlapHalfOpen,
  sortAppointmentAvailabilityConflicts,
  type AppointmentAvailabilityConflict,
} from "@/features/agenda/availability";
import {
  checkAppointmentAvailability,
  type AvailabilityServices,
} from "@/features/agenda/check-appointment-availability";

// ---- Helpers ---------------------------------------------------------------

function dt(v: string): IsoDateTime {
  if (!isIsoDateTime(v)) throw new Error(`ISO inválido: ${v}`);
  return v;
}
function ok<T>(r: ServiceResult<T>): T {
  if (!r.ok) throw new Error("service failed: " + JSON.stringify(r.error));
  return r.data;
}

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

const AID = (n: string) => `assignment_${n}` as Assignment["id"];
const APID = (n: string) => `appointment_${n}` as Appointment["id"];

// ==========================================================================
// Parte 1 — Helpers puros
// ==========================================================================

describe("LV-09.1B.7.1 · periodsOverlapHalfOpen", () => {
  it("(01) identifica sobreposição total", () => {
    expect(
      periodsOverlapHalfOpen(
        dt("2026-02-01T10:00:00.000Z"),
        dt("2026-02-01T11:00:00.000Z"),
        dt("2026-02-01T10:00:00.000Z"),
        dt("2026-02-01T11:00:00.000Z"),
      ),
    ).toBe(true);
  });
  it("(02) identifica sobreposição parcial (B dentro de A)", () => {
    expect(
      periodsOverlapHalfOpen(
        dt("2026-02-01T10:00:00.000Z"),
        dt("2026-02-01T12:00:00.000Z"),
        dt("2026-02-01T10:30:00.000Z"),
        dt("2026-02-01T11:00:00.000Z"),
      ),
    ).toBe(true);
  });
  it("(03) trata fim==início como adjacência (sem conflito)", () => {
    expect(
      periodsOverlapHalfOpen(
        dt("2026-02-01T10:00:00.000Z"),
        dt("2026-02-01T11:00:00.000Z"),
        dt("2026-02-01T11:00:00.000Z"),
        dt("2026-02-01T12:00:00.000Z"),
      ),
    ).toBe(false);
  });
  it("(04) trata início==fim como adjacência (sem conflito)", () => {
    expect(
      periodsOverlapHalfOpen(
        dt("2026-02-01T11:00:00.000Z"),
        dt("2026-02-01T12:00:00.000Z"),
        dt("2026-02-01T10:00:00.000Z"),
        dt("2026-02-01T11:00:00.000Z"),
      ),
    ).toBe(false);
  });
  it("(05) intervalos totalmente separados não conflitam", () => {
    expect(
      periodsOverlapHalfOpen(
        dt("2026-02-01T10:00:00.000Z"),
        dt("2026-02-01T11:00:00.000Z"),
        dt("2026-02-02T10:00:00.000Z"),
        dt("2026-02-02T11:00:00.000Z"),
      ),
    ).toBe(false);
  });
  it("(06) B contendo A é conflito", () => {
    expect(
      periodsOverlapHalfOpen(
        dt("2026-02-01T10:30:00.000Z"),
        dt("2026-02-01T11:00:00.000Z"),
        dt("2026-02-01T10:00:00.000Z"),
        dt("2026-02-01T12:00:00.000Z"),
      ),
    ).toBe(true);
  });
});

describe("LV-09.1B.7.1 · collectProfessionalAssignmentIds", () => {
  const makeA = (id: string, prof: string): Assignment => ({
    id: AID(id),
    organizationId: SEED_ORG_ALFA_ID,
    caseId: SEED_CASE_ALFA_1_ID,
    professionalProfileId: prof as Assignment["professionalProfileId"],
    role: "lead_professional",
    status: "active",
    startedOn: "2026-01-01" as IsoDate,
    metadata: { createdAt: dt("2026-01-01T00:00:00.000Z"), updatedAt: dt("2026-01-01T00:00:00.000Z"), version: 1 },
  });
  it("(07) coleta apenas ids do profissional informado", () => {
    const arr = collectProfessionalAssignmentIds(
      [makeA("a", "p1"), makeA("b", "p2"), makeA("c", "p1")],
      "p1" as Assignment["professionalProfileId"],
    );
    expect(arr).toEqual([AID("a"), AID("c")]);
  });
  it("(08) dedup por id (mesma entrada aparecendo duas vezes)", () => {
    const a = makeA("a", "p1");
    const arr = collectProfessionalAssignmentIds([a, a], "p1" as Assignment["professionalProfileId"]);
    expect(arr).toEqual([AID("a")]);
  });
  it("(09) retorna vazio quando nenhum vínculo casa", () => {
    const arr = collectProfessionalAssignmentIds(
      [makeA("a", "p2")],
      "p1" as Assignment["professionalProfileId"],
    );
    expect(arr).toEqual([]);
  });
});

describe("LV-09.1B.7.1 · sortAppointmentAvailabilityConflicts", () => {
  const c = (id: string, start: string): AppointmentAvailabilityConflict => ({
    appointmentId: APID(id),
    caseId: SEED_CASE_ALFA_1_ID,
    assignmentId: AID("x"),
    startsAt: dt(start),
    endsAt: dt("2026-03-01T12:00:00.000Z"),
    status: "scheduled",
  });
  it("(10) ordena por instante inicial ascendente", () => {
    const out = sortAppointmentAvailabilityConflicts([
      c("b", "2026-03-01T11:00:00.000Z"),
      c("a", "2026-03-01T10:00:00.000Z"),
    ]);
    expect(out.map((x) => x.appointmentId)).toEqual([APID("a"), APID("b")]);
  });
  it("(11) empate resolvido por appointmentId como desempate estável", () => {
    const out = sortAppointmentAvailabilityConflicts([
      c("b", "2026-03-01T10:00:00.000Z"),
      c("a", "2026-03-01T10:00:00.000Z"),
    ]);
    expect(out.map((x) => x.appointmentId)).toEqual([APID("a"), APID("b")]);
  });
});

describe("LV-09.1B.7.1 · filterAppointmentAvailabilityConflicts", () => {
  const baseApt = (over: Partial<Appointment>): Appointment => ({
    id: APID("x"),
    organizationId: SEED_ORG_ALFA_ID,
    caseId: SEED_CASE_ALFA_2_ID,
    kind: "meeting",
    title: "t",
    startsAt: dt("2026-02-01T10:00:00.000Z"),
    endsAt: dt("2026-02-01T11:00:00.000Z"),
    mode: "remote",
    status: "scheduled",
    assignmentId: SEED_ASSIGN_ALFA_1_ID,
    metadata: { createdAt: dt("2026-01-01T00:00:00.000Z"), updatedAt: dt("2026-01-01T00:00:00.000Z"), version: 1 },
    ...over,
  });
  const candidate = {
    startsAt: dt("2026-02-01T10:00:00.000Z"),
    endsAt: dt("2026-02-01T11:00:00.000Z"),
    assignmentId: SEED_ASSIGN_ALFA_1_ID,
  } as const;
  const profSet = new Set([SEED_ASSIGN_ALFA_1_ID]);

  it("(12) inclui compromisso agendado com sobreposição", () => {
    const r = filterAppointmentAvailabilityConflicts([baseApt({})], candidate, profSet);
    expect(r.length).toBe(1);
  });
  it("(13) ignora status diferente de scheduled", () => {
    const r = filterAppointmentAvailabilityConflicts(
      [baseApt({ status: "completed" }), baseApt({ id: APID("y"), status: "cancelled" })],
      candidate,
      profSet,
    );
    expect(r.length).toBe(0);
  });
  it("(14) ignora compromissos sem assignmentId", () => {
    const r = filterAppointmentAvailabilityConflicts(
      [baseApt({ assignmentId: undefined })],
      candidate,
      profSet,
    );
    expect(r.length).toBe(0);
  });
  it("(15) ignora assignmentId de outro profissional", () => {
    const r = filterAppointmentAvailabilityConflicts(
      [baseApt({ assignmentId: SEED_ASSIGN_BETA_1_ID })],
      candidate,
      profSet,
    );
    expect(r.length).toBe(0);
  });
  it("(16) exclui o próprio compromisso durante edição", () => {
    const r = filterAppointmentAvailabilityConflicts(
      [baseApt({ id: APID("self") })],
      { ...candidate, excludeAppointmentId: APID("self") },
      profSet,
    );
    expect(r.length).toBe(0);
  });
  it("(17) não conflita quando adjacente (fim==início)", () => {
    const r = filterAppointmentAvailabilityConflicts(
      [baseApt({ startsAt: dt("2026-02-01T09:00:00.000Z"), endsAt: dt("2026-02-01T10:00:00.000Z") })],
      candidate,
      profSet,
    );
    expect(r.length).toBe(0);
  });
});

describe("LV-09.1B.7.1 · buildAppointmentAvailabilityListOptions", () => {
  it("(18) monta com rangeFrom/rangeTo, statuses ['scheduled'] e assignmentIds", () => {
    const opts = buildAppointmentAvailabilityListOptions(
      { startsAt: dt("2026-02-01T10:00:00.000Z"), endsAt: dt("2026-02-01T11:00:00.000Z") },
      [SEED_ASSIGN_ALFA_1_ID],
      { limit: 25 },
    );
    expect(opts.rangeFrom).toBe(dt("2026-02-01T10:00:00.000Z"));
    expect(opts.rangeTo).toBe(dt("2026-02-01T11:00:00.000Z"));
    expect(opts.statuses).toEqual(["scheduled"]);
    expect(opts.assignmentIds).toEqual([SEED_ASSIGN_ALFA_1_ID]);
    expect(opts.page).toEqual({ limit: 25 });
    expect("caseId" in opts).toBe(false);
  });
});

describe("LV-09.1B.7.1 · fábricas de resultado", () => {
  it("(19) available: escopo fixo, conflitos vazios e congelado", () => {
    const r = availabilityAvailable();
    expect(r.status).toBe("available");
    expect(r.scope).toBe(AVAILABILITY_SCOPE);
    expect(Object.isFrozen(r)).toBe(true);
  });
  it("(20) conflicts: preserva lista", () => {
    const c: AppointmentAvailabilityConflict = {
      appointmentId: APID("x"),
      caseId: SEED_CASE_ALFA_1_ID,
      assignmentId: AID("a"),
      startsAt: dt("2026-02-01T10:00:00.000Z"),
      endsAt: dt("2026-02-01T11:00:00.000Z"),
      status: "scheduled",
    };
    const r = availabilityConflicts([c]);
    expect(r.status).toBe("conflicts");
    if (r.status === "conflicts") expect(r.conflicts.length).toBe(1);
  });
  it("(21) not_applicable: preserva reason", () => {
    const r = availabilityNotApplicable("no_selected_assignment");
    expect(r.status).toBe("not_applicable");
    if (r.status === "not_applicable") expect(r.reason).toBe("no_selected_assignment");
  });
  it("(22) error: preserva source e message", () => {
    const r = availabilityError("appointments", "unavailable");
    expect(r.status).toBe("error");
    if (r.status === "error") {
      expect(r.source).toBe("appointments");
      expect(r.message).toBe("unavailable");
    }
  });
});

// ==========================================================================
// Parte 2 — Orquestrador (integração com serviços oficiais)
// ==========================================================================

function seededEnv() {
  const env = createMockDomainEnvironment();
  const services: AvailabilityServices = {
    assignments: env.services.assignments,
    appointments: env.services.appointments,
  };
  return { env, services };
}

async function getSeededAssignment(env: ReturnType<typeof createMockDomainEnvironment>) {
  const r = ok(
    await env.services.assignments.getById(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      SEED_ASSIGN_ALFA_1_ID,
    ),
  );
  return r;
}

const CANDIDATE_OVERLAP = {
  startsAt: dt("2026-01-19T10:30:00.000Z"),
  endsAt: dt("2026-01-19T10:45:00.000Z"),
  assignmentId: SEED_ASSIGN_ALFA_1_ID,
} as const;

const CANDIDATE_FREE = {
  startsAt: dt("2026-01-20T09:00:00.000Z"),
  endsAt: dt("2026-01-20T10:00:00.000Z"),
  assignmentId: SEED_ASSIGN_ALFA_1_ID,
} as const;

describe("LV-09.1B.7.1 · checkAppointmentAvailability — pré-condições", () => {
  it("(23) selectedAssignment nulo → not_applicable", async () => {
    const { services } = seededEnv();
    const r = await checkAppointmentAvailability({
      services,
      context: OWNER_ALFA,
      accessibleCases: [SEED_CASE_ALFA_2_ID],
      selectedAssignment: null,
      candidate: CANDIDATE_FREE,
    });
    expect(r.status).toBe("not_applicable");
  });
  it("(24) candidate nulo → not_applicable", async () => {
    const { env, services } = seededEnv();
    const sel = await getSeededAssignment(env);
    const r = await checkAppointmentAvailability({
      services,
      context: OWNER_ALFA,
      accessibleCases: [SEED_CASE_ALFA_2_ID],
      selectedAssignment: sel,
      candidate: null,
    });
    expect(r.status).toBe("not_applicable");
  });
  it("(25) período inválido (start >= end) → not_applicable", async () => {
    const { env, services } = seededEnv();
    const sel = await getSeededAssignment(env);
    const r = await checkAppointmentAvailability({
      services,
      context: OWNER_ALFA,
      accessibleCases: [SEED_CASE_ALFA_2_ID],
      selectedAssignment: sel,
      candidate: {
        startsAt: dt("2026-01-19T11:00:00.000Z"),
        endsAt: dt("2026-01-19T10:00:00.000Z"),
        assignmentId: SEED_ASSIGN_ALFA_1_ID,
      },
    });
    expect(r.status).toBe("not_applicable");
  });
  it("(26) accessibleCases vazio → available", async () => {
    const { env, services } = seededEnv();
    const sel = await getSeededAssignment(env);
    const r = await checkAppointmentAvailability({
      services,
      context: OWNER_ALFA,
      accessibleCases: [],
      selectedAssignment: sel,
      candidate: CANDIDATE_FREE,
    });
    expect(r.status).toBe("available");
  });
});

describe("LV-09.1B.7.1 · checkAppointmentAvailability — regras de conflito", () => {
  it("(27) janela livre → available", async () => {
    const { env, services } = seededEnv();
    const sel = await getSeededAssignment(env);
    const r = await checkAppointmentAvailability({
      services,
      context: OWNER_ALFA,
      accessibleCases: [SEED_CASE_ALFA_1_ID, SEED_CASE_ALFA_2_ID, SEED_CASE_ALFA_3_ID],
      selectedAssignment: sel,
      candidate: CANDIDATE_FREE,
    });
    expect(r.status).toBe("available");
  });
  it("(28) sobreposição com compromisso do próprio profissional → conflicts", async () => {
    const { env, services } = seededEnv();
    const sel = await getSeededAssignment(env);
    const r = await checkAppointmentAvailability({
      services,
      context: OWNER_ALFA,
      accessibleCases: [SEED_CASE_ALFA_1_ID, SEED_CASE_ALFA_2_ID, SEED_CASE_ALFA_3_ID],
      selectedAssignment: sel,
      candidate: CANDIDATE_OVERLAP,
    });
    expect(r.status).toBe("conflicts");
    if (r.status === "conflicts") {
      expect(r.conflicts.length).toBe(1);
      expect(r.conflicts[0]!.assignmentId).toBe(SEED_ASSIGN_ALFA_1_ID);
    }
  });
  it("(29) adjacência (fim==início) → available", async () => {
    const { env, services } = seededEnv();
    const sel = await getSeededAssignment(env);
    const r = await checkAppointmentAvailability({
      services,
      context: OWNER_ALFA,
      accessibleCases: [SEED_CASE_ALFA_2_ID],
      selectedAssignment: sel,
      candidate: {
        startsAt: dt("2026-01-19T09:00:00.000Z"),
        endsAt: dt("2026-01-19T10:00:00.000Z"),
        assignmentId: SEED_ASSIGN_ALFA_1_ID,
      },
    });
    expect(r.status).toBe("available");
  });
  it("(30) exclusão do próprio compromisso durante edição → available", async () => {
    const { env, services } = seededEnv();
    const sel = await getSeededAssignment(env);
    // Descobre o próprio compromisso agendado que estamos "editando".
    const list = ok(
      await env.services.appointments.list(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_2_ID,
        statuses: ["scheduled"],
        assignmentIds: [SEED_ASSIGN_ALFA_1_ID],
        page: { limit: 10 },
      }),
    );
    expect(list.items.length).toBeGreaterThan(0);
    const self = list.items[0]!;
    const r = await checkAppointmentAvailability({
      services,
      context: OWNER_ALFA,
      accessibleCases: [SEED_CASE_ALFA_2_ID],
      selectedAssignment: sel,
      candidate: {
        startsAt: self.startsAt,
        endsAt: self.endsAt,
        assignmentId: SEED_ASSIGN_ALFA_1_ID,
        excludeAppointmentId: self.id,
      },
    });
    expect(r.status).toBe("available");
  });
  it("(31) isolamento cross-org: contexto Beta não vê compromissos de Alfa", async () => {
    const { env, services } = seededEnv();
    const selBeta = ok(
      await env.services.assignments.getById(
        OWNER_BETA,
        SEED_CASE_BETA_2_ID,
        SEED_ASSIGN_BETA_1_ID,
      ),
    );
    const r = await checkAppointmentAvailability({
      services,
      context: OWNER_BETA,
      accessibleCases: [SEED_CASE_BETA_1_ID, SEED_CASE_BETA_2_ID],
      selectedAssignment: selBeta,
      candidate: {
        startsAt: dt("2026-01-19T10:30:00.000Z"),
        endsAt: dt("2026-01-19T10:45:00.000Z"),
        assignmentId: SEED_ASSIGN_BETA_1_ID,
      },
    });
    expect(r.status).toBe("available");
  });
  it("(32) apenas o caso de outra org é acessível → available (isolamento)", async () => {
    const { env, services } = seededEnv();
    const sel = await getSeededAssignment(env);
    // Caso Beta é inacessível para o contexto Alfa: o serviço devolve
    // not_found via paginateAssignments, tratado como sem assignments;
    // além disso `list` de appointments só devolve dados de Alfa.
    const r = await checkAppointmentAvailability({
      services,
      context: OWNER_ALFA,
      accessibleCases: [SEED_CASE_BETA_2_ID as CaseId],
      selectedAssignment: sel,
      candidate: CANDIDATE_FREE,
    });
    expect(r.status).toBe("available");
  });

});

describe("LV-09.1B.7.1 · checkAppointmentAvailability — múltiplos compromissos", () => {
  async function createOverlapping(
    env: ReturnType<typeof createMockDomainEnvironment>,
    title: string,
    startsAt: IsoDateTime,
    endsAt: IsoDateTime,
  ) {
    return ok(
      await env.services.appointments.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_2_ID,
        kind: "meeting",
        title,
        startsAt,
        endsAt,
        mode: "remote",
        assignmentId: SEED_ASSIGN_ALFA_1_ID,
      }),
    );
  }

  it("(33) coleta e ordena múltiplos conflitos por instante inicial", async () => {
    const { env, services } = seededEnv();
    const sel = await getSeededAssignment(env);
    // Cria dois compromissos adicionais sobrepostos ao AP_A2_2 (10:00-11:00).
    await createOverlapping(
      env,
      "Sobreposto A",
      dt("2026-01-19T10:15:00.000Z"),
      dt("2026-01-19T10:20:00.000Z"),
    );
    await createOverlapping(
      env,
      "Sobreposto B",
      dt("2026-01-19T10:40:00.000Z"),
      dt("2026-01-19T10:50:00.000Z"),
    );
    const r = await checkAppointmentAvailability({
      services,
      context: OWNER_ALFA,
      accessibleCases: [SEED_CASE_ALFA_2_ID],
      selectedAssignment: sel,
      candidate: {
        startsAt: dt("2026-01-19T10:10:00.000Z"),
        endsAt: dt("2026-01-19T10:55:00.000Z"),
        assignmentId: SEED_ASSIGN_ALFA_1_ID,
      },
    });
    expect(r.status).toBe("conflicts");
    if (r.status === "conflicts") {
      expect(r.conflicts.length).toBe(3);
      const starts = r.conflicts.map((c) => c.startsAt);
      const sorted = starts.slice().sort();
      expect(starts).toEqual(sorted);
    }
  });

  it("(34) status cancelled sai dos conflitos após changeStatus", async () => {
    const { env, services } = seededEnv();
    const sel = await getSeededAssignment(env);
    const extra = await createOverlapping(
      env,
      "Extra",
      dt("2026-01-19T10:20:00.000Z"),
      dt("2026-01-19T10:30:00.000Z"),
    );
    const r1 = await checkAppointmentAvailability({
      services,
      context: OWNER_ALFA,
      accessibleCases: [SEED_CASE_ALFA_2_ID],
      selectedAssignment: sel,
      candidate: CANDIDATE_OVERLAP,
    });
    expect(r1.status).toBe("conflicts");
    if (r1.status === "conflicts") expect(r1.conflicts.length).toBe(2);
    ok(
      await env.services.appointments.changeStatus(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_2_ID,
        appointmentId: extra.id,
        status: "cancelled",
        expectedVersion: extra.metadata.version,
      }),
    );
    const r2 = await checkAppointmentAvailability({
      services,
      context: OWNER_ALFA,
      accessibleCases: [SEED_CASE_ALFA_2_ID],
      selectedAssignment: sel,
      candidate: CANDIDATE_OVERLAP,
    });
    expect(r2.status).toBe("conflicts");
    if (r2.status === "conflicts") expect(r2.conflicts.length).toBe(1);
  });

  it("(35) paginação forçada de appointments encontra todos os conflitos", async () => {
    const { env, services } = seededEnv();
    const sel = await getSeededAssignment(env);
    // AP_A2_2 já existe (1). Criamos mais 2 sobrepostos = 3 no total.
    await createOverlapping(
      env,
      "Pg A",
      dt("2026-01-19T10:15:00.000Z"),
      dt("2026-01-19T10:20:00.000Z"),
    );
    await createOverlapping(
      env,
      "Pg B",
      dt("2026-01-19T10:40:00.000Z"),
      dt("2026-01-19T10:50:00.000Z"),
    );
    const r = await checkAppointmentAvailability({
      services,
      context: OWNER_ALFA,
      accessibleCases: [SEED_CASE_ALFA_2_ID],
      selectedAssignment: sel,
      candidate: {
        startsAt: dt("2026-01-19T10:10:00.000Z"),
        endsAt: dt("2026-01-19T10:55:00.000Z"),
        assignmentId: SEED_ASSIGN_ALFA_1_ID,
      },
      pageLimits: { appointments: 1, assignments: 1 },
    });
    expect(r.status).toBe("conflicts");
    if (r.status === "conflicts") {
      expect(r.conflicts.length).toBe(3);
    }
  });

  it("(36) propaga erro do serviço de appointments como error/appointments", async () => {
    const sel = await getSeededAssignment(seededEnv().env);
    const failingServices: AvailabilityServices = {
      assignments: {
        listByCase: async () =>
          ({ ok: true, data: { items: [sel], nextCursor: undefined } }) as ServiceResult<{
            readonly items: readonly Assignment[];
            readonly nextCursor?: string;
          }>,
      },
      appointments: {
        list: async () =>
          ({ ok: false, error: { code: "unavailable", message: "x" } }) as ServiceResult<{
            readonly items: readonly Appointment[];
            readonly nextCursor?: string;
          }>,
      },
    };
    const r = await checkAppointmentAvailability({
      services: failingServices,
      context: OWNER_ALFA,
      accessibleCases: [SEED_CASE_ALFA_2_ID],
      selectedAssignment: sel,
      candidate: CANDIDATE_OVERLAP,
    });
    expect(r.status).toBe("error");
    if (r.status === "error") {
      expect(r.source).toBe("appointments");
      expect(r.message).toBe("unavailable");
    }
  });

  it("(37) propaga erro do serviço de assignments como error/assignments", async () => {
    const sel = await getSeededAssignment(seededEnv().env);
    const failingServices: AvailabilityServices = {
      assignments: {
        listByCase: async () =>
          ({ ok: false, error: { code: "unavailable", message: "x" } }) as ServiceResult<never>,
      },
      appointments: {
        list: async () =>
          ({ ok: true, data: { items: [], nextCursor: undefined } }) as ServiceResult<{
            readonly items: readonly Appointment[];
            readonly nextCursor?: string;
          }>,
      },
    };
    const r = await checkAppointmentAvailability({
      services: failingServices,
      context: OWNER_ALFA,
      accessibleCases: [SEED_CASE_ALFA_2_ID as CaseId],
      selectedAssignment: sel,
      candidate: CANDIDATE_OVERLAP,
    });
    expect(r.status).toBe("error");
    if (r.status === "error") expect(r.source).toBe("assignments");
  });
});
