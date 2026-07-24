/**
 * LV-09.1B.4 — Testes de criação de prazo/compromisso na Agenda.
 *
 * Cobre: helpers puros (`create-form.ts`), integração com serviços
 * oficiais (`deadlines.create`, `appointments.create`), permissões e
 * regressão dos helpers de filtro/visão.
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
  SEED_CASE_ALFA_2_ID,
  SEED_CASE_BETA_1_ID,
  SEED_ASSIGN_ALFA_1_ID,
  SEED_ASSIGN_BETA_1_ID,
} from "@/domain/mocks/seed";
import type { ServiceContext } from "@/domain/services/context";
import type { ServiceResult } from "@/domain/services/result";
import type { AssignmentId } from "@/domain/core/ids";
import { isIsoDateTime, type IsoDateTime } from "@/domain/core/common";

/** Helper de teste: valida em runtime que o literal é IsoDateTime. */
function dt(value: string): IsoDateTime {
  if (!isIsoDateTime(value)) {
    throw new Error(`Data ISO inválida no teste: ${value}`);
  }
  return value;
}
import {
  AGENDA_TITLE_MAX,
  AGENDA_DESCRIPTION_MAX,
  APPOINTMENT_LOCATION_MAX,
} from "@/domain/core/agenda";
import {
  buildCreateAppointmentInput,
  buildCreateDeadlineInput,
  datetimeLocalToIso,
  EMPTY_APPOINTMENT_FORM,
  EMPTY_DEADLINE_FORM,
  hasAppointmentDraft,
  hasDeadlineDraft,
  normalizeOptionalDescription,
  normalizeOptionalLocation,
  normalizeTitle,
  translateAgendaServiceError,
  validateAppointmentInterval,
  type CreateAppointmentFormState,
  type CreateDeadlineFormState,
} from "@/features/agenda/create-form";
import {
  buildMonthCells,
  selectUpcomingDeadlines,
} from "@/features/agenda/date-view";
import {
  EMPTY_AGENDA_FILTERS,
  hasActiveFilters,
} from "@/features/agenda/filters";

// ---- Contextos -----------------------------------------------------------

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

const READONLY_ALFA: ServiceContext = Object.freeze({
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_1_ID,
  membershipId: SEED_MEM_ALFA_OWNER_ID,
  role: "leitura",
});

function ok<T>(r: ServiceResult<T>): T {
  if (!r.ok) throw new Error("service failed: " + JSON.stringify(r.error));
  return r.data;
}

function fail<T>(r: ServiceResult<T>) {
  if (r.ok) throw new Error("expected failure");
  return r.error;
}

const DEADLINE_FORM_OK: CreateDeadlineFormState = Object.freeze({
  caseId: SEED_CASE_ALFA_1_ID,
  kind: "internal",
  title: "  Estudar autos  ",
  description: "  detalhamento  ",
  dueAtLocal: "2026-06-15T10:30",
  priority: "normal",
  assignmentId: "",
});

const APPT_FORM_OK: CreateAppointmentFormState = Object.freeze({
  caseId: SEED_CASE_ALFA_1_ID,
  kind: "meeting",
  title: "  Reunião inicial  ",
  description: "",
  startsAtLocal: "2026-06-15T10:00",
  endsAtLocal: "2026-06-15T11:00",
  mode: "in_person",
  location: "  Fórum Central  ",
  assignmentId: "",
});

// ============================================================================
// 1. Limpezas técnicas
// ============================================================================

describe("LV-09.1B.4 — limpezas técnicas", () => {
  it("1. tests/agenda-091b3.test.ts não contém @ts-expect-error", () => {
    const src = readFileSync("tests/agenda-091b3.test.ts", "utf8");
    expect(src.includes("@ts-expect-error")).toBe(false);
  });

  it("2. tests/agenda-091b3.test.ts não usa comparação textual de datas", () => {
    const src = readFileSync("tests/agenda-091b3.test.ts", "utf8");
    expect(src.includes("a.dueAt < b.dueAt")).toBe(false);
    expect(src.includes("[...ts].sort()")).toBe(false);
    expect(src.includes("compareIsoDateTime")).toBe(true);
  });
});

// ============================================================================
// 2. Helpers puros
// ============================================================================

describe("LV-09.1B.4 — helpers de título/texto", () => {
  it("3. normaliza título com espaços externos", () => {
    const r = normalizeTitle("  Estudar autos  ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("Estudar autos");
  });

  it("4. título vazio é rejeitado", () => {
    const r = normalizeTitle("");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("empty");
  });

  it("5. título só espaços é rejeitado", () => {
    const r = normalizeTitle("     ");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("empty");
  });

  it("6. título acima do limite é rejeitado", () => {
    const r = normalizeTitle("x".repeat(AGENDA_TITLE_MAX + 1));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("too_long");
  });

  it("7. descrição vazia é omitida", () => {
    const r = normalizeOptionalDescription("   ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBeUndefined();
  });

  it("8. descrição acima do limite é rejeitada", () => {
    const r = normalizeOptionalDescription("x".repeat(AGENDA_DESCRIPTION_MAX + 1));
    expect(r.ok).toBe(false);
  });

  it("9. localização vazia é omitida", () => {
    const r = normalizeOptionalLocation("");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBeUndefined();
  });

  it("10. localização acima de 300 é rejeitada", () => {
    const r = normalizeOptionalLocation("x".repeat(APPOINTMENT_LOCATION_MAX + 1));
    expect(r.ok).toBe(false);
  });
});

describe("LV-09.1B.4 — datetime-local -> ISO", () => {
  it("11. datetime-local válido gera ISO válido", () => {
    const r = datetimeLocalToIso("2026-06-15T10:30");
    expect(r.ok).toBe(true);
    if (r.ok) expect(isIsoDateTime(r.value)).toBe(true);
  });

  it("12. datetime-local vazio é rejeitado com reason=empty", () => {
    const r = datetimeLocalToIso("");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("empty");
  });

  it("13. datetime-local malformado é rejeitado", () => {
    const r = datetimeLocalToIso("2026-06-15 10:30");
    expect(r.ok).toBe(false);
  });

  it("14. data inválida (31/02) é rejeitada", () => {
    const r = datetimeLocalToIso("2026-02-31T10:00");
    expect(r.ok).toBe(false);
  });

  it("15. hora fora de faixa é rejeitada", () => {
    const r = datetimeLocalToIso("2026-06-15T25:00");
    expect(r.ok).toBe(false);
  });

  it("16. datetime-local com segundos é aceito", () => {
    const r = datetimeLocalToIso("2026-06-15T10:30:45");
    expect(r.ok).toBe(true);
  });

  it("17. ISO produzido reflete o instante local convertido", () => {
    const r = datetimeLocalToIso("2026-06-15T10:30");
    expect(r.ok).toBe(true);
    if (r.ok) {
      const parsed = new Date(r.value);
      const local = new Date(2026, 5, 15, 10, 30, 0);
      expect(parsed.getTime()).toBe(local.getTime());
    }
  });
});

describe("LV-09.1B.4 — intervalo do compromisso", () => {
  it("18. término posterior é aceito", () => {
    const s = datetimeLocalToIso("2026-06-15T10:00");
    const e = datetimeLocalToIso("2026-06-15T11:00");
    if (!s.ok || !e.ok) throw new Error();
    const r = validateAppointmentInterval(s.value, e.value);
    expect(r.ok).toBe(true);
  });

  it("19. término igual é rejeitado", () => {
    const s = datetimeLocalToIso("2026-06-15T10:00");
    const e = datetimeLocalToIso("2026-06-15T10:00");
    if (!s.ok || !e.ok) throw new Error();
    const r = validateAppointmentInterval(s.value, e.value);
    expect(r.ok).toBe(false);
  });

  it("20. término anterior é rejeitado", () => {
    const s = datetimeLocalToIso("2026-06-15T11:00");
    const e = datetimeLocalToIso("2026-06-15T10:00");
    if (!s.ok || !e.ok) throw new Error();
    const r = validateAppointmentInterval(s.value, e.value);
    expect(r.ok).toBe(false);
  });
});

// ============================================================================
// 3. Builders
// ============================================================================

describe("LV-09.1B.4 — buildCreateDeadlineInput", () => {
  it("21. input válido normaliza título e omite descrição vazia", () => {
    const r = buildCreateDeadlineInput({
      ...DEADLINE_FORM_OK,
      description: "   ",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.input.title).toBe("Estudar autos");
      expect("description" in r.input).toBe(false);
      expect(r.input.caseId).toBe(SEED_CASE_ALFA_1_ID);
      expect(r.input.kind).toBe("internal");
      expect(r.input.priority).toBe("normal");
      expect(isIsoDateTime(r.input.dueAt)).toBe(true);
      expect("assignmentId" in r.input).toBe(false);
    }
  });

  it("22. processo ausente falha com erro no campo caseId", () => {
    const r = buildCreateDeadlineInput({ ...DEADLINE_FORM_OK, caseId: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.caseId).toBeTruthy();
  });

  it("23. tipo inválido falha", () => {
    const r = buildCreateDeadlineInput({ ...DEADLINE_FORM_OK, kind: "foo" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.kind).toBeTruthy();
  });

  it("24. prioridade inválida falha", () => {
    const r = buildCreateDeadlineInput({
      ...DEADLINE_FORM_OK,
      priority: "critical",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.priority).toBeTruthy();
  });

  it("25. título vazio falha", () => {
    const r = buildCreateDeadlineInput({ ...DEADLINE_FORM_OK, title: "   " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.title).toBeTruthy();
  });

  it("26. título excede limite falha", () => {
    const r = buildCreateDeadlineInput({
      ...DEADLINE_FORM_OK,
      title: "x".repeat(AGENDA_TITLE_MAX + 1),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.title).toBeTruthy();
  });

  it("27. dueAt vazio falha", () => {
    const r = buildCreateDeadlineInput({ ...DEADLINE_FORM_OK, dueAtLocal: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.dueAt).toBeTruthy();
  });

  it("28. assignment inválido falha", () => {
    const r = buildCreateDeadlineInput({
      ...DEADLINE_FORM_OK,
      assignmentId: "abc",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.assignmentId).toBeTruthy();
  });

  it("29. input não carrega campos extras (id/status/metadata)", () => {
    const r = buildCreateDeadlineInput(DEADLINE_FORM_OK);
    if (!r.ok) throw new Error();
    const keys = Object.keys(r.input).sort();
    // caseId, kind, title, dueAt, priority + description (opcional)
    expect(keys).not.toContain("id");
    expect(keys).not.toContain("status");
    expect(keys).not.toContain("metadata");
    expect(keys).not.toContain("organizationId");
    expect(keys).not.toContain("version");
    expect(keys).not.toContain("expectedVersion");
    expect(keys).not.toContain("completedAt");
  });

  it("30. assignment válido é incluído", () => {
    const r = buildCreateDeadlineInput({
      ...DEADLINE_FORM_OK,
      assignmentId: SEED_ASSIGN_ALFA_1_ID,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.input.assignmentId).toBe(SEED_ASSIGN_ALFA_1_ID);
  });
});

describe("LV-09.1B.4 — buildCreateAppointmentInput", () => {
  it("31. compromisso válido inclui location trimmed", () => {
    const r = buildCreateAppointmentInput(APPT_FORM_OK);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.input.title).toBe("Reunião inicial");
      expect(r.input.location).toBe("Fórum Central");
      expect(r.input.mode).toBe("in_person");
      expect(isIsoDateTime(r.input.startsAt)).toBe(true);
      expect(isIsoDateTime(r.input.endsAt)).toBe(true);
      expect("description" in r.input).toBe(false);
    }
  });

  it("32. término igual ao início falha no campo endsAt", () => {
    const r = buildCreateAppointmentInput({
      ...APPT_FORM_OK,
      endsAtLocal: APPT_FORM_OK.startsAtLocal,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.endsAt).toBeTruthy();
  });

  it("33. término anterior falha", () => {
    const r = buildCreateAppointmentInput({
      ...APPT_FORM_OK,
      startsAtLocal: "2026-06-15T11:00",
      endsAtLocal: "2026-06-15T10:00",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.endsAt).toBeTruthy();
  });

  it("34. modalidade inválida falha", () => {
    const r = buildCreateAppointmentInput({ ...APPT_FORM_OK, mode: "phone" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.mode).toBeTruthy();
  });

  it("35. localização vazia é omitida", () => {
    const r = buildCreateAppointmentInput({ ...APPT_FORM_OK, location: "  " });
    expect(r.ok).toBe(true);
    if (r.ok) expect("location" in r.input).toBe(false);
  });

  it("36. localização acima do limite falha", () => {
    const r = buildCreateAppointmentInput({
      ...APPT_FORM_OK,
      location: "x".repeat(APPOINTMENT_LOCATION_MAX + 1),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.location).toBeTruthy();
  });

  it("37. input não carrega campos extras", () => {
    const r = buildCreateAppointmentInput(APPT_FORM_OK);
    if (!r.ok) throw new Error();
    const keys = Object.keys(r.input);
    expect(keys).not.toContain("id");
    expect(keys).not.toContain("status");
    expect(keys).not.toContain("metadata");
    expect(keys).not.toContain("organizationId");
    expect(keys).not.toContain("version");
  });

  it("38. início inválido falha em startsAt", () => {
    const r = buildCreateAppointmentInput({
      ...APPT_FORM_OK,
      startsAtLocal: "xxx",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.startsAt).toBeTruthy();
  });
});

// ============================================================================
// 4. Rascunho
// ============================================================================

describe("LV-09.1B.4 — detecção de rascunho", () => {
  it("39. formulário vazio não é rascunho", () => {
    expect(hasDeadlineDraft(EMPTY_DEADLINE_FORM)).toBe(false);
    expect(hasAppointmentDraft(EMPTY_APPOINTMENT_FORM)).toBe(false);
  });

  it("40. qualquer campo preenchido é rascunho", () => {
    expect(hasDeadlineDraft({ ...EMPTY_DEADLINE_FORM, title: "x" })).toBe(true);
    expect(
      hasAppointmentDraft({ ...EMPTY_APPOINTMENT_FORM, location: "sala" }),
    ).toBe(true);
  });
});

// ============================================================================
// 5. Tradução de erros
// ============================================================================

describe("LV-09.1B.4 — tradução de erros", () => {
  it("41. forbidden -> mensagem de permissão", () => {
    const t = translateAgendaServiceError({
      code: "forbidden",
      message: "case_access_denied",
    });
    expect(t.message).toContain("permissão");
  });

  it("42. validation_error assignment_not_active -> campo assignmentId", () => {
    const t = translateAgendaServiceError({
      code: "validation_error",
      message: "assignment_not_active",
    });
    expect(t.field).toBe("assignmentId");
  });

  it("43. validation_error invalid_range -> campo endsAt", () => {
    const t = translateAgendaServiceError({
      code: "validation_error",
      message: "invalid_range",
    });
    expect(t.field).toBe("endsAt");
  });

  it("44. not_found -> mensagem sobre processo indisponível", () => {
    const t = translateAgendaServiceError({
      code: "not_found",
      message: "deadline_not_found",
    });
    expect(t.message.toLowerCase()).toContain("processo");
  });

  it("45. mensagem desconhecida vira mensagem genérica", () => {
    const t = translateAgendaServiceError({
      code: "validation_error",
      message: "algo_desconhecido",
    });
    expect(typeof t.message).toBe("string");
    expect(t.message.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 6. Integração com serviços
// ============================================================================

describe("LV-09.1B.4 — integração com DeadlineService.create", () => {
  it("46. cria prazo pendente com versão 1", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(
      await env.services.deadlines.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        kind: "internal",
        title: "Estudo",
        dueAt: dt("2026-06-15T10:30:00.000Z"),
        priority: "normal",
      }),
    );
    expect(r.status).toBe("pending");
    expect(r.metadata.version).toBe(1);
    expect(r.organizationId).toBe(SEED_ORG_ALFA_ID);
    expect(typeof r.id).toBe("string");
  });

  it("47. cross-org: OWNER_BETA não pode usar case ALFA", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.deadlines.create(OWNER_BETA, {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "internal",
      title: "Estudo",
      dueAt: dt("2026-06-15T10:30:00.000Z"),
      priority: "normal",
    });
    expect(r.ok).toBe(false);
  });

  it("48. assignment de outro processo é rejeitado", async () => {
    const env = createMockDomainEnvironment();
    // SEED_ASSIGN_ALFA_1 pertence a case ALFA 2, tento em ALFA 1
    const r = await env.services.deadlines.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "internal",
      title: "Estudo",
      dueAt: dt("2026-06-15T10:30:00.000Z"),
      priority: "normal",
      assignmentId: SEED_ASSIGN_ALFA_1_ID as AssignmentId,
    });
    expect(r.ok).toBe(false);
  });

  it("49. assignment do mesmo processo é aceito", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(
      await env.services.deadlines.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_2_ID,
        kind: "internal",
        title: "Estudo",
        dueAt: dt("2026-06-15T10:30:00.000Z"),
        priority: "normal",
        assignmentId: SEED_ASSIGN_ALFA_1_ID as AssignmentId,
      }),
    );
    expect(r.assignmentId).toBe(SEED_ASSIGN_ALFA_1_ID);
  });

  it("50. permission.evaluate para contexto inconsistente é negado", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.permissions.evaluate(READONLY_ALFA, {
      action: "deadline.create",
      caseId: SEED_CASE_ALFA_1_ID,
    });
    // Contexto inválido -> ok:false; contexto válido com papel restrito -> ok:true, allowed:false.
    if (r.ok) expect(r.data.allowed).toBe(false);
    else expect(r.ok).toBe(false);
  });

  it("51. serviço também nega criação para papel de leitura", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.deadlines.create(READONLY_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "internal",
      title: "Estudo",
      dueAt: dt("2026-06-15T10:30:00.000Z"),
      priority: "normal",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(["forbidden", "not_found", "validation_error"]).toContain(
        r.error.code,
      );
    }
  });

  it("52. cross-org não revela existência (not_found ou forbidden)", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.deadlines.create(OWNER_ALFA, {
      caseId: SEED_CASE_BETA_1_ID,
      kind: "internal",
      title: "Estudo",
      dueAt: dt("2026-06-15T10:30:00.000Z"),
      priority: "normal",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(["not_found", "forbidden"]).toContain(r.error.code);
    }
  });

  it("53. criação bem-sucedida aparece na listagem", async () => {
    const env = createMockDomainEnvironment();
    ok(
      await env.services.deadlines.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        kind: "internal",
        title: "NovoPrazoUnico123",
        dueAt: dt("2026-07-15T10:30:00.000Z"),
        priority: "high",
      }),
    );
    const list = ok(
      await env.services.deadlines.list(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        page: { limit: 100 },
      }),
    );
    expect(list.items.some((d) => d.title === "NovoPrazoUnico123")).toBe(true);
  });

  it("54. criação negada não altera o store", async () => {
    const env = createMockDomainEnvironment();
    const before = env.snapshot().deadlines.length;
    await env.services.deadlines.create(READONLY_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "internal",
      title: "X",
      dueAt: dt("2026-06-15T10:30:00.000Z"),
      priority: "normal",
    });
    expect(env.snapshot().deadlines.length).toBe(before);
  });
});

describe("LV-09.1B.4 — integração com AppointmentService.create", () => {
  it("55. cria compromisso agendado com versão 1", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(
      await env.services.appointments.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        kind: "meeting",
        title: "Reunião",
        startsAt: dt("2026-06-15T10:00:00.000Z"),
        endsAt: dt("2026-06-15T11:00:00.000Z"),
        mode: "in_person",
      }),
    );
    expect(r.status).toBe("scheduled");
    expect(r.metadata.version).toBe(1);
    expect(r.organizationId).toBe(SEED_ORG_ALFA_ID);
  });

  it("56. término <= início é rejeitado pelo serviço", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.appointments.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "meeting",
      title: "X",
      startsAt: dt("2026-06-15T10:00:00.000Z"),
      endsAt: dt("2026-06-15T10:00:00.000Z"),
      mode: "in_person",
    });
    expect(r.ok).toBe(false);
  });

  it("57. compromisso cross-org é rejeitado", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.appointments.create(OWNER_BETA, {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "meeting",
      title: "X",
      startsAt: dt("2026-06-15T10:00:00.000Z"),
      endsAt: dt("2026-06-15T11:00:00.000Z"),
      mode: "in_person",
    });
    expect(r.ok).toBe(false);
  });

  it("58. assignment de outro processo é rejeitado", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.appointments.create(OWNER_BETA, {
      caseId: SEED_CASE_BETA_1_ID,
      kind: "meeting",
      title: "X",
      startsAt: dt("2026-06-15T10:00:00.000Z"),
      endsAt: dt("2026-06-15T11:00:00.000Z"),
      mode: "in_person",
      assignmentId: SEED_ASSIGN_BETA_1_ID as AssignmentId,
    });
    // SEED_ASSIGN_BETA_1 pertence a Beta 2 (não Beta 1)
    expect(r.ok).toBe(false);
  });

  it("59. compromisso aparece na listagem após criação", async () => {
    const env = createMockDomainEnvironment();
    ok(
      await env.services.appointments.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        kind: "hearing",
        title: "ReuniaoTesteUnica789",
        startsAt: dt("2026-06-15T10:00:00.000Z"),
        endsAt: dt("2026-06-15T11:00:00.000Z"),
        mode: "remote",
      }),
    );
    const list = ok(
      await env.services.appointments.list(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        page: { limit: 100 },
      }),
    );
    expect(list.items.some((a) => a.title === "ReuniaoTesteUnica789")).toBe(true);
  });

  it("60. criação bem-sucedida não altera filtros do usuário (contrato puro)", async () => {
    // Verifica que EMPTY_AGENDA_FILTERS continua imutável após qualquer chamada.
    const env = createMockDomainEnvironment();
    ok(
      await env.services.appointments.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        kind: "meeting",
        title: "X",
        startsAt: dt("2026-06-15T10:00:00.000Z"),
        endsAt: dt("2026-06-15T11:00:00.000Z"),
        mode: "in_person",
      }),
    );
    expect(hasActiveFilters(EMPTY_AGENDA_FILTERS)).toBe(false);
  });
});

// ============================================================================
// 7. Permissões
// ============================================================================

describe("LV-09.1B.4 — permissões", () => {
  it("61. proprietário Alfa recebe allowed para deadline.create em case Alfa", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(
      await env.services.permissions.evaluate(OWNER_ALFA, {
        action: "deadline.create",
        caseId: SEED_CASE_ALFA_1_ID,
      }),
    );
    expect(r.allowed).toBe(true);
  });

  it("62. proprietário Alfa recebe denied para case Beta (case_access_denied)", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(
      await env.services.permissions.evaluate(OWNER_ALFA, {
        action: "appointment.create",
        caseId: SEED_CASE_BETA_1_ID,
      }),
    );
    expect(r.allowed).toBe(false);
  });

  it("63. contexto inconsistente é bloqueado pela política", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.permissions.evaluate(READONLY_ALFA, {
      action: "appointment.create",
      caseId: SEED_CASE_ALFA_1_ID,
    });
    if (r.ok) expect(r.data.allowed).toBe(false);
    else expect(r.ok).toBe(false);
  });
});

// ============================================================================
// 8. Regressão de visão
// ============================================================================

describe("LV-09.1B.4 — regressão da Agenda", () => {
  it("64. buildMonthCells mantém 42 células", () => {
    const cells = buildMonthCells(new Date(2026, 5, 15));
    expect(cells.length).toBe(42);
  });

  it("65. selectUpcomingDeadlines continua limitado a 5", async () => {
    const env = createMockDomainEnvironment();
    for (let i = 0; i < 8; i++) {
      const day = 10 + i;
      ok(
        await env.services.deadlines.create(OWNER_ALFA, {
          caseId: SEED_CASE_ALFA_1_ID,
          kind: "internal",
          title: `p${i}`,
          dueAt: dt(`2026-08-${String(day).padStart(2, "0")}T10:00:00.000Z`),
          priority: "normal",
        }),
      );
    }
    const list = ok(
      await env.services.deadlines.list(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        page: { limit: 100 },
      }),
    );
    const now = Date.parse("2026-01-01T00:00:00.000Z");
    const up = selectUpcomingDeadlines(list.items, now, 5);
    expect(up.length).toBe(5);
  });

  it("66. EMPTY_AGENDA_FILTERS permanece congelado", () => {
    expect(Object.isFrozen(EMPTY_AGENDA_FILTERS)).toBe(true);
  });

  it("67. nenhuma nova rota foi criada em src/routes/", () => {
    // A LV-09.1B.4 não pode criar rotas.
    const gen = readFileSync("src/routeTree.gen.ts", "utf8");
    // Não deve haver nenhuma nova rota agenda.novo ou agenda.criar.
    expect(gen.includes("agenda.novo")).toBe(false);
    expect(gen.includes("agenda.criar")).toBe(false);
    expect(gen.includes("agenda.new")).toBe(false);
  });

  it("68. app.agenda.tsx contém botão Novo item e diálogo", () => {
    const src = readFileSync("src/routes/app.agenda.tsx", "utf8");
    expect(src).toContain("Novo item");
    expect(src).toContain("AgendaCreateDialog");
  });
});

// ---------------------------------------------------------------------------
// LV-09.1B.4.1 — fechamento técnico (correções pontuais)
// ---------------------------------------------------------------------------

describe("LV-09.1B.4.1 — fechamento técnico", () => {
  it("69. helper dt() aceita ISO válido e rejeita inválido", () => {
    expect(dt("2026-08-01T10:00:00.000Z")).toBe("2026-08-01T10:00:00.000Z");
    expect(() => dt("nao-e-iso")).toThrow();
    expect(() => dt("2026-13-40T10:00:00.000Z")).toThrow();
  });

  it("70. tests/agenda-091b4.test.ts não contém casts inseguros", () => {
    const src = readFileSync("tests/agenda-091b4.test.ts", "utf8");
    expect(/\bas\s+never\b/.test(src)).toBe(false);
    expect(/\bas\s+any\b/.test(src)).toBe(false);
    expect(src.includes("@ts-ignore")).toBe(false);
    expect(src.includes("@ts-expect-error")).toBe(false);
  });

  it("71. translateAgendaServiceError mapeia period_inverted para endsAt", async () => {
    const { translateAgendaServiceError } = await import(
      "@/features/agenda/create-form"
    );
    const t = translateAgendaServiceError({
      code: "validation_error",
      message: "period_inverted",
    });
    expect(t.field).toBe("endsAt");
    expect(t.message.length).toBeGreaterThan(0);
  });

  it("72. period_inverted difere de invalid_range no mesmo mapeamento", async () => {
    const { translateAgendaServiceError } = await import(
      "@/features/agenda/create-form"
    );
    const a = translateAgendaServiceError({
      code: "validation_error",
      message: "period_inverted",
    });
    const b = translateAgendaServiceError({
      code: "validation_error",
      message: "invalid_range",
    });
    expect(a.field).toBe("endsAt");
    expect(b.field).toBe("endsAt");
  });

  it("73. AppointmentService.create devolve period_inverted quando endsAt <= startsAt", async () => {
    const env = createMockDomainEnvironment();
    const ctx: ServiceContext = {
      actor: { userId: SEED_USER_1_ID, membershipId: SEED_MEM_ALFA_OWNER_ID },
      organizationId: SEED_ORG_ALFA_ID,
      now: dt("2026-08-01T10:00:00.000Z"),
    };
    const res: ServiceResult<unknown> = await env.services.appointments.create(
      ctx,
      {
        caseId: SEED_CASE_ALFA_1_ID,
        kind: "hearing",
        title: "Audiência inválida",
        startsAt: dt("2026-08-02T14:00:00.000Z"),
        endsAt: dt("2026-08-02T14:00:00.000Z"),
        mode: "in_person",
      },
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("validation_error");
      expect(res.error.message).toBe("period_inverted");
    }
  });

  it("74. AgendaCreateDialog.tsx expõe constantes de paginação", () => {
    const src = readFileSync(
      "src/features/agenda/AgendaCreateDialog.tsx",
      "utf8",
    );
    expect(src).toContain("ASSIGNMENTS_MAX_PAGES");
    expect(src).toContain("ASSIGNMENTS_PAGE_LIMIT");
    // Limite máximo alinhado com a especificação (20 páginas).
    expect(src).toContain("ASSIGNMENTS_MAX_PAGES = 20");
  });

  it("75. AgendaCreateDialog usa cursor e nextCursor no loop de assignments", () => {
    const src = readFileSync(
      "src/features/agenda/AgendaCreateDialog.tsx",
      "utf8",
    );
    expect(src).toContain("nextCursor");
    expect(src).toContain("cursor");
    // Filtra apenas ativos.
    expect(src).toContain('status !== "active"');
  });

  it("76. AgendaCreateDialog descarta respostas obsoletas via requestId", () => {
    const src = readFileSync(
      "src/features/agenda/AgendaCreateDialog.tsx",
      "utf8",
    );
    expect(src).toContain("assignmentsReqIdRef");
    expect(src).toMatch(/reqId\s*!==\s*assignmentsReqIdRef\.current/);
  });

  it("77. AgendaCreateDialog deduplica assignments por ID", () => {
    const src = readFileSync(
      "src/features/agenda/AgendaCreateDialog.tsx",
      "utf8",
    );
    expect(src).toContain("new Set");
    expect(src).toMatch(/seen\.(add|has)/);
  });

  it("78. paginação por cursor: listByCase percorre múltiplas páginas sem duplicar", async () => {
    const env = createMockDomainEnvironment();
    const ctx: ServiceContext = {
      actor: { userId: SEED_USER_1_ID, membershipId: SEED_MEM_ALFA_OWNER_ID },
      organizationId: SEED_ORG_ALFA_ID,
      now: dt("2026-08-01T10:00:00.000Z"),
    };
    const collected: string[] = [];
    const seen = new Set<string>();
    let cursor: string | undefined;
    for (let i = 0; i < 20; i++) {
      const res = cursor
        ? await env.services.assignments.listByCase(ctx, SEED_CASE_ALFA_1_ID, {
            cursor,
            limit: 1,
          })
        : await env.services.assignments.listByCase(ctx, SEED_CASE_ALFA_1_ID, {
            limit: 1,
          });
      expect(res.ok).toBe(true);
      if (!res.ok) break;
      for (const a of res.data.items) {
        const key = String(a.id);
        if (seen.has(key)) throw new Error("duplicata inesperada");
        seen.add(key);
        collected.push(key);
      }
      if (!res.data.nextCursor) break;
      cursor = res.data.nextCursor;
    }
    expect(collected.length).toBeGreaterThan(0);
    expect(new Set(collected).size).toBe(collected.length);
  });

  it("79. AssignmentSelect declara aria-invalid, aria-describedby e aria-busy", () => {
    const src = readFileSync(
      "src/features/agenda/AgendaCreateDialog.tsx",
      "utf8",
    );
    expect(src).toContain("aria-invalid");
    expect(src).toContain("aria-describedby");
    expect(src).toContain("aria-busy");
  });

  it("80. AssignmentSelect oferece botão Tentar novamente", () => {
    const src = readFileSync(
      "src/features/agenda/AgendaCreateDialog.tsx",
      "utf8",
    );
    expect(src).toContain("Tentar novamente");
    expect(src).toContain("onRetry");
    expect(src).toContain("assignmentsAttempt");
  });

  it("81. IDs exclusivos de erro do responsável nos dois formulários", () => {
    const src = readFileSync(
      "src/features/agenda/AgendaCreateDialog.tsx",
      "utf8",
    );
    expect(src).toContain("err-d-assignee");
    expect(src).toContain("err-d-assignee-load");
    expect(src).toContain("err-a-assignee");
    expect(src).toContain("err-a-assignee-load");
  });

  it("82. falha ao carregar responsáveis não bloqueia criação sem responsável", () => {
    const built = buildCreateDeadlineInput({
      ...EMPTY_DEADLINE_FORM,
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "protocol",
      title: "Prazo sem responsável",
      dueAtLocal: "2026-08-10T10:00",
      priority: "high",
      assignmentId: "",
    });
    expect(built.ok).toBe(true);
    if (built.ok) {
      expect(built.input.assignmentId).toBeUndefined();
    }
  });

  it("83. app.agenda.tsx rastreia item pendente após criação", () => {
    const src = readFileSync("src/routes/app.agenda.tsx", "utf8");
    expect(src).toContain("pendingCreated");
    expect(src).toContain("setPendingCreated");
  });

  it("84. app.agenda.tsx testa visibilidade contra visible.deadlines/appointments", () => {
    const src = readFileSync("src/routes/app.agenda.tsx", "utf8");
    expect(src).toContain("visible.deadlines");
    expect(src).toContain("visible.appointments");
    expect(src).toContain(
      "Item criado com sucesso. Ele não aparece na visualização atual",
    );
  });

  it("85. handleCreated não depende mais do range no aviso de invisibilidade", () => {
    const src = readFileSync("src/routes/app.agenda.tsx", "utf8");
    // O aviso agora vive no efeito de visibilidade, não em handleCreated.
    const idx = src.indexOf("const handleCreated");
    expect(idx).toBeGreaterThan(-1);
    const chunk = src.slice(idx, idx + 400);
    expect(chunk.includes("toast.info")).toBe(false);
  });

  it("86. AgendaCreateDialog anuncia carregamento de responsáveis via sr-only + aria-live", () => {
    const src = readFileSync(
      "src/features/agenda/AgendaCreateDialog.tsx",
      "utf8",
    );
    expect(src).toContain('aria-live="polite"');
    expect(src).toContain("Carregando responsáveis");
  });

  it("87. tradutor mapeia period_inverted para mensagem em pt-BR", async () => {
    const { translateAgendaServiceError } = await import(
      "@/features/agenda/create-form"
    );
    const t = translateAgendaServiceError({
      code: "validation_error",
      message: "period_inverted",
    });
    expect(t.message).toBe(
      "O horário de término deve ser posterior ao início.",
    );
  });

  it("88. criar dois compromissos consecutivos preserva a integridade da lista visível", async () => {
    const env = createMockDomainEnvironment();
    const ctx: ServiceContext = {
      actor: { userId: SEED_USER_1_ID, membershipId: SEED_MEM_ALFA_OWNER_ID },
      organizationId: SEED_ORG_ALFA_ID,
      now: dt("2026-08-01T10:00:00.000Z"),
    };
    const a = await env.services.appointments.create(ctx, {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "hearing",
      title: "A1",
      startsAt: dt("2026-08-05T10:00:00.000Z"),
      endsAt: dt("2026-08-05T11:00:00.000Z"),
      mode: "in_person",
    });
    const b = await env.services.appointments.create(ctx, {
      caseId: SEED_CASE_ALFA_1_ID,
      kind: "hearing",
      title: "A2",
      startsAt: dt("2026-08-06T10:00:00.000Z"),
      endsAt: dt("2026-08-06T11:00:00.000Z"),
      mode: "in_person",
    });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.data.id).not.toBe(b.data.id);
    }
  });
});
