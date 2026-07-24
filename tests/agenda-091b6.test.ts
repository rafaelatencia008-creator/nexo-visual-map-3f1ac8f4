/**
 * LV-09.1B.6 — Testes comportamentais de transição de status e exclusão de
 * itens da Agenda. Cobre:
 *  - helpers puros em `item-mutations.ts` (rótulos, listas de ações,
 *    builders de DTO oficial, tradução de erros e sincronização de exclusão);
 *  - integração com os serviços oficiais `changeStatus` e `remove` para
 *    Deadlines e Appointments, incluindo concorrência otimista,
 *    permissões, catálogo de status e isolamento cross-org;
 *  - regressões de fonte em `AgendaItemDetailDialog.tsx` e
 *    `app.agenda.tsx` que provam a existência do fluxo, do bloqueio
 *    síncrono e da nova seção "Ações do item".
 */

import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { createMockDomainEnvironment } from "@/domain/mocks";
import {
  SEED_ORG_ALFA_ID,
  SEED_ORG_BETA_ID,
  SEED_USER_1_ID,
  SEED_USER_2_ID,
  SEED_MEM_ALFA_OWNER_ID,
  SEED_MEM_BETA_OWNER_ID,
  SEED_CASE_ALFA_1_ID,
} from "@/domain/mocks/seed";
import type { ServiceContext } from "@/domain/services/context";
import type { ServiceResult } from "@/domain/services/result";
import { isIsoDateTime, type IsoDateTime } from "@/domain/core/common";
import {
  APPOINTMENT_STATUSES,
  DEADLINE_STATUSES,
} from "@/domain/core/agenda";
import {
  AGENDA_MUTATION_MESSAGES,
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_ORDER,
  DEADLINE_STATUS_LABEL,
  DEADLINE_STATUS_ORDER,
  buildChangeAppointmentStatusInput,
  buildChangeDeadlineStatusInput,
  getAppointmentStatusActions,
  getDeadlineStatusActions,
  resolvePendingRemovalAction,
  translateAgendaMutationError,
} from "@/features/agenda/item-mutations";

// ---- Helpers -------------------------------------------------------------

function dt(v: string): IsoDateTime {
  if (!isIsoDateTime(v)) throw new Error(`ISO inválido: ${v}`);
  return v;
}
function ok<T>(r: ServiceResult<T>): T {
  if (!r.ok) throw new Error("service failed: " + JSON.stringify(r.error));
  return r.data;
}
function fail<T>(r: ServiceResult<T>) {
  if (r.ok) throw new Error("expected failure");
  return r.error;
}

const OWNER_ALFA: ServiceContext = Object.freeze({
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_1_ID,
  membershipId: SEED_MEM_ALFA_OWNER_ID,
  role: "proprietario",
});
const READONLY_ALFA: ServiceContext = Object.freeze({
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_1_ID,
  membershipId: SEED_MEM_ALFA_OWNER_ID,
  role: "leitura",
});
const OWNER_BETA: ServiceContext = Object.freeze({
  organizationId: SEED_ORG_BETA_ID,
  userId: SEED_USER_2_ID,
  membershipId: SEED_MEM_BETA_OWNER_ID,
  role: "proprietario",
});

async function makeDeadline(env: ReturnType<typeof createMockDomainEnvironment>) {
  return ok(
    await env.services.deadlines.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "internal",
      title: "Prazo LV-09.1B.6",
      dueAt: dt("2026-06-15T10:30:00.000Z"),
      priority: "normal",
    }),
  );
}
async function makeAppointment(env: ReturnType<typeof createMockDomainEnvironment>) {
  return ok(
    await env.services.appointments.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "meeting",
      title: "Compromisso LV-09.1B.6",
      startsAt: dt("2026-06-15T10:00:00.000Z"),
      endsAt: dt("2026-06-15T11:00:00.000Z"),
      mode: "remote",
    }),
  );
}

const DETAIL_SRC = readFileSync(
  "src/features/agenda/AgendaItemDetailDialog.tsx",
  "utf8",
);
const AGENDA_ROUTE_SRC = readFileSync("src/routes/app.agenda.tsx", "utf8");
const MUT_SRC = readFileSync(
  "src/features/agenda/item-mutations.ts",
  "utf8",
);

// =========================================================================
// 1) Catálogo, rótulos e ordem determinística
// =========================================================================

describe("LV-09.1B.6 — catálogo e rótulos", () => {
  it("1. DEADLINE_STATUS_LABEL cobre exatamente o catálogo oficial", () => {
    for (const s of DEADLINE_STATUSES) {
      expect(typeof DEADLINE_STATUS_LABEL[s]).toBe("string");
    }
    expect(Object.keys(DEADLINE_STATUS_LABEL).sort()).toEqual(
      [...DEADLINE_STATUSES].sort(),
    );
  });
  it("2. APPOINTMENT_STATUS_LABEL cobre exatamente o catálogo oficial", () => {
    for (const s of APPOINTMENT_STATUSES) {
      expect(typeof APPOINTMENT_STATUS_LABEL[s]).toBe("string");
    }
    expect(Object.keys(APPOINTMENT_STATUS_LABEL).sort()).toEqual(
      [...APPOINTMENT_STATUSES].sort(),
    );
  });
  it("3. DEADLINE_STATUS_ORDER preserva a ordem oficial", () => {
    expect(DEADLINE_STATUS_ORDER).toEqual(DEADLINE_STATUSES);
  });
  it("4. APPOINTMENT_STATUS_ORDER preserva a ordem oficial", () => {
    expect(APPOINTMENT_STATUS_ORDER).toEqual(APPOINTMENT_STATUSES);
  });
  it("5. rótulos e catálogo estão congelados (Object.freeze)", () => {
    expect(Object.isFrozen(DEADLINE_STATUS_LABEL)).toBe(true);
    expect(Object.isFrozen(APPOINTMENT_STATUS_LABEL)).toBe(true);
    expect(Object.isFrozen(DEADLINE_STATUS_ORDER)).toBe(true);
    expect(Object.isFrozen(APPOINTMENT_STATUS_ORDER)).toBe(true);
    expect(Object.isFrozen(AGENDA_MUTATION_MESSAGES)).toBe(true);
  });
});

// =========================================================================
// 2) getDeadlineStatusActions / getAppointmentStatusActions
// =========================================================================

describe("LV-09.1B.6 — getDeadlineStatusActions", () => {
  it("6. nunca oferece o mesmo estado atual", () => {
    for (const s of DEADLINE_STATUSES) {
      const acts = getDeadlineStatusActions(s);
      expect(acts.some((a) => a.status === s)).toBe(false);
    }
  });
  it("7. oferece todos os outros estados do catálogo", () => {
    for (const s of DEADLINE_STATUSES) {
      const acts = getDeadlineStatusActions(s);
      expect(acts.length).toBe(DEADLINE_STATUSES.length - 1);
      const set = new Set(acts.map((a) => a.status));
      for (const other of DEADLINE_STATUSES) {
        if (other !== s) expect(set.has(other)).toBe(true);
      }
    }
  });
  it("8. actionLabel/confirmTitle não vazios", () => {
    const acts = getDeadlineStatusActions("pending");
    for (const a of acts) {
      expect(a.actionLabel.length).toBeGreaterThan(0);
      expect(a.confirmTitle.length).toBeGreaterThan(0);
    }
  });
  it("9. targetLabel/currentLabel refletem DEADLINE_STATUS_LABEL", () => {
    const acts = getDeadlineStatusActions("pending");
    for (const a of acts) {
      expect(a.targetLabel).toBe(DEADLINE_STATUS_LABEL[a.status]);
      expect(a.currentLabel).toBe(DEADLINE_STATUS_LABEL.pending);
    }
  });
  it("10. cada ação está congelada", () => {
    const acts = getDeadlineStatusActions("pending");
    for (const a of acts) expect(Object.isFrozen(a)).toBe(true);
  });
});

describe("LV-09.1B.6 — getAppointmentStatusActions", () => {
  it("11. nunca oferece o mesmo estado atual", () => {
    for (const s of APPOINTMENT_STATUSES) {
      const acts = getAppointmentStatusActions(s);
      expect(acts.some((a) => a.status === s)).toBe(false);
    }
  });
  it("12. oferece todos os outros estados", () => {
    for (const s of APPOINTMENT_STATUSES) {
      const acts = getAppointmentStatusActions(s);
      expect(acts.length).toBe(APPOINTMENT_STATUSES.length - 1);
    }
  });
  it("13. rótulos refletem catálogo", () => {
    const acts = getAppointmentStatusActions("scheduled");
    for (const a of acts) {
      expect(a.targetLabel).toBe(APPOINTMENT_STATUS_LABEL[a.status]);
      expect(a.currentLabel).toBe(APPOINTMENT_STATUS_LABEL.scheduled);
    }
  });
  it("14. cada ação está congelada", () => {
    const acts = getAppointmentStatusActions("scheduled");
    for (const a of acts) expect(Object.isFrozen(a)).toBe(true);
  });
});

// =========================================================================
// 3) Builders de DTO oficial
// =========================================================================

describe("LV-09.1B.6 — buildChangeDeadlineStatusInput", () => {
  it("15. produz DTO com caseId, deadlineId, status e expectedVersion", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const input = buildChangeDeadlineStatusInput(d, "completed", 7);
    expect(input.caseId).toBe(d.caseId);
    expect(input.deadlineId).toBe(d.id);
    expect(input.status).toBe("completed");
    expect(input.expectedVersion).toBe(7);
  });
  it("16. objeto congelado (sem mutação)", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const input = buildChangeDeadlineStatusInput(d, "cancelled", 1);
    expect(Object.isFrozen(input)).toBe(true);
  });
  it("17. permite todos os estados do catálogo", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    for (const s of DEADLINE_STATUSES) {
      const input = buildChangeDeadlineStatusInput(d, s, 1);
      expect(input.status).toBe(s);
    }
  });
});

describe("LV-09.1B.6 — buildChangeAppointmentStatusInput", () => {
  it("18. produz DTO com caseId, appointmentId, status e expectedVersion", async () => {
    const env = createMockDomainEnvironment();
    const a = await makeAppointment(env);
    const input = buildChangeAppointmentStatusInput(a, "completed", 3);
    expect(input.caseId).toBe(a.caseId);
    expect(input.appointmentId).toBe(a.id);
    expect(input.status).toBe("completed");
    expect(input.expectedVersion).toBe(3);
  });
  it("19. objeto congelado", async () => {
    const env = createMockDomainEnvironment();
    const a = await makeAppointment(env);
    const input = buildChangeAppointmentStatusInput(a, "cancelled", 1);
    expect(Object.isFrozen(input)).toBe(true);
  });
  it("20. permite todos os estados do catálogo", async () => {
    const env = createMockDomainEnvironment();
    const a = await makeAppointment(env);
    for (const s of APPOINTMENT_STATUSES) {
      const input = buildChangeAppointmentStatusInput(a, s, 1);
      expect(input.status).toBe(s);
    }
  });
});

// =========================================================================
// 4) Tradutor de erros
// =========================================================================

describe("LV-09.1B.6 — translateAgendaMutationError", () => {
  it("21. conflict preserva expected/actual", () => {
    const t = translateAgendaMutationError({
      code: "conflict",
      message: "x",
      expectedVersion: 1,
      actualVersion: 2,
    });
    expect(t.kind).toBe("conflict");
    expect(t.expectedVersion).toBe(1);
    expect(t.actualVersion).toBe(2);
    expect(t.message).toBe(AGENDA_MUTATION_MESSAGES.conflict);
  });
  it("22. forbidden mapeia para kind forbidden", () => {
    const t = translateAgendaMutationError({ code: "forbidden", message: "x" });
    expect(t.kind).toBe("forbidden");
    expect(t.message).toBe(AGENDA_MUTATION_MESSAGES.forbidden);
  });
  it("23. unauthorized mapeia para forbidden (mesma UX)", () => {
    const t = translateAgendaMutationError({
      code: "unauthorized",
      message: "x",
    });
    expect(t.kind).toBe("forbidden");
  });
  it("24. not_found mapeia para not_found", () => {
    const t = translateAgendaMutationError({ code: "not_found", message: "x" });
    expect(t.kind).toBe("not_found");
    expect(t.message).toBe(AGENDA_MUTATION_MESSAGES.not_found);
  });
  it("25. validation no_changes é distinguido", () => {
    const t = translateAgendaMutationError({
      code: "validation_error",
      message: "no_changes",
    });
    expect(t.kind).toBe("no_changes");
  });
  it("26. validation invalid_status é distinguido", () => {
    const t = translateAgendaMutationError({
      code: "validation_error",
      message: "invalid_status",
    });
    expect(t.kind).toBe("invalid_status");
  });
  it("27. validation invalid_expected_version é distinguido", () => {
    const t = translateAgendaMutationError({
      code: "validation_error",
      message: "invalid_expected_version",
    });
    expect(t.kind).toBe("invalid_expected_version");
  });
  it("28. validation desconhecido cai em generic", () => {
    const t = translateAgendaMutationError({
      code: "validation_error",
      message: "algum_outro_motivo",
    });
    expect(t.kind).toBe("generic");
  });
  it("29. offline distingue kind", () => {
    const t = translateAgendaMutationError({ code: "offline", message: "x" });
    expect(t.kind).toBe("offline");
  });
  it("30. unavailable distingue kind", () => {
    const t = translateAgendaMutationError({
      code: "unavailable",
      message: "x",
    });
    expect(t.kind).toBe("unavailable");
  });
  it("31. internal_error distingue kind", () => {
    const t = translateAgendaMutationError({
      code: "internal_error",
      message: "x",
    });
    expect(t.kind).toBe("internal_error");
  });
});

// =========================================================================
// 5) Integração — mudança de status de PRAZO
// =========================================================================

describe("LV-09.1B.6 — deadlines.changeStatus", () => {
  it("32. pending → completed grava completedAt e incrementa versão", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const before = d.metadata.version;
    const upd = ok(
      await env.services.deadlines.changeStatus(
        OWNER_ALFA,
        buildChangeDeadlineStatusInput(d, "completed", before),
      ),
    );
    expect(upd.status).toBe("completed");
    expect(upd.completedAt).toBeDefined();
    expect(upd.metadata.version).toBe(before + 1);
  });
  it("33. completed → pending remove completedAt", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const c = ok(
      await env.services.deadlines.changeStatus(
        OWNER_ALFA,
        buildChangeDeadlineStatusInput(d, "completed", d.metadata.version),
      ),
    );
    const reopened = ok(
      await env.services.deadlines.changeStatus(
        OWNER_ALFA,
        buildChangeDeadlineStatusInput(c, "pending", c.metadata.version),
      ),
    );
    expect(reopened.status).toBe("pending");
    expect(reopened.completedAt).toBeUndefined();
  });
  it("34. pending → cancelled não grava completedAt", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const cancelled = ok(
      await env.services.deadlines.changeStatus(
        OWNER_ALFA,
        buildChangeDeadlineStatusInput(d, "cancelled", d.metadata.version),
      ),
    );
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.completedAt).toBeUndefined();
  });
  it("35. expectedVersion desatualizada gera conflict com expected/actual", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    ok(
      await env.services.deadlines.changeStatus(
        OWNER_ALFA,
        buildChangeDeadlineStatusInput(d, "completed", d.metadata.version),
      ),
    );
    const err = fail(
      await env.services.deadlines.changeStatus(
        OWNER_ALFA,
        buildChangeDeadlineStatusInput(d, "cancelled", d.metadata.version),
      ),
    );
    expect(err.code).toBe("conflict");
    if (err.code === "conflict") {
      expect(err.actualVersion).toBeGreaterThan(err.expectedVersion ?? -1);
    }
  });
  it("36. mudança para o mesmo status gera validação (no_changes)", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const err = fail(
      await env.services.deadlines.changeStatus(
        OWNER_ALFA,
        buildChangeDeadlineStatusInput(d, d.status, d.metadata.version),
      ),
    );
    expect(err.code).toBe("validation_error");
  });
  it("37. papel de leitura recebe forbidden", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const err = fail(
      await env.services.deadlines.changeStatus(
        READONLY_ALFA,
        buildChangeDeadlineStatusInput(d, "completed", d.metadata.version),
      ),
    );
    expect(err.code).toBe("forbidden");
  });
  it("38. contexto de outra org não vê o prazo (not_found)", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const err = fail(
      await env.services.deadlines.changeStatus(
        OWNER_BETA,
        buildChangeDeadlineStatusInput(d, "completed", d.metadata.version),
      ),
    );
    expect(["not_found", "forbidden"]).toContain(err.code);
  });
});

// =========================================================================
// 6) Integração — mudança de status de COMPROMISSO
// =========================================================================

describe("LV-09.1B.6 — appointments.changeStatus", () => {
  it("39. scheduled → completed incrementa versão", async () => {
    const env = createMockDomainEnvironment();
    const a = await makeAppointment(env);
    const upd = ok(
      await env.services.appointments.changeStatus(
        OWNER_ALFA,
        buildChangeAppointmentStatusInput(a, "completed", a.metadata.version),
      ),
    );
    expect(upd.status).toBe("completed");
    expect(upd.metadata.version).toBe(a.metadata.version + 1);
  });
  it("40. scheduled → cancelled preserva demais campos", async () => {
    const env = createMockDomainEnvironment();
    const a = await makeAppointment(env);
    const upd = ok(
      await env.services.appointments.changeStatus(
        OWNER_ALFA,
        buildChangeAppointmentStatusInput(a, "cancelled", a.metadata.version),
      ),
    );
    expect(upd.title).toBe(a.title);
    expect(upd.startsAt).toBe(a.startsAt);
    expect(upd.endsAt).toBe(a.endsAt);
  });
  it("41. mesma versão duas vezes gera conflict", async () => {
    const env = createMockDomainEnvironment();
    const a = await makeAppointment(env);
    ok(
      await env.services.appointments.changeStatus(
        OWNER_ALFA,
        buildChangeAppointmentStatusInput(a, "completed", a.metadata.version),
      ),
    );
    const err = fail(
      await env.services.appointments.changeStatus(
        OWNER_ALFA,
        buildChangeAppointmentStatusInput(a, "cancelled", a.metadata.version),
      ),
    );
    expect(err.code).toBe("conflict");
  });
  it("42. mesmo status gera validação (no_changes)", async () => {
    const env = createMockDomainEnvironment();
    const a = await makeAppointment(env);
    const err = fail(
      await env.services.appointments.changeStatus(
        OWNER_ALFA,
        buildChangeAppointmentStatusInput(a, a.status, a.metadata.version),
      ),
    );
    expect(err.code).toBe("validation_error");
  });
  it("43. papel de leitura recebe forbidden", async () => {
    const env = createMockDomainEnvironment();
    const a = await makeAppointment(env);
    const err = fail(
      await env.services.appointments.changeStatus(
        READONLY_ALFA,
        buildChangeAppointmentStatusInput(a, "completed", a.metadata.version),
      ),
    );
    expect(err.code).toBe("forbidden");
  });
});

// =========================================================================
// 7) Integração — exclusão de PRAZO
// =========================================================================

describe("LV-09.1B.6 — deadlines.remove", () => {
  it("44. remove com versão correta retorna { removed: true }", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const res = ok(
      await env.services.deadlines.remove(
        OWNER_ALFA,
        d.caseId,
        d.id,
        d.metadata.version,
      ),
    );
    expect(res.removed).toBe(true);
  });
  it("45. depois de remover, getById retorna not_found", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    ok(
      await env.services.deadlines.remove(
        OWNER_ALFA,
        d.caseId,
        d.id,
        d.metadata.version,
      ),
    );
    const err = fail(
      await env.services.deadlines.getById(OWNER_ALFA, d.caseId, d.id),
    );
    expect(err.code).toBe("not_found");
  });
  it("46. versão desatualizada gera conflict", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    ok(
      await env.services.deadlines.changeStatus(
        OWNER_ALFA,
        buildChangeDeadlineStatusInput(d, "completed", d.metadata.version),
      ),
    );
    const err = fail(
      await env.services.deadlines.remove(
        OWNER_ALFA,
        d.caseId,
        d.id,
        d.metadata.version,
      ),
    );
    expect(err.code).toBe("conflict");
  });
  it("47. papel de leitura recebe forbidden", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const err = fail(
      await env.services.deadlines.remove(
        READONLY_ALFA,
        d.caseId,
        d.id,
        d.metadata.version,
      ),
    );
    expect(err.code).toBe("forbidden");
  });
  it("48. outra org não pode remover (not_found/forbidden)", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const err = fail(
      await env.services.deadlines.remove(
        OWNER_BETA,
        d.caseId,
        d.id,
        d.metadata.version,
      ),
    );
    expect(["not_found", "forbidden"]).toContain(err.code);
  });
  it("49. remoção não afeta compromissos do mesmo caso", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const a = await makeAppointment(env);
    ok(
      await env.services.deadlines.remove(
        OWNER_ALFA,
        d.caseId,
        d.id,
        d.metadata.version,
      ),
    );
    const still = ok(
      await env.services.appointments.getById(OWNER_ALFA, a.caseId, a.id),
    );
    expect(still.id).toBe(a.id);
  });
});

// =========================================================================
// 8) Integração — exclusão de COMPROMISSO
// =========================================================================

describe("LV-09.1B.6 — appointments.remove", () => {
  it("50. remove com versão correta retorna { removed: true }", async () => {
    const env = createMockDomainEnvironment();
    const a = await makeAppointment(env);
    const res = ok(
      await env.services.appointments.remove(
        OWNER_ALFA,
        a.caseId,
        a.id,
        a.metadata.version,
      ),
    );
    expect(res.removed).toBe(true);
  });
  it("51. getById após remoção → not_found", async () => {
    const env = createMockDomainEnvironment();
    const a = await makeAppointment(env);
    ok(
      await env.services.appointments.remove(
        OWNER_ALFA,
        a.caseId,
        a.id,
        a.metadata.version,
      ),
    );
    const err = fail(
      await env.services.appointments.getById(OWNER_ALFA, a.caseId, a.id),
    );
    expect(err.code).toBe("not_found");
  });
  it("52. versão desatualizada gera conflict", async () => {
    const env = createMockDomainEnvironment();
    const a = await makeAppointment(env);
    ok(
      await env.services.appointments.changeStatus(
        OWNER_ALFA,
        buildChangeAppointmentStatusInput(a, "completed", a.metadata.version),
      ),
    );
    const err = fail(
      await env.services.appointments.remove(
        OWNER_ALFA,
        a.caseId,
        a.id,
        a.metadata.version,
      ),
    );
    expect(err.code).toBe("conflict");
  });
  it("53. papel de leitura recebe forbidden", async () => {
    const env = createMockDomainEnvironment();
    const a = await makeAppointment(env);
    const err = fail(
      await env.services.appointments.remove(
        READONLY_ALFA,
        a.caseId,
        a.id,
        a.metadata.version,
      ),
    );
    expect(err.code).toBe("forbidden");
  });
  it("54. remoção não afeta prazos do mesmo caso", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const a = await makeAppointment(env);
    ok(
      await env.services.appointments.remove(
        OWNER_ALFA,
        a.caseId,
        a.id,
        a.metadata.version,
      ),
    );
    const still = ok(
      await env.services.deadlines.getById(OWNER_ALFA, d.caseId, d.id),
    );
    expect(still.id).toBe(d.id);
  });
});

// =========================================================================
// 9) resolvePendingRemovalAction — gerações e confirmação de remoção
// =========================================================================

describe("LV-09.1B.6 — resolvePendingRemovalAction", () => {
  const pendingD = Object.freeze({
    type: "deadline" as const,
    id: "deadline-x",
    generation: 3,
  });
  const pendingA = Object.freeze({
    type: "appointment" as const,
    id: "appointment-x",
    generation: 3,
  });

  it("55. wait enquanto geração corrente < pendente", () => {
    const r = resolvePendingRemovalAction(
      pendingD,
      { generation: 2, kind: "loading" },
      new Set<string>(),
      new Set<string>(),
    );
    expect(r.kind).toBe("wait");
  });
  it("56. wait enquanto load ainda em loading na mesma geração", () => {
    const r = resolvePendingRemovalAction(
      pendingD,
      { generation: 3, kind: "loading" },
      new Set<string>(),
      new Set<string>(),
    );
    expect(r.kind).toBe("wait");
  });
  it("57. wait quando load em erro na geração pendente", () => {
    const r = resolvePendingRemovalAction(
      pendingD,
      { generation: 3, kind: "error" },
      new Set<string>(),
      new Set<string>(),
    );
    expect(r.kind).toBe("wait");
  });
  it("58. confirmed_removed quando geração≥pendente e ID ausente (deadline)", () => {
    const r = resolvePendingRemovalAction(
      pendingD,
      { generation: 3, kind: "ready" },
      new Set<string>(),
      new Set<string>(),
    );
    expect(r.kind).toBe("confirmed_removed");
  });
  it("59. confirmed_removed quando geração≥pendente e ID ausente (appointment)", () => {
    const r = resolvePendingRemovalAction(
      pendingA,
      { generation: 3, kind: "ready" },
      new Set<string>(),
      new Set<string>(),
    );
    expect(r.kind).toBe("confirmed_removed");
  });
  it("60. wait quando ID ainda aparece na geração corrente (resposta obsoleta)", () => {
    const r = resolvePendingRemovalAction(
      pendingD,
      { generation: 3, kind: "ready" },
      new Set(["deadline-x"]),
      new Set<string>(),
    );
    expect(r.kind).toBe("wait");
  });
  it("61. confirmed_removed em geração posterior sem o ID", () => {
    const r = resolvePendingRemovalAction(
      pendingD,
      { generation: 5, kind: "ready" },
      new Set<string>(),
      new Set<string>(),
    );
    expect(r.kind).toBe("confirmed_removed");
  });
});

// =========================================================================
// 10) Regressões de fonte — presença dos elementos da LV-09.1B.6
// =========================================================================

describe("LV-09.1B.6 — regressões de fonte", () => {
  it("62. AgendaItemDetailDialog importa helpers de item-mutations", () => {
    expect(DETAIL_SRC).toMatch(/from "\.\/item-mutations"/);
    expect(DETAIL_SRC).toMatch(/buildChangeDeadlineStatusInput/);
    expect(DETAIL_SRC).toMatch(/buildChangeAppointmentStatusInput/);
    expect(DETAIL_SRC).toMatch(/translateAgendaMutationError/);
    expect(DETAIL_SRC).toMatch(/getDeadlineStatusActions/);
    expect(DETAIL_SRC).toMatch(/getAppointmentStatusActions/);
  });
  it("63. AgendaItemDetailDialog expõe prop onDeleted", () => {
    expect(DETAIL_SRC).toMatch(/onDeleted:/);
    expect(DETAIL_SRC).toMatch(/AgendaItemDeleted/);
  });
  it("64. seção 'Ações do item' está presente", () => {
    expect(DETAIL_SRC).toContain("Ações do item");
    expect(DETAIL_SRC).toMatch(/ItemActionsSection/);
  });
  it("65. bloqueio síncrono via mutationInFlightRef existe", () => {
    expect(DETAIL_SRC).toMatch(/mutationInFlightRef/);
  });
  it("66. rota da Agenda passa handleDeleted ao diálogo", () => {
    expect(AGENDA_ROUTE_SRC).toMatch(/onDeleted=\{handleDeleted\}/);
    expect(AGENDA_ROUTE_SRC).toMatch(/const handleDeleted = React\.useCallback/);
  });
  it("67. rota dispara nova geração após exclusão (setReloadKey)", () => {
    const idx = AGENDA_ROUTE_SRC.indexOf("const handleDeleted");
    expect(idx).toBeGreaterThan(-1);
    const slice = AGENDA_ROUTE_SRC.slice(idx, idx + 400);
    expect(slice).toMatch(/setReloadKey/);
    expect(slice).toMatch(/setSelected\(null\)/);
  });
  it("68. item-mutations não importa React", () => {
    expect(MUT_SRC).not.toMatch(/from "react"/);
  });
  it("69. LV-09.1B.6 não cria nova rota na Agenda", () => {
    // Não deve haver rotas novas relacionadas a mutação; a rota base é única.
    const routeMatches = AGENDA_ROUTE_SRC.match(/createFileRoute\(/g) ?? [];
    expect(routeMatches.length).toBe(1);
  });
  it("70. AgendaItemDetailDialog usa Trash2 e RotateCcw", () => {
    expect(DETAIL_SRC).toMatch(/Trash2/);
    expect(DETAIL_SRC).toMatch(/RotateCcw/);
  });
});
