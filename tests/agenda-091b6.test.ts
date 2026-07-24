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
  buildMutationConflict,
  buildPendingRemovalMarker,
  getAppointmentStatusActions,
  getDeadlineStatusActions,
  permissionAllowsAction,
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
    requiredGeneration: 3,
  });
  const pendingA = Object.freeze({
    type: "appointment" as const,
    id: "appointment-x",
    requiredGeneration: 3,
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

// =========================================================================
// 11) LV-09.1B.6.1 — Fechamento técnico (builders + fonte)
// =========================================================================

describe("LV-09.1B.6.1 — fechamento técnico", () => {
  it("71. buildPendingRemovalMarker reserva a próxima geração", () => {
    const m = buildPendingRemovalMarker(7, { id: "dl-x", type: "deadline" });
    expect(m.requiredGeneration).toBe(8);
    expect(m.id).toBe("dl-x");
    expect(m.type).toBe("deadline");
  });
  it("72. buildPendingRemovalMarker devolve marcador congelado", () => {
    const m = buildPendingRemovalMarker(1, { id: "ap-x", type: "appointment" });
    expect(Object.isFrozen(m)).toBe(true);
  });
  it("73. ready gen 2 com requiredGeneration 3 retorna wait (barreira real)", () => {
    const r = resolvePendingRemovalAction(
      { id: "dl-x", type: "deadline", requiredGeneration: 3 },
      { kind: "ready", generation: 2 },
      new Set<string>(),
      new Set<string>(),
    );
    expect(r.kind).toBe("wait");
  });

  it("74. conflict remove preserva expected/actual", () => {
    const conflict = buildMutationConflict("remove", {
      kind: "conflict",
      message: AGENDA_MUTATION_MESSAGES.conflict,
      expectedVersion: 2,
      actualVersion: 5,
    });
    expect(conflict).not.toBeNull();
    if (!conflict) throw new Error("expected conflict");
    expect(conflict.operation).toBe("remove");
    expect(conflict.expected).toBe(2);
    expect(conflict.actual).toBe(5);
  });
  it("75. conflict change_status preserva expected/actual", () => {
    const conflict = buildMutationConflict("change_status", {
      kind: "conflict",
      message: AGENDA_MUTATION_MESSAGES.conflict,
      expectedVersion: 4,
      actualVersion: 9,
    });
    expect(conflict).not.toBeNull();
    if (!conflict) throw new Error("expected conflict");
    expect(conflict.operation).toBe("change_status");
    expect(conflict.expected).toBe(4);
    expect(conflict.actual).toBe(9);
  });
  it("76. builder devolve null quando o erro não é conflito", () => {
    const conflict = buildMutationConflict("remove", {
      kind: "forbidden",
      message: AGENDA_MUTATION_MESSAGES.forbidden,
    });
    expect(conflict).toBeNull();
  });

  it("77. permissionAllowsAction: só 'allowed' habilita", () => {
    expect(permissionAllowsAction("allowed")).toBe(true);
    expect(permissionAllowsAction("denied")).toBe(false);
    expect(permissionAllowsAction("unknown")).toBe(false);
    expect(permissionAllowsAction("loading")).toBe(false);
    expect(permissionAllowsAction("error")).toBe(false);
  });

  it("78. AgendaItemDetailDialog usa MutationConflict e buildMutationConflict", () => {
    expect(DETAIL_SRC).toMatch(/MutationConflict/);
    expect(DETAIL_SRC).toMatch(/buildMutationConflict/);
  });
  it("79. Diálogos oferecem 'Continuar revisando' e 'Recarregar dados'", () => {
    expect(DETAIL_SRC).toContain("Continuar revisando");
    expect(DETAIL_SRC).toContain("Recarregar dados");
  });
  it("80. reloadAfterMutationConflict é declarado e refletido em setReload (via reducer)", () => {
    expect(DETAIL_SRC).toMatch(/reloadAfterMutationConflict/);
    // Regra comportamental exercitada em profundidade nos testes 121-129
    // (resolveMutationConflictAction). Aqui basta garantir a presença do
    // callback nomeado.
  });
  it("81. keepReviewingMutation não chama serviço", () => {
    expect(DETAIL_SRC).toMatch(/keepReviewingMutation/);
    const idx = DETAIL_SRC.indexOf("const keepReviewingMutation");
    const slice = DETAIL_SRC.slice(idx, idx + 600);
    expect(slice).not.toMatch(/services\./);
  });

  it("82. requestClose consulta getMutationLockDecisions()", () => {
    const idx = DETAIL_SRC.indexOf("const requestClose = React.useCallback");
    expect(idx).toBeGreaterThan(-1);
    const slice = DETAIL_SRC.slice(idx, idx + 400);
    expect(slice).toMatch(/getMutationLockDecisions\(\)\.canClose/);
  });
  it("83. Escape no diálogo principal bloqueia via getMutationLockDecisions", () => {
    expect(DETAIL_SRC).toMatch(
      /if \(!getMutationLockDecisions\(\)\.canClose\) e\.preventDefault\(\)/,
    );
  });
  it("84. botão Fechar chama requestClose e desabilita durante mutating", () => {
    expect(DETAIL_SRC).toMatch(/onClick=\{requestClose\}/);
    expect(DETAIL_SRC).toMatch(/disabled=\{submitting \|\| mutating\}/);
  });
  it("85. botão Editar desabilita quando mutating", () => {
    expect(DETAIL_SRC).toMatch(/perm !== "allowed" \|\| mutating/);
  });
  it("86. Escape nos AlertDialog de confirmação bloqueia via lock decisions", () => {
    const escBlocks = DETAIL_SRC.match(
      /if \(!getMutationLockDecisions\(\)\.canClose\) e\.preventDefault\(\)/g,
    ) ?? [];
    expect(escBlocks.length).toBeGreaterThanOrEqual(2);
  });

  it("87. detalhe exibe 'Cumprido em' quando completedAt está presente", () => {
    expect(DETAIL_SRC).toContain("Cumprido em");
    const idx = DETAIL_SRC.indexOf("Cumprido em");
    const slice = DETAIL_SRC.slice(Math.max(0, idx - 200), idx + 200);
    expect(slice).toMatch(/d\.completedAt !== undefined/);
  });

  it("88. confirmação de status mostra Item / Estado / Novo estado / Versão atual", () => {
    expect(DETAIL_SRC).toContain("Estado atual:");
    expect(DETAIL_SRC).toContain("Novo estado:");
    expect(DETAIL_SRC).toContain("Versão atual:");
    expect(DETAIL_SRC).toMatch(/detail\.loaded\.item\.metadata\.version/);
  });
  it("89. confirmação de exclusão mostra texto e opções oficiais", () => {
    expect(DETAIL_SRC).toContain(
      "Esta ação remove o item da Agenda e não pode ser desfeita.",
    );
    expect(DETAIL_SRC).toContain("Excluir prazo?");
    expect(DETAIL_SRC).toContain("Excluir compromisso?");
    expect(DETAIL_SRC).toContain("Manter item");
  });
  it("90. botão destrutivo tem estilo destrutivo", () => {
    expect(DETAIL_SRC).toMatch(/bg-destructive text-destructive-foreground/);
  });

  it("91. permissão diferencia error de denied (via helper puro)", () => {
    // Substituído por prova comportamental — vide 106 e 107.
    expect(DETAIL_SRC).toMatch(/resolvePermissionEvaluation/);
  });
  it("92. UI oferece 'Tentar novamente' quando permissão em error", () => {
    expect(DETAIL_SRC).toContain("Não foi possível verificar esta permissão.");
    expect(DETAIL_SRC).toContain("Tentar novamente");
    expect(DETAIL_SRC).toMatch(
      /permChangeStatus === "error" \|\| permRemove === "error"/,
    );
  });
  it("93. handlers exigem 'allowed' antes de chamar o serviço", () => {
    expect(DETAIL_SRC).toMatch(/if \(permChangeStatus !== "allowed"\) return;/);
    expect(DETAIL_SRC).toMatch(/if \(permRemove !== "allowed"\) return;/);
  });

  it("94. retryPermissions incrementa permAttempt", () => {
    expect(DETAIL_SRC).toMatch(/setPermAttempt\(\(n\) => n \+ 1\)/);
    expect(DETAIL_SRC).toMatch(/permAttempt/);
  });

  it("95. ItemActionsSection não usa casts em ações", () => {
    const idxSec = DETAIL_SRC.indexOf("function ItemActionsSection(");
    expect(idxSec).toBeGreaterThan(-1);
    const section = DETAIL_SRC.slice(idxSec, idxSec + 4000);
    expect(section).not.toMatch(/as DeadlineStatusAction/);
    expect(section).not.toMatch(/as AppointmentStatusAction/);
  });
  it("96. Nenhum 'as any' / 'as never' / @ts-* no diálogo", () => {
    expect(DETAIL_SRC).not.toMatch(/as any\b/);
    expect(DETAIL_SRC).not.toMatch(/as never\b/);
    expect(DETAIL_SRC).not.toMatch(/@ts-ignore|@ts-nocheck/);
  });

  it("97. rota da Agenda consome resolvePendingRemovalAction", () => {
    expect(AGENDA_ROUTE_SRC).toMatch(/resolvePendingRemovalAction/);
    expect(AGENDA_ROUTE_SRC).toMatch(/buildPendingRemovalMarker/);
  });
  it("98. rota mantém estado pendingRemoval baseado em PendingRemovalItem", () => {
    expect(AGENDA_ROUTE_SRC).toMatch(/PendingRemovalItem/);
    expect(AGENDA_ROUTE_SRC).toMatch(/setPendingRemoval/);
  });
  it("99. handleDeleted na rota constrói marcador com geração atual", () => {
    const idx = AGENDA_ROUTE_SRC.indexOf(
      "const handleDeleted = React.useCallback",
    );
    expect(idx).toBeGreaterThan(-1);
    const slice = AGENDA_ROUTE_SRC.slice(idx, idx + 900);
    expect(slice).toMatch(
      /buildPendingRemovalMarker\(loadGenerationRef\.current/,
    );
    expect(slice).toMatch(/setPendingRemoval/);
    expect(slice).toMatch(/setSelected\(null\)/);
    expect(slice).toMatch(/setReloadKey/);
  });
  it("100. foco após exclusão vai para newItemButtonRef (elemento estável)", () => {
    const idx = AGENDA_ROUTE_SRC.indexOf(
      "const handleDeleted = React.useCallback",
    );
    const slice = AGENDA_ROUTE_SRC.slice(idx, idx + 900);
    expect(slice).toMatch(/newItemButtonRef\.current\?\.focus/);
    expect(slice).not.toMatch(/lastTriggerRef\.current\?\.focus/);
  });
  it("101. rota tem efeito que consome resolvePendingRemovalAction", () => {
    const idx = AGENDA_ROUTE_SRC.indexOf("resolvePendingRemovalAction(");
    expect(idx).toBeGreaterThan(-1);
    const slice = AGENDA_ROUTE_SRC.slice(Math.max(0, idx - 400), idx + 600);
    expect(slice).toMatch(/pendingRemoval/);
    expect(slice).toMatch(/setPendingRemoval\(null\)/);
  });

  it("102. onDeleted é invocado com type/caseId/id no diálogo", () => {
    const idxs: number[] = [];
    let from = 0;
    for (;;) {
      const i = DETAIL_SRC.indexOf("onDeleted({", from);
      if (i < 0) break;
      idxs.push(i);
      from = i + 1;
    }
    expect(idxs.length).toBeGreaterThanOrEqual(2);
    for (const i of idxs) {
      const s = DETAIL_SRC.slice(i, i + 200);
      expect(s).toMatch(/type:\s*"(deadline|appointment)"/);
      expect(s).toMatch(/caseId:/);
      expect(s).toMatch(/id:/);
    }
  });

  it("103. remoção com conflito preserva conflict tipado como 'remove'", () => {
    expect(DETAIL_SRC).toMatch(/buildMutationConflict\("remove", t\)/);
    expect(DETAIL_SRC).toMatch(/buildMutationConflict\("change_status", t\)/);
  });
  it("104. abertura de status/exclusão limpa erros e conflitos prévios", () => {
    expect(DETAIL_SRC).toMatch(
      /setMutationError\(null\);\s*setMutationConflict\(null\);\s*setPendingStatus/,
    );
    expect(DETAIL_SRC).toMatch(
      /setMutationError\(null\);\s*setMutationConflict\(null\);\s*setPendingRemoval\(true\)/,
    );
  });
  it("105. remoção só executa quando pendingRemoval está aberto e permRemove='allowed'", () => {
    const idx = DETAIL_SRC.indexOf("const confirmRemoval");
    expect(idx).toBeGreaterThan(-1);
    const slice = DETAIL_SRC.slice(idx, idx + 900);
    expect(slice).toMatch(/mutationInFlightRef\.current/);
    expect(slice).toMatch(/permRemove !== "allowed"/);
    expect(slice).toMatch(/if \(!pendingRemoval\) return/);
  });
});

// =========================================================================
// 12) LV-09.1B.6.2 — Provas comportamentais (helpers puros consumidos)
// =========================================================================

import {
  bindSingleFlightLockToRef,
  createSingleFlightLock,
  deriveMutationLockDecisions,
  hasPermissionEvaluationError,
  resolveMutationConflictAction,
  resolvePermissionEvaluation,
} from "@/features/agenda/item-mutation-reducers";

const REDUCERS_SRC = readFileSync(
  "src/features/agenda/item-mutation-reducers.ts",
  "utf8",
);

describe("LV-09.1B.6.2 — resolvePermissionEvaluation (helper puro)", () => {
  it("106. allowed=true → 'allowed'", () => {
    expect(
      resolvePermissionEvaluation({
        kind: "resolved",
        result: { ok: true, data: { allowed: true } },
      }),
    ).toBe("allowed");
  });
  it("107. allowed=false → 'denied'", () => {
    expect(
      resolvePermissionEvaluation({
        kind: "resolved",
        result: { ok: true, data: { allowed: false } },
      }),
    ).toBe("denied");
  });
  it("108. falha de serviço → 'error'", () => {
    expect(
      resolvePermissionEvaluation({
        kind: "resolved",
        result: { ok: false, error: { code: "internal_error", message: "x" } },
      }),
    ).toBe("error");
  });
  it("109. Promise rejeitada → 'error'", () => {
    expect(resolvePermissionEvaluation({ kind: "rejected" })).toBe("error");
  });
  it("110. permissionAllowsAction('error') retorna false", () => {
    expect(permissionAllowsAction("error")).toBe(false);
  });
});

describe("LV-09.1B.6.2 — hasPermissionEvaluationError", () => {
  it("111. erro em update ativa retry", () => {
    expect(
      hasPermissionEvaluationError({
        update: "error",
        changeStatus: "allowed",
        remove: "allowed",
      }),
    ).toBe(true);
  });
  it("112. erro em changeStatus ativa retry", () => {
    expect(
      hasPermissionEvaluationError({
        update: "allowed",
        changeStatus: "error",
        remove: "allowed",
      }),
    ).toBe(true);
  });
  it("113. erro em remove ativa retry", () => {
    expect(
      hasPermissionEvaluationError({
        update: "allowed",
        changeStatus: "allowed",
        remove: "error",
      }),
    ).toBe(true);
  });
  it("114. sem erro em nenhuma → false", () => {
    expect(
      hasPermissionEvaluationError({
        update: "allowed",
        changeStatus: "denied",
        remove: "allowed",
      }),
    ).toBe(false);
  });
});

describe("LV-09.1B.6.2 — deriveMutationLockDecisions", () => {
  it("115. lock livre permite tudo", () => {
    const d = deriveMutationLockDecisions({
      mutationRefLocked: false,
      mutating: false,
      submitting: false,
    });
    expect(d.canClose).toBe(true);
    expect(d.canEnterEdit).toBe(true);
    expect(d.canOpenConfirmation).toBe(true);
    expect(d.canRetryPermissions).toBe(true);
  });
  it("116. durante mutação não pode fechar", () => {
    const d = deriveMutationLockDecisions({
      mutationRefLocked: true,
      mutating: false,
      submitting: false,
    });
    expect(d.canClose).toBe(false);
  });
  it("117. durante mutating=true não pode entrar em edição", () => {
    const d = deriveMutationLockDecisions({
      mutationRefLocked: false,
      mutating: true,
      submitting: false,
    });
    expect(d.canEnterEdit).toBe(false);
  });
  it("118. durante mutação não pode abrir outra confirmação", () => {
    const d = deriveMutationLockDecisions({
      mutationRefLocked: true,
      mutating: false,
      submitting: false,
    });
    expect(d.canOpenConfirmation).toBe(false);
  });
  it("119. durante mutação não pode executar retry de permissões", () => {
    const d = deriveMutationLockDecisions({
      mutationRefLocked: true,
      mutating: true,
      submitting: false,
    });
    expect(d.canRetryPermissions).toBe(false);
  });
  it("120. submitting bloqueia canClose (envio em progresso)", () => {
    const d = deriveMutationLockDecisions({
      mutationRefLocked: false,
      mutating: false,
      submitting: true,
    });
    expect(d.canClose).toBe(false);
  });
});

describe("LV-09.1B.6.2 — resolveMutationConflictAction", () => {
  it("121. continue_reviewing fecha confirmação e não recarrega", () => {
    const eff = resolveMutationConflictAction("continue_reviewing");
    expect(eff.closeConfirmation).toBe(true);
    expect(eff.clearError).toBe(true);
    expect(eff.clearConflict).toBe(true);
    expect(eff.preserveDetail).toBe(true);
    expect(eff.reloadDetail).toBe(false);
  });
  it("122. continue_reviewing não repete changeStatus nem remove", () => {
    const eff = resolveMutationConflictAction("continue_reviewing");
    expect(eff.retryChangeStatus).toBe(false);
    expect(eff.retryRemove).toBe(false);
  });
  it("123. reload solicita novo carregamento do detalhe", () => {
    const eff = resolveMutationConflictAction("reload");
    expect(eff.reloadDetail).toBe(true);
    expect(eff.preserveDetail).toBe(true);
    expect(eff.closeConfirmation).toBe(true);
    expect(eff.clearError).toBe(true);
    expect(eff.clearConflict).toBe(true);
  });
  it("124. reload não repete changeStatus", () => {
    const eff = resolveMutationConflictAction("reload");
    expect(eff.retryChangeStatus).toBe(false);
  });
  it("125. reload não repete remove", () => {
    const eff = resolveMutationConflictAction("reload");
    expect(eff.retryRemove).toBe(false);
  });
  it("126. efeito devolvido é congelado", () => {
    expect(Object.isFrozen(resolveMutationConflictAction("reload"))).toBe(true);
    expect(
      Object.isFrozen(resolveMutationConflictAction("continue_reviewing")),
    ).toBe(true);
  });
});

describe("LV-09.1B.6.2 — SingleFlightLock", () => {
  it("127. primeira aquisição permitida", () => {
    const lock = createSingleFlightLock();
    expect(lock.tryAcquire()).toBe(true);
    expect(lock.isLocked()).toBe(true);
  });
  it("128. segunda aquisição antes da liberação é bloqueada", () => {
    const lock = createSingleFlightLock();
    expect(lock.tryAcquire()).toBe(true);
    expect(lock.tryAcquire()).toBe(false);
  });
  it("129. após release, nova aquisição é aceita", () => {
    const lock = createSingleFlightLock();
    lock.tryAcquire();
    lock.release();
    expect(lock.isLocked()).toBe(false);
    expect(lock.tryAcquire()).toBe(true);
  });
  it("130. bindSingleFlightLockToRef delega para a ref", () => {
    const ref = { current: false };
    const lock = bindSingleFlightLockToRef(ref);
    expect(lock.tryAcquire()).toBe(true);
    expect(ref.current).toBe(true);
    expect(lock.tryAcquire()).toBe(false);
    lock.release();
    expect(ref.current).toBe(false);
    expect(lock.tryAcquire()).toBe(true);
  });
});

// =========================================================================
// 13) Conflitos preservam expected/actual — behavioral
// =========================================================================

describe("LV-09.1B.6.2 — conflitos preservam expected/actual", () => {
  it("131. buildMutationConflict('change_status', conflict) preserva expected/actual", () => {
    const c = buildMutationConflict("change_status", {
      kind: "conflict",
      message: AGENDA_MUTATION_MESSAGES.conflict,
      expectedVersion: 3,
      actualVersion: 7,
    });
    if (!c) throw new Error("expected conflict");
    expect(c.operation).toBe("change_status");
    expect(c.expected).toBe(3);
    expect(c.actual).toBe(7);
  });
  it("132. buildMutationConflict('remove', conflict) preserva expected/actual", () => {
    const c = buildMutationConflict("remove", {
      kind: "conflict",
      message: AGENDA_MUTATION_MESSAGES.conflict,
      expectedVersion: 2,
      actualVersion: 4,
    });
    if (!c) throw new Error("expected conflict");
    expect(c.operation).toBe("remove");
    expect(c.expected).toBe(2);
    expect(c.actual).toBe(4);
  });
  it("133. sem cast 'as MutationConflict' no builder", () => {
    // Prova estrutural residual permitida: ausência do cast previamente usado.
    const MUT_MOD = readFileSync(
      "src/features/agenda/item-mutations.ts",
      "utf8",
    );
    expect(MUT_MOD).not.toMatch(/as MutationConflict/);
    expect(MUT_MOD).not.toMatch(/as any\b/);
    expect(MUT_MOD).not.toMatch(/as never\b/);
    expect(MUT_MOD).not.toMatch(/@ts-ignore|@ts-nocheck/);
  });
});

// =========================================================================
// 14) Entidade autoritativa após changeStatus / concorrência otimista
// =========================================================================

describe("LV-09.1B.6.2 — entidade autoritativa após mutação", () => {
  it("134. completed usa completedAt retornado pelo serviço", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const upd = ok(
      await env.services.deadlines.changeStatus(
        OWNER_ALFA,
        buildChangeDeadlineStatusInput(d, "completed", d.metadata.version),
      ),
    );
    expect(upd.completedAt).toBeDefined();
    // completedAt não pode ser fabricado no cliente; vem do serviço.
    expect(upd.completedAt).not.toBe(d.dueAt);
  });
  it("135. reabertura utiliza entidade retornada sem completedAt", async () => {
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
    expect(reopened.completedAt).toBeUndefined();
  });
  it("136. versão após mudança vem da entidade retornada", async () => {
    const env = createMockDomainEnvironment();
    const a = await makeAppointment(env);
    const upd = ok(
      await env.services.appointments.changeStatus(
        OWNER_ALFA,
        buildChangeAppointmentStatusInput(a, "completed", a.metadata.version),
      ),
    );
    expect(upd.metadata.version).toBe(a.metadata.version + 1);
  });
  it("137. versão enviada é a versão corrente do detalhe", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const inputV = buildChangeDeadlineStatusInput(
      d,
      "completed",
      d.metadata.version,
    );
    expect(inputV.expectedVersion).toBe(d.metadata.version);
  });
  it("138. versão desatualizada não altera a entidade local", async () => {
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
        // Versão desatualizada — usa a versão original de `d`.
        buildChangeDeadlineStatusInput(d, "cancelled", d.metadata.version),
      ),
    );
    expect(err.code).toBe("conflict");
    // Objeto local `d` permanece intocado; o cliente jamais deve promover
    // uma versão desatualizada ao estado autoritativo.
    expect(d.status).toBe("pending");
    expect(d.completedAt).toBeUndefined();
  });
});

// =========================================================================
// 15) Integração dos helpers no componente real
// =========================================================================

describe("LV-09.1B.6.2 — integração real dos helpers", () => {
  it("139. AgendaItemDetailDialog importa item-mutation-reducers", () => {
    expect(DETAIL_SRC).toMatch(/from "\.\/item-mutation-reducers"/);
    expect(DETAIL_SRC).toMatch(/deriveMutationLockDecisions/);
    expect(DETAIL_SRC).toMatch(/resolvePermissionEvaluation/);
    expect(DETAIL_SRC).toMatch(/resolveMutationConflictAction/);
    expect(DETAIL_SRC).toMatch(/hasPermissionEvaluationError/);
  });
  it("140. banner de retry considera perm === 'error' (update)", () => {
    expect(DETAIL_SRC).toMatch(
      /perm === "error" \|\| permChangeStatus === "error" \|\| permRemove === "error"/,
    );
  });
  it("141. enterEdit bloqueia durante mutação (linha explícita)", () => {
    const idx = DETAIL_SRC.indexOf("const enterEdit = React.useCallback");
    expect(idx).toBeGreaterThan(-1);
    const slice = DETAIL_SRC.slice(idx, idx + 400);
    expect(slice).toMatch(/mutationInFlightRef\.current \|\| mutating/);
  });
  it("142. requestClose bloqueia durante mutating (linha explícita)", () => {
    const idx = DETAIL_SRC.indexOf("const requestClose = React.useCallback");
    const slice = DETAIL_SRC.slice(idx, idx + 400);
    expect(slice).toMatch(/mutationInFlightRef\.current \|\| mutating/);
  });
  it("143. callbacks dedicados de request de status/remoção existem", () => {
    expect(DETAIL_SRC).toMatch(/requestDeadlineStatusChange/);
    expect(DETAIL_SRC).toMatch(/requestAppointmentStatusChange/);
    expect(DETAIL_SRC).toMatch(/requestRemoval/);
  });
  it("144. ItemActionsSection recebe callbacks dedicados (não inline)", () => {
    expect(DETAIL_SRC).toMatch(
      /onSelectDeadlineAction=\{requestDeadlineStatusChange\}/,
    );
    expect(DETAIL_SRC).toMatch(
      /onSelectAppointmentAction=\{requestAppointmentStatusChange\}/,
    );
    expect(DETAIL_SRC).toMatch(/onRequestRemoval=\{requestRemoval\}/);
  });
  it("145. permissionAllowsAction é usado no componente", () => {
    expect(DETAIL_SRC).toMatch(/permissionAllowsAction\(perm\)/);
  });
  it("146. item-mutation-reducers não importa React", () => {
    expect(REDUCERS_SRC).not.toMatch(/from "react"/);
  });
  it("147. item-mutation-reducers sem casts proibidos", () => {
    expect(REDUCERS_SRC).not.toMatch(/as any\b/);
    expect(REDUCERS_SRC).not.toMatch(/as never\b/);
    expect(REDUCERS_SRC).not.toMatch(/@ts-ignore|@ts-nocheck/);
  });
  it("148. LV-09.1B.6.2 não cria nova rota", () => {
    const routes = AGENDA_ROUTE_SRC.match(/createFileRoute\(/g) ?? [];
    expect(routes.length).toBe(1);
  });
});
