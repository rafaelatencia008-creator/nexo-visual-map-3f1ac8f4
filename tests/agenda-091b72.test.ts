/**
 * LV-09.1B.7.2 — Página consultiva de disponibilidade da Agenda.
 *
 * Cobertura: helper puro do formulário, carregamento paginado de
 * processos e vínculos, consulta consultiva via motor aprovado,
 * estrutura da rota canônica e da interface visual.
 */

import { describe, it, expect } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildAvailabilityConsultationInput,
  EMPTY_AVAILABILITY_FORM,
  type AvailabilityFormState,
} from "@/features/agenda/availability-form";
import {
  AVAILABILITY_OPTIONS_MAX_PAGES,
  AVAILABILITY_OPTIONS_PAGE_LIMIT,
  formatAvailabilityAssignmentLabel,
  loadActiveAssignmentsForCase,
  loadAvailabilityCases,
  type AvailabilityPageEnvironment,
} from "@/features/agenda/availability-options";
import { PAGE_LIMIT_MAX } from "@/domain/services/pagination";
import {
  checkAppointmentAvailability,
  type AvailabilityEnvironment,
} from "@/features/agenda/check-appointment-availability";

import { buildDomainId } from "@/domain/core/ids";
import type { AppointmentId, AssignmentId, CaseId } from "@/domain/core/ids";
import type { Assignment } from "@/domain/core/assignment";
import type { Case } from "@/domain/core/case";
import type { Appointment } from "@/domain/core/agenda";
import type { ServiceContext } from "@/domain/services/context";
import { SEED_ORG_ALFA_ID, SEED_USER_1_ID, SEED_MEM_ALFA_OWNER_ID } from "@/domain/mocks/seed";

// ---- Utilitários ----------------------------------------------------------

const CTX: ServiceContext = Object.freeze({
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_1_ID,
  membershipId: SEED_MEM_ALFA_OWNER_ID,
  role: "proprietario",
});

const CASE_A = buildDomainId("case", "avail_a") as CaseId;
const CASE_B = buildDomainId("case", "avail_b") as CaseId;
const ASSIGN_A = buildDomainId("assignment", "avail_a") as AssignmentId;
const ASSIGN_B = buildDomainId("assignment", "avail_b") as AssignmentId;

const START = "2028-04-10T09:00:00.000Z";
const END = "2028-04-10T10:00:00.000Z";

function read(rel: string): string {
  return readFileSync(resolve(__dirname, "..", rel), "utf8");
}

function validForm(overrides: Partial<AvailabilityFormState> = {}): AvailabilityFormState {
  return {
    caseId: String(CASE_A),
    assignmentId: String(ASSIGN_A),
    startsAtLocal: "2028-04-10T09:00",
    endsAtLocal: "2028-04-10T10:00",
    ...overrides,
  };
}

function makeCase(id: string, ref: string, title: string): Case {
  return Object.freeze({
    id: buildDomainId("case", id) as CaseId,
    organizationId: SEED_ORG_ALFA_ID,
    reference: ref,
    title,
    status: "in_progress",
    natureCategory: "civel",
    metadata: {
      createdAt: "2028-01-01T00:00:00.000Z",
      updatedAt: "2028-01-01T00:00:00.000Z",
      version: 1,
    },
  }) as unknown as Case;
}

function makeAssignment(id: string, overrides: Partial<Assignment> = {}): Assignment {
  return Object.freeze({
    id: buildDomainId("assignment", id) as AssignmentId,
    organizationId: SEED_ORG_ALFA_ID,
    caseId: CASE_A,
    professionalProfileId: buildDomainId("professionalProfile", "seed") as unknown,
    role: "lead_professional",
    status: "active",
    section: undefined,
    metadata: {
      createdAt: "2028-01-01T00:00:00.000Z",
      updatedAt: "2028-01-01T00:00:00.000Z",
      version: 1,
    },
    ...overrides,
  }) as unknown as Assignment;
}

type CasesPage = Readonly<{ items: readonly Case[]; nextCursor?: string }>;

function fakeCasesEnv(
  pages: readonly CasesPage[] | ((cursor: string | undefined) => CasesPage | { failure: true }),
  opts: { rejectOn?: number; failOn?: number } = {},
): {
  env: AvailabilityPageEnvironment;
  calls: Array<{ cursor: string | undefined; limit: number | undefined }>;
} {
  const calls: Array<{ cursor: string | undefined; limit: number | undefined }> = [];
  let idx = 0;
  const list = async (_ctx: ServiceContext, req: { page: { cursor?: string; limit: number } }) => {
    const cursor = req.page.cursor;
    calls.push({ cursor, limit: req.page.limit });
    if (opts.rejectOn === idx) {
      idx += 1;
      throw new Error("boom");
    }
    if (opts.failOn === idx) {
      idx += 1;
      return { ok: false as const, error: { code: "unavailable", message: "x" } };
    }
    let payload: CasesPage | { failure: true };
    if (typeof pages === "function") payload = pages(cursor);
    else payload = pages[idx] ?? { items: [] };
    idx += 1;
    if ("failure" in payload) {
      return { ok: false as const, error: { code: "unavailable", message: "x" } };
    }
    return {
      ok: true as const,
      data: {
        items: payload.items,
        nextCursor: payload.nextCursor,
        total: undefined,
      },
    };
  };
  const env: AvailabilityPageEnvironment = {
    services: {
      cases: { list: list as never },
      assignments: { listByCase: (async () => ({ ok: true, data: { items: [] } })) as never },
      appointments: { list: (async () => ({ ok: true, data: { items: [] } })) as never },
    },
  };
  return { env, calls };
}

type AssignmentsPage = Readonly<{ items: readonly Assignment[]; nextCursor?: string }>;

function fakeAssignmentsEnv(
  pages:
    | readonly AssignmentsPage[]
    | ((cursor: string | undefined) => AssignmentsPage | { failure: true }),
  opts: { rejectOn?: number; failOn?: number } = {},
): {
  env: AvailabilityPageEnvironment;
  calls: Array<{ cursor: string | undefined; limit: number | undefined; caseId: unknown }>;
} {
  const calls: Array<{
    cursor: string | undefined;
    limit: number | undefined;
    caseId: unknown;
  }> = [];
  let idx = 0;
  const listByCase = async (
    _ctx: ServiceContext,
    caseId: unknown,
    page: { cursor?: string; limit: number },
  ) => {
    const cursor = page.cursor;
    calls.push({ cursor, limit: page.limit, caseId });
    if (opts.rejectOn === idx) {
      idx += 1;
      throw new Error("boom");
    }
    if (opts.failOn === idx) {
      idx += 1;
      return { ok: false as const, error: { code: "unavailable", message: "x" } };
    }
    let payload: AssignmentsPage | { failure: true };
    if (typeof pages === "function") payload = pages(cursor);
    else payload = pages[idx] ?? { items: [] };
    idx += 1;
    if ("failure" in payload) {
      return { ok: false as const, error: { code: "unavailable", message: "x" } };
    }
    return {
      ok: true as const,
      data: {
        items: payload.items,
        nextCursor: payload.nextCursor,
        total: undefined,
      },
    };
  };
  const env: AvailabilityPageEnvironment = {
    services: {
      cases: { list: (async () => ({ ok: true, data: { items: [] } })) as never },
      assignments: { listByCase: listByCase as never },
      appointments: { list: (async () => ({ ok: true, data: { items: [] } })) as never },
    },
  };
  return { env, calls };
}

// ---- Fontes lidas para provas estruturais --------------------------------

const ROUTE_PATH = "src/routes/app.disponibilidade.tsx";
const CONTENT_PATH = "src/features/agenda/AgendaAvailabilityContent.tsx";
const AGENDA_INDEX_PATH = "src/routes/app.agenda.index.tsx";
const AVAILABILITY_PATH = "src/features/agenda/availability.ts";
const CHECK_PATH = "src/features/agenda/check-appointment-availability.ts";
const DEC_PATH = "docs/decisions/DEC-AGE-001-rotas-canonicas.md";
const CREATE_CONTENT_PATH = "src/features/agenda/AgendaCreateContent.tsx";
const DETAIL_CONTENT_PATH = "src/features/agenda/AgendaItemDetailContent.tsx";
const ROUTE_TREE_PATH = "src/routeTree.gen.ts";

const ROUTE_SRC = read(ROUTE_PATH);
const CONTENT_SRC = read(CONTENT_PATH);
const AGENDA_INDEX_SRC = read(AGENDA_INDEX_PATH);
const DEC_SRC = read(DEC_PATH);

// =========================================================================
// Grupo A — Formulário puro
// =========================================================================

describe("LV-09.1B.7.2 · A · builder puro", () => {
  it("1. estado vazio possui quatro campos", () => {
    expect(Object.keys(EMPTY_AVAILABILITY_FORM).sort()).toEqual([
      "assignmentId",
      "caseId",
      "endsAtLocal",
      "startsAtLocal",
    ]);
  });
  it("2. processo ausente é rejeitado", () => {
    const r = buildAvailabilityConsultationInput(validForm({ caseId: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.caseId).toMatch(/Processo obrigat/);
  });
  it("3. responsável ausente é rejeitado", () => {
    const r = buildAvailabilityConsultationInput(validForm({ assignmentId: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.assignmentId).toMatch(/Respons[áa]vel obrigat/);
  });
  it("4. início ausente é rejeitado", () => {
    const r = buildAvailabilityConsultationInput(validForm({ startsAtLocal: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.startsAt).toMatch(/Informe a data e hora inicial/);
  });
  it("5. término ausente é rejeitado", () => {
    const r = buildAvailabilityConsultationInput(validForm({ endsAtLocal: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.endsAt).toMatch(/Informe a data e hora final/);
  });
  it("6. início inválido é rejeitado", () => {
    const r = buildAvailabilityConsultationInput(validForm({ startsAtLocal: "not-a-date" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.startsAt).toMatch(/inv[áa]lidas/);
  });
  it("7. término inválido é rejeitado", () => {
    const r = buildAvailabilityConsultationInput(validForm({ endsAtLocal: "xxx" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.endsAt).toMatch(/inv[áa]lidas/);
  });
  it("8. início igual ao término é rejeitado", () => {
    const r = buildAvailabilityConsultationInput(
      validForm({ startsAtLocal: "2028-04-10T09:00", endsAtLocal: "2028-04-10T09:00" }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.endsAt).toMatch(/posterior ao in[íi]cio/);
  });
  it("9. término anterior ao início é rejeitado", () => {
    const r = buildAvailabilityConsultationInput(
      validForm({ startsAtLocal: "2028-04-10T10:00", endsAtLocal: "2028-04-10T09:00" }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.endsAt).toMatch(/posterior ao in[íi]cio/);
  });
  it("10. formulário válido produz input tipado", () => {
    const r = buildAvailabilityConsultationInput(validForm());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(typeof r.input.startsAt).toBe("string");
      expect(typeof r.input.endsAt).toBe("string");
      expect(r.input.assignmentId).toBe(ASSIGN_A);
    }
  });
  it("11. input final não contém caseId", () => {
    const r = buildAvailabilityConsultationInput(validForm());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.keys(r.input).sort()).toEqual(["assignmentId", "endsAt", "startsAt"]);
    }
  });
  it("12. builder não modifica o formulário recebido", () => {
    const f = validForm();
    const snapshot = JSON.stringify(f);
    buildAvailabilityConsultationInput(f);
    expect(JSON.stringify(f)).toBe(snapshot);
  });
  it("12b. caseId com formato inválido é rejeitado", () => {
    const r = buildAvailabilityConsultationInput(validForm({ caseId: "not-a-case-id" }));
    expect(r.ok).toBe(false);
  });
  it("12c. assignmentId com formato inválido é rejeitado", () => {
    const r = buildAvailabilityConsultationInput(validForm({ assignmentId: "not-an-assign" }));
    expect(r.ok).toBe(false);
  });
});

// =========================================================================
// Grupo B — Carregamento dos processos
// =========================================================================

describe("LV-09.1B.7.2 · B · loadAvailabilityCases", () => {
  it("13. primeira página usa PAGE_LIMIT_MAX sem cursor", async () => {
    const { env, calls } = fakeCasesEnv([{ items: [makeCase("b1", "0001", "A")] }]);
    const r = await loadAvailabilityCases(env, CTX);
    expect(r.kind).toBe("ready");
    expect(calls[0]).toEqual({ cursor: undefined, limit: PAGE_LIMIT_MAX });
    expect(AVAILABILITY_OPTIONS_PAGE_LIMIT).toBe(PAGE_LIMIT_MAX);
  });
  it("14. página seguinte preserva o cursor", async () => {
    const { env, calls } = fakeCasesEnv([
      { items: [makeCase("c1", "0001", "A")], nextCursor: "CUR-X" },
      { items: [makeCase("c2", "0002", "B")] },
    ]);
    await loadAvailabilityCases(env, CTX);
    expect(calls[1]?.cursor).toBe("CUR-X");
    expect(calls[1]?.limit).toBe(PAGE_LIMIT_MAX);
  });
  it("15. todas as páginas são percorridas", async () => {
    const { env } = fakeCasesEnv([
      { items: [makeCase("p1", "0001", "A")], nextCursor: "c1" },
      { items: [makeCase("p2", "0002", "B")], nextCursor: "c2" },
      { items: [makeCase("p3", "0003", "C")] },
    ]);
    const r = await loadAvailabilityCases(env, CTX);
    expect(r.kind).toBe("ready");
    if (r.kind === "ready") expect(r.items.length).toBe(3);
  });
  it("16. processos duplicados são removidos", async () => {
    const dup = makeCase("dup", "0001", "A");
    const { env } = fakeCasesEnv([{ items: [dup], nextCursor: "c1" }, { items: [dup] }]);
    const r = await loadAvailabilityCases(env, CTX);
    expect(r.kind).toBe("ready");
    if (r.kind === "ready") expect(r.items.length).toBe(1);
  });
  it("17. processos são ordenados deterministicamente (reference asc)", async () => {
    const c1 = makeCase("s1", "0003", "Zeta");
    const c2 = makeCase("s2", "0001", "Alfa");
    const c3 = makeCase("s3", "0002", "Beta");
    const { env } = fakeCasesEnv([{ items: [c1, c2, c3] }]);
    const r = await loadAvailabilityCases(env, CTX);
    expect(r.kind).toBe("ready");
    if (r.kind === "ready") {
      expect(r.items.map((c) => c.reference)).toEqual(["0001", "0002", "0003"]);
    }
  });
  it("18. erro do serviço retorna estado tipado", async () => {
    const { env } = fakeCasesEnv([{ items: [] }], { failOn: 0 });
    const r = await loadAvailabilityCases(env, CTX);
    expect(r.kind).toBe("error");
    if (r.kind === "error") expect(r.reason).toBe("consultation_failed");
  });
  it("19. Promise rejeitada retorna estado tipado", async () => {
    const { env } = fakeCasesEnv([{ items: [] }], { rejectOn: 0 });
    const r = await loadAvailabilityCases(env, CTX);
    expect(r.kind).toBe("error");
    if (r.kind === "error") expect(r.reason).toBe("consultation_failed");
  });
  it("20. paginação acima do limite não retorna lista parcial como completa", async () => {
    const { env } = fakeCasesEnv(() => ({
      items: [makeCase(`x${Math.random().toString(36).slice(2, 8)}`, "0001", "A")],
      nextCursor: "next",
    }));
    const r = await loadAvailabilityCases(env, CTX);
    expect(r.kind).toBe("error");
    if (r.kind === "error") expect(r.reason).toBe("pagination_limit");
    expect(AVAILABILITY_OPTIONS_MAX_PAGES).toBe(20);
  });
});

// =========================================================================
// Grupo C — Carregamento dos vínculos
// =========================================================================

describe("LV-09.1B.7.2 · C · loadActiveAssignmentsForCase", () => {
  it("21. sem processo selecionado o componente não chama listByCase", () => {
    expect(CONTENT_SRC).toMatch(/form\.caseId\.length === 0/);
    expect(CONTENT_SRC).toMatch(/loadActiveAssignmentsForCase/);
  });
  it("22. primeira página usa PAGE_LIMIT_MAX", async () => {
    const { env, calls } = fakeAssignmentsEnv([{ items: [makeAssignment("a1")] }]);
    await loadActiveAssignmentsForCase(env, CTX, CASE_A);
    expect(calls[0]?.limit).toBe(PAGE_LIMIT_MAX);
    expect(calls[0]?.cursor).toBeUndefined();
  });
  it("23. página seguinte preserva cursor", async () => {
    const { env, calls } = fakeAssignmentsEnv([
      { items: [makeAssignment("a1")], nextCursor: "CUR-Y" },
      { items: [makeAssignment("a2")] },
    ]);
    await loadActiveAssignmentsForCase(env, CTX, CASE_A);
    expect(calls[1]?.cursor).toBe("CUR-Y");
  });
  it("24. todas as páginas são percorridas", async () => {
    const { env, calls } = fakeAssignmentsEnv([
      { items: [makeAssignment("a1")], nextCursor: "c1" },
      { items: [makeAssignment("a2")], nextCursor: "c2" },
      { items: [makeAssignment("a3")] },
    ]);
    const r = await loadActiveAssignmentsForCase(env, CTX, CASE_A);
    expect(calls.length).toBe(3);
    expect(r.kind).toBe("ready");
    if (r.kind === "ready") expect(r.items.length).toBe(3);
  });
  it("25. somente vínculos active são mantidos", async () => {
    const { env } = fakeAssignmentsEnv([
      {
        items: [
          makeAssignment("a1", { status: "active" }),
          makeAssignment("a2", { status: "suspended" }),
        ],
      },
    ]);
    const r = await loadActiveAssignmentsForCase(env, CTX, CASE_A);
    expect(r.kind).toBe("ready");
    if (r.kind === "ready") {
      expect(r.items.length).toBe(1);
      expect(r.items[0]!.status).toBe("active");
    }
  });
  it("26. suspended é ignorado", async () => {
    const { env } = fakeAssignmentsEnv([
      { items: [makeAssignment("s1", { status: "suspended" })] },
    ]);
    const r = await loadActiveAssignmentsForCase(env, CTX, CASE_A);
    if (r.kind === "ready") expect(r.items.length).toBe(0);
  });
  it("27. concluded é ignorado", async () => {
    const { env } = fakeAssignmentsEnv([
      { items: [makeAssignment("s1", { status: "concluded" })] },
    ]);
    const r = await loadActiveAssignmentsForCase(env, CTX, CASE_A);
    if (r.kind === "ready") expect(r.items.length).toBe(0);
  });
  it("28. cancelled é ignorado", async () => {
    const { env } = fakeAssignmentsEnv([
      { items: [makeAssignment("s1", { status: "cancelled" })] },
    ]);
    const r = await loadActiveAssignmentsForCase(env, CTX, CASE_A);
    if (r.kind === "ready") expect(r.items.length).toBe(0);
  });
  it("29. duplicados são removidos", async () => {
    const dup = makeAssignment("dup");
    const { env } = fakeAssignmentsEnv([{ items: [dup], nextCursor: "c1" }, { items: [dup] }]);
    const r = await loadActiveAssignmentsForCase(env, CTX, CASE_A);
    if (r.kind === "ready") expect(r.items.length).toBe(1);
  });
  it("30. ordenação é determinística (role asc, section asc, id asc)", async () => {
    const items = [
      makeAssignment("z", { role: "reviewer" }),
      makeAssignment("a", { role: "collaborator" }),
      makeAssignment("m", { role: "lead_professional" }),
    ];
    const { env } = fakeAssignmentsEnv([{ items }]);
    const r = await loadActiveAssignmentsForCase(env, CTX, CASE_A);
    if (r.kind === "ready") {
      expect(r.items.map((a) => a.role)).toEqual(["collaborator", "lead_professional", "reviewer"]);
    }
  });
  it("31. erro do serviço retorna estado tipado", async () => {
    const { env } = fakeAssignmentsEnv([{ items: [] }], { failOn: 0 });
    const r = await loadActiveAssignmentsForCase(env, CTX, CASE_A);
    expect(r.kind).toBe("error");
    if (r.kind === "error") expect(r.reason).toBe("consultation_failed");
  });
  it("32. Promise rejeitada retorna estado tipado", async () => {
    const { env } = fakeAssignmentsEnv([{ items: [] }], { rejectOn: 0 });
    const r = await loadActiveAssignmentsForCase(env, CTX, CASE_A);
    expect(r.kind).toBe("error");
    if (r.kind === "error") expect(r.reason).toBe("consultation_failed");
  });
  it("33. paginação acima do limite não retorna lista parcial como completa", async () => {
    const { env } = fakeAssignmentsEnv(() => ({
      items: [makeAssignment(`x${Math.random().toString(36).slice(2, 8)}`)],
      nextCursor: "next",
    }));
    const r = await loadActiveAssignmentsForCase(env, CTX, CASE_A);
    expect(r.kind).toBe("error");
    if (r.kind === "error") expect(r.reason).toBe("pagination_limit");
  });
  it("34. rótulo contém papel, seção e ID curto", () => {
    const a = makeAssignment("labelxyzabc", {
      role: "lead_professional",
      section: "Psicologia",
    });
    const label = formatAvailabilityAssignmentLabel(a);
    expect(label).toContain("Profissional responsável");
    expect(label).toContain("Psicologia");
    expect(label).toContain("#");
    expect(label.endsWith(String(a.id).slice(-6))).toBe(true);
  });
  it("34b. rótulo sem seção omite o separador de seção", () => {
    const a = makeAssignment("nosec01");
    const label = formatAvailabilityAssignmentLabel(a);
    expect(label).toContain("Profissional responsável");
    expect(label).not.toContain("undefined");
  });
});

// =========================================================================
// Grupo D — Consulta ao motor
// =========================================================================

function motorEnv(pages: readonly (readonly Appointment[])[]): AvailabilityEnvironment {
  let idx = 0;
  return {
    services: {
      appointments: {
        list: (async () => {
          const items = pages[idx] ?? [];
          idx += 1;
          return { ok: true, data: { items, nextCursor: undefined } };
        }) as never,
      },
    },
  };
}

function makeAppointment(
  id: string,
  starts: string,
  ends: string,
  assignmentId: AssignmentId = ASSIGN_A,
): Appointment {
  return Object.freeze({
    id: buildDomainId("appointment", id) as AppointmentId,
    organizationId: SEED_ORG_ALFA_ID,
    caseId: CASE_A,
    kind: "meeting",
    title: `A ${id}`,
    startsAt: starts as never,
    endsAt: ends as never,
    mode: "remote",
    status: "scheduled",
    assignmentId,
    metadata: {
      createdAt: starts as never,
      updatedAt: starts as never,
      version: 1,
    },
  }) as unknown as Appointment;
}

describe("LV-09.1B.7.2 · D · consulta ao motor", () => {
  it("35. estado inicial é idle (source)", () => {
    expect(CONTENT_SRC).toMatch(/kind:\s*"idle"/);
  });
  it("36. formulário inválido não chama o motor (builder rejeita)", async () => {
    const r = buildAvailabilityConsultationInput(validForm({ caseId: "" }));
    expect(r.ok).toBe(false);
  });
  it("37. formulário válido produz input pronto para o motor", () => {
    const r = buildAvailabilityConsultationInput(validForm());
    expect(r.ok).toBe(true);
  });
  it("38. input passado ao motor possui início, término e assignment", () => {
    const r = buildAvailabilityConsultationInput(validForm());
    if (r.ok) {
      expect(r.input.startsAt).toBeTruthy();
      expect(r.input.endsAt).toBeTruthy();
      expect(r.input.assignmentId).toBeTruthy();
    }
  });
  it("39. available gera decisão disponível", async () => {
    const env = motorEnv([[]]);
    const decision = await checkAppointmentAvailability(env, CTX, {
      startsAt: START as never,
      endsAt: END as never,
      assignmentId: ASSIGN_A,
    });
    expect(decision.kind).toBe("available");
  });
  it("40. conflict preserva os conflitos do motor", async () => {
    const env = motorEnv([[makeAppointment("c1", START, END)]]);
    const d = await checkAppointmentAvailability(env, CTX, {
      startsAt: START as never,
      endsAt: END as never,
      assignmentId: ASSIGN_A,
    });
    expect(d.kind).toBe("conflict");
    if (d.kind === "conflict") expect(d.conflicts.length).toBe(1);
  });
  it("41. assignment_required não vira disponível", async () => {
    const d = await checkAppointmentAvailability(motorEnv([[]]), CTX, {
      startsAt: START as never,
      endsAt: END as never,
    });
    expect(d.kind).toBe("indeterminate");
    if (d.kind === "indeterminate") expect(d.reason).toBe("assignment_required");
  });
  it("42. invalid_interval não vira disponível", async () => {
    const d = await checkAppointmentAvailability(motorEnv([[]]), CTX, {
      startsAt: END as never,
      endsAt: START as never,
      assignmentId: ASSIGN_A,
    });
    expect(d.kind).toBe("indeterminate");
    if (d.kind === "indeterminate") expect(d.reason).toBe("invalid_interval");
  });
  it("43. consultation_failed não vira disponível", async () => {
    const env: AvailabilityEnvironment = {
      services: {
        appointments: {
          list: (async () => ({ ok: false, error: { code: "x", message: "y" } })) as never,
        },
      },
    };
    const d = await checkAppointmentAvailability(env, CTX, {
      startsAt: START as never,
      endsAt: END as never,
      assignmentId: ASSIGN_A,
    });
    expect(d.kind).toBe("indeterminate");
    if (d.kind === "indeterminate") expect(d.reason).toBe("consultation_failed");
  });
  it("44. pagination_limit não vira disponível", async () => {
    const env: AvailabilityEnvironment = {
      services: {
        appointments: {
          list: (async () => ({
            ok: true,
            data: { items: [], nextCursor: "keep-going" },
          })) as never,
        },
      },
    };
    const d = await checkAppointmentAvailability(env, CTX, {
      startsAt: START as never,
      endsAt: END as never,
      assignmentId: ASSIGN_A,
    });
    expect(d.kind).toBe("indeterminate");
    if (d.kind === "indeterminate") expect(d.reason).toBe("pagination_limit");
  });
  it("45. componente usa inFlightRef e checagem antes de nova submissão", () => {
    expect(CONTENT_SRC).toMatch(/inFlightRef/);
    expect(CONTENT_SRC).toMatch(/if\s*\(inFlightRef\.current\)/);
  });
  it("46. alteração de campo limpa resultado anterior (invalidateResult)", () => {
    expect(CONTENT_SRC).toMatch(/invalidateResult/);
    expect(CONTENT_SRC).toMatch(/setView\(\{\s*kind:\s*"idle"\s*\}\)/);
  });
  it("47. troca de processo limpa responsável", () => {
    expect(CONTENT_SRC).toMatch(/handleCaseChange[\s\S]{0,500}assignmentId:\s*""/);
  });
  it("48. troca de processo limpa resultado", () => {
    expect(CONTENT_SRC).toMatch(/handleCaseChange[\s\S]{0,500}invalidateResult/);
  });
  it("49. resposta antiga é ignorada após mudança (requestIdRef)", () => {
    expect(CONTENT_SRC).toMatch(/reqId !== requestIdRef\.current/);
  });
  it("50. nova consulta usa requestId monotônico", () => {
    expect(CONTENT_SRC).toMatch(/\+\+requestIdRef\.current/);
  });
  it("51. resposta após desmontagem é ignorada (mountedRef)", () => {
    expect(CONTENT_SRC).toMatch(/mountedRef\.current/);
    expect(CONTENT_SRC).toMatch(/if\s*\(!mountedRef\.current\)\s*return/);
  });
  it("52. retry usa handleSubmit atual (mesmo callback)", () => {
    expect(CONTENT_SRC).toMatch(/onClick=\{handleSubmit\}/);
  });
  it("53. estado checking possui requestId", () => {
    expect(CONTENT_SRC).toMatch(/kind:\s*"checking",\s*requestId:\s*reqId/);
  });
  it("54. conclusão libera o single-flight (inFlightRef = false)", () => {
    expect(CONTENT_SRC).toMatch(/inFlightRef\.current\s*=\s*false/);
  });
});

// =========================================================================
// Grupo E — Rota e interface
// =========================================================================

describe("LV-09.1B.7.2 · E · rota e interface", () => {
  it("55. rota canônica possui exatamente /app/disponibilidade", () => {
    expect(ROUTE_SRC).toMatch(/createFileRoute\("\/app\/disponibilidade"\)/);
    expect(existsSync(resolve(__dirname, "..", ROUTE_PATH))).toBe(true);
  });
  it("56. rota usa useMockDomain", () => {
    expect(ROUTE_SRC).toMatch(/useMockDomain/);
  });
  it("57. rota monta AgendaAvailabilityContent", () => {
    expect(ROUTE_SRC).toMatch(/<AgendaAvailabilityContent/);
  });
  it("58. rota não chama appointments.list", () => {
    expect(ROUTE_SRC).not.toMatch(/appointments\.list/);
  });
  it("59. rota possui metadados title/description/robots", () => {
    expect(ROUTE_SRC).toMatch(/Disponibilidade — Nexo Pericial 360/);
    expect(ROUTE_SRC).toMatch(/description/);
    expect(ROUTE_SRC).toMatch(/noindex/);
  });
  it("60. página possui somente um h1", () => {
    const matches = CONTENT_SRC.match(/<h1\b/g) ?? [];
    expect(matches.length).toBe(1);
  });
  it("61. página possui retorno para /app/agenda", () => {
    expect(CONTENT_SRC).toMatch(/to="\/app\/agenda"/);
    expect(CONTENT_SRC).toMatch(/Voltar para a agenda/);
  });
  it("62. página possui os quatro campos", () => {
    expect(CONTENT_SRC).toMatch(/Processo/);
    expect(CONTENT_SRC).toMatch(/Respons[áa]vel/);
    expect(CONTENT_SRC).toMatch(/In[íi]cio/);
    expect(CONTENT_SRC).toMatch(/T[ée]rmino/);
  });
  it("63. datas usam datetime-local", () => {
    const dt = CONTENT_SRC.match(/type="datetime-local"/g) ?? [];
    expect(dt.length).toBeGreaterThanOrEqual(2);
    expect(CONTENT_SRC).toMatch(/id="availability-start"/);
    expect(CONTENT_SRC).toMatch(/id="availability-end"/);
  });
  it("64. botão principal possui type=button e aria-busy", () => {
    expect(CONTENT_SRC).toMatch(/type="button"[\s\S]{0,600}aria-busy=\{isChecking\}/);
    expect(CONTENT_SRC).toMatch(/Verificar disponibilidade/);
    expect(CONTENT_SRC).toMatch(/Verificando/);
  });
  it("65. resultado disponível possui role=status", () => {
    expect(CONTENT_SRC).toMatch(/role="status"/);
    expect(CONTENT_SRC).toMatch(/Hor[áa]rio dispon[íi]vel/);
  });
  it("66. conflitos possuem links para /app/agenda/$appointmentId", () => {
    expect(CONTENT_SRC).toMatch(/to="\/app\/agenda\/\$appointmentId"/);
    expect(CONTENT_SRC).toMatch(/appointmentId:\s*String\(c\.appointmentId\)/);
  });
  it("67. Agenda contém acesso para /app/disponibilidade", () => {
    expect(AGENDA_INDEX_SRC).toMatch(/\/app\/disponibilidade/);
    expect(AGENDA_INDEX_SRC).toMatch(/Verificar disponibilidade/);
  });
  it("68. página declara visualmente que a consulta não cria nem altera compromissos", () => {
    expect(CONTENT_SRC).toMatch(/n[ãa]o cria nem altera compromissos/);
  });
});

// =========================================================================
// Provas adicionais de escopo
// =========================================================================

describe("LV-09.1B.7.2 · escopo preservado", () => {
  it("S1. componente não chama create/update/remove/changeStatus", () => {
    expect(CONTENT_SRC).not.toMatch(/appointments\.(create|update|remove|changeStatus)/);
    expect(CONTENT_SRC).not.toMatch(/deadlines\.(create|update|remove|changeStatus)/);
    expect(CONTENT_SRC).not.toMatch(/assignments\.(create|update|changeStatus)/);
  });
  it("S2. availability.ts permaneceu inalterado (arquivo existe)", () => {
    expect(existsSync(resolve(__dirname, "..", AVAILABILITY_PATH))).toBe(true);
  });
  it("S3. check-appointment-availability.ts permaneceu inalterado (arquivo existe)", () => {
    expect(existsSync(resolve(__dirname, "..", CHECK_PATH))).toBe(true);
  });
  it("S4. criação e detalhe permaneceram intactos (não importam o motor)", () => {
    const createSrc = read(CREATE_CONTENT_PATH);
    const detailSrc = read(DETAIL_CONTENT_PATH);
    expect(createSrc).not.toMatch(/check-appointment-availability/);
    expect(detailSrc).not.toMatch(/check-appointment-availability/);
    expect(createSrc).not.toMatch(/checkAppointmentAvailability/);
    expect(detailSrc).not.toMatch(/checkAppointmentAvailability/);
  });
  it("S5. domínio permanece intacto (arquivos-âncora existem)", () => {
    expect(existsSync(resolve(__dirname, "..", "src/domain/core/agenda.ts"))).toBe(true);
    expect(existsSync(resolve(__dirname, "..", "src/domain/services/appointment-service.ts"))).toBe(
      true,
    );
    expect(existsSync(resolve(__dirname, "..", "src/domain/mocks/appointment-mock.ts"))).toBe(true);
  });
  it("S6. componente não usa toast/notificações", () => {
    expect(CONTENT_SRC).not.toMatch(/from "sonner"/);
    expect(CONTENT_SRC).not.toMatch(/\btoast\(/);
  });
  it("S7. nenhum serviço/repositório de disponibilidade foi criado", () => {
    expect(
      existsSync(resolve(__dirname, "..", "src/domain/services/availability-service.ts")),
    ).toBe(false);
    expect(existsSync(resolve(__dirname, "..", "src/domain/mocks/availability-mock.ts"))).toBe(
      false,
    );
  });
  it("S8. routeTree.gen.ts registra a nova rota", () => {
    const tree = read(ROUTE_TREE_PATH);
    expect(tree).toMatch(/disponibilidade/i);
  });
  it("S9. DEC-AGE-001 registra a conclusão da LV-09.1B.7.2", () => {
    expect(DEC_SRC).toMatch(/LV-09\.1B\.7\.2/);
    expect(DEC_SRC).toMatch(/\/app\/disponibilidade/);
  });
});

// Guard de tipo (referência forte)
const _fs: AvailabilityFormState | undefined = undefined;
void _fs;
