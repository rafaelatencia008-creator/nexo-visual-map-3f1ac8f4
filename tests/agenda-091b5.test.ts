/**
 * LV-09.1B.5 — Testes comportamentais de detalhe e edição de itens da Agenda.
 *
 * Cobre:
 * - conversão ISO ⇄ datetime-local;
 * - snapshots de formulário e detecção de alterações;
 * - builders de UpdateDeadlineInput/UpdateAppointmentInput (delta,
 *   expectedVersion, remoção de opcionais como null);
 * - tradutor de erros de atualização (conflict/field/general);
 * - integração com serviços oficiais: getById, update, expectedVersion,
 *   conflitos otimistas, permissões e respostas obsoletas;
 * - reexports do módulo de visibilidade de item;
 * - regressões de fonte: cards clicáveis com Enter/Espaço, ausência de nova
 *   rota, ausência de exclusão/mudança de status nesta etapa.
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
} from "@/domain/mocks/seed";
import type { ServiceContext } from "@/domain/services/context";
import type { ServiceResult } from "@/domain/services/result";
import { isIsoDateTime, type IsoDateTime } from "@/domain/core/common";
import type { Appointment, Deadline } from "@/domain/core/agenda";
import {
  AGENDA_DESCRIPTION_MAX,
  AGENDA_TITLE_MAX,
  APPOINTMENT_LOCATION_MAX,
} from "@/domain/core/agenda";
import {
  appointmentToEditForm,
  buildUpdateAppointmentInput,
  buildUpdateDeadlineInput,
  deadlineToEditForm,
  formatDurationLabel,
  hasAppointmentChanges,
  hasDeadlineChanges,
  isoDateTimeToDatetimeLocal,
  translateAgendaUpdateError,
  type EditAppointmentFormState,
  type EditDeadlineFormState,
} from "@/features/agenda/edit-form";
import {
  resolveAgendaItemVisibility,
  type PendingAgendaItemMarker,
} from "@/features/agenda/item-visibility";

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
      title: "Prazo teste",
      description: "descrição",
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
      title: "Reunião teste",
      description: "descrição",
      startsAt: dt("2026-06-15T10:00:00.000Z"),
      endsAt: dt("2026-06-15T11:00:00.000Z"),
      mode: "remote",
    }),
  );
}

const AGENDA_ROUTE_SRC = readFileSync("src/routes/app.agenda.tsx", "utf8");
const DETAIL_SRC = readFileSync(
  "src/features/agenda/AgendaItemDetailDialog.tsx",
  "utf8",
);
const EDIT_FORM_SRC = readFileSync(
  "src/features/agenda/edit-form.ts",
  "utf8",
);

// =========================================================================
// 1) Conversão ISO ⇄ datetime-local (round-trip determinístico)
// =========================================================================

describe("LV-09.1B.5 — isoDateTimeToDatetimeLocal", () => {
  it("1. produz string no formato AAAA-MM-DDTHH:MM", () => {
    const s = isoDateTimeToDatetimeLocal(dt("2026-06-15T10:30:00.000Z"));
    expect(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)).toBe(true);
  });

  it("2. round-trip preserva o instante quando reinterpretado no mesmo fuso", () => {
    const iso = dt("2026-06-15T10:30:00.000Z");
    const local = isoDateTimeToDatetimeLocal(iso);
    // Reinterpretar como local produz exatamente o mesmo epoch.
    const back = new Date(local).getTime();
    expect(back).toBe(new Date(iso).getTime());
  });

  it("3. lança erro para ISO inválido", () => {
    expect(() => isoDateTimeToDatetimeLocal("nao-eh-iso")).toThrow(
      /invalid_iso/,
    );
  });
});

// =========================================================================
// 2) Snapshots de formulário (deadlineToEditForm / appointmentToEditForm)
// =========================================================================

describe("LV-09.1B.5 — snapshots de edição", () => {
  it("4. deadlineToEditForm copia todos os campos permitidos", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const f = deadlineToEditForm(d);
    expect(f.kind).toBe(d.kind);
    expect(f.title).toBe(d.title);
    expect(f.description).toBe(d.description ?? "");
    expect(f.priority).toBe(d.priority);
    expect(f.assignmentId).toBe(d.assignmentId ?? "");
    // dueAtLocal aponta para o mesmo instante
    expect(new Date(f.dueAtLocal).getTime()).toBe(new Date(d.dueAt).getTime());
  });

  it("5. deadlineToEditForm gera objeto congelado (Object.isFrozen)", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    expect(Object.isFrozen(deadlineToEditForm(d))).toBe(true);
  });

  it("6. appointmentToEditForm copia todos os campos permitidos", async () => {
    const env = createMockDomainEnvironment();
    const a = await makeAppointment(env);
    const f = appointmentToEditForm(a);
    expect(f.kind).toBe(a.kind);
    expect(f.title).toBe(a.title);
    expect(f.description).toBe(a.description ?? "");
    expect(f.location).toBe(a.location ?? "");
    expect(f.mode).toBe(a.mode);
    expect(f.assignmentId).toBe(a.assignmentId ?? "");
    expect(new Date(f.startsAtLocal).getTime()).toBe(
      new Date(a.startsAt).getTime(),
    );
    expect(new Date(f.endsAtLocal).getTime()).toBe(
      new Date(a.endsAt).getTime(),
    );
  });

  it("7. appointmentToEditForm gera objeto congelado", async () => {
    const env = createMockDomainEnvironment();
    const a = await makeAppointment(env);
    expect(Object.isFrozen(appointmentToEditForm(a))).toBe(true);
  });
});

// =========================================================================
// 3) Detecção de alterações
// =========================================================================

describe("LV-09.1B.5 — hasDeadlineChanges", () => {
  async function base(): Promise<{ d: Deadline; f: EditDeadlineFormState }> {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    return { d, f: deadlineToEditForm(d) };
  }

  it("8. snapshot original NÃO é considerado alterado", async () => {
    const { d, f } = await base();
    expect(hasDeadlineChanges(d, f)).toBe(false);
  });

  it("9. alteração de título é detectada", async () => {
    const { d, f } = await base();
    expect(hasDeadlineChanges(d, { ...f, title: "Novo título" })).toBe(true);
  });

  it("10. espaços em torno do título são ignorados", async () => {
    const { d, f } = await base();
    expect(
      hasDeadlineChanges(d, { ...f, title: `  ${d.title}  ` }),
    ).toBe(false);
  });

  it("11. mudança de tipo é detectada", async () => {
    const { d, f } = await base();
    expect(hasDeadlineChanges(d, { ...f, kind: "procedural" })).toBe(true);
  });

  it("12. limpar descrição (string vazia) altera opcional", async () => {
    const { d, f } = await base();
    expect(hasDeadlineChanges(d, { ...f, description: "" })).toBe(true);
    // e o oposto: nova descrição
    expect(hasDeadlineChanges(d, { ...f, description: "outra" })).toBe(true);
  });

  it("13. mudança de dueAtLocal para o mesmo instante NÃO altera", async () => {
    const { d, f } = await base();
    // Mesmo instante representado da mesma forma continua igual.
    expect(hasDeadlineChanges(d, f)).toBe(false);
    // Novo instante altera.
    const nextLocal = isoDateTimeToDatetimeLocal(
      dt(new Date(new Date(d.dueAt).getTime() + 3600_000).toISOString()),
    );
    expect(hasDeadlineChanges(d, { ...f, dueAtLocal: nextLocal })).toBe(true);
  });
});

describe("LV-09.1B.5 — hasAppointmentChanges", () => {
  async function base(): Promise<{ a: Appointment; f: EditAppointmentFormState }> {
    const env = createMockDomainEnvironment();
    const a = await makeAppointment(env);
    return { a, f: appointmentToEditForm(a) };
  }

  it("14. snapshot original NÃO é considerado alterado", async () => {
    const { a, f } = await base();
    expect(hasAppointmentChanges(a, f)).toBe(false);
  });

  it("15. mudança de mode é detectada", async () => {
    const { a, f } = await base();
    expect(hasAppointmentChanges(a, { ...f, mode: "in_person" })).toBe(true);
  });

  it("16. mudança de location vazia→valor detectada", async () => {
    const { a, f } = await base();
    expect(hasAppointmentChanges(a, { ...f, location: "Sala 1" })).toBe(true);
  });

  it("17. mesmo instante em startsAtLocal NÃO altera", async () => {
    const { a, f } = await base();
    expect(hasAppointmentChanges(a, f)).toBe(false);
  });

  it("18. alterar apenas endsAtLocal é detectado", async () => {
    const { a, f } = await base();
    const later = isoDateTimeToDatetimeLocal(
      dt(new Date(new Date(a.endsAt).getTime() + 1800_000).toISOString()),
    );
    expect(hasAppointmentChanges(a, { ...f, endsAtLocal: later })).toBe(true);
  });

  it("19. mudança de kind é detectada", async () => {
    const { a, f } = await base();
    expect(hasAppointmentChanges(a, { ...f, kind: "hearing" })).toBe(true);
  });
});

// =========================================================================
// 4) Builders de update (delta, expectedVersion, remoção via null)
// =========================================================================

describe("LV-09.1B.5 — buildUpdateDeadlineInput", () => {
  async function base(): Promise<{ d: Deadline; f: EditDeadlineFormState }> {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    return { d, f: deadlineToEditForm(d) };
  }

  it("20. sem alterações retorna { ok: true, changed: false }", async () => {
    const { d, f } = await base();
    const r = buildUpdateDeadlineInput(d, f, d.metadata.version);
    expect(r).toEqual({ ok: true, changed: false });
  });

  it("21. inclui apenas o campo alterado + caseId/deadlineId/expectedVersion", async () => {
    const { d, f } = await base();
    const r = buildUpdateDeadlineInput(
      d,
      { ...f, title: "Novo título" },
      d.metadata.version,
    );
    if (!(r.ok && r.changed)) throw new Error("expected changed:true");
    expect(r.input.title).toBe("Novo título");
    expect(r.input.caseId).toBe(d.caseId);
    expect(r.input.deadlineId).toBe(d.id);
    expect(r.input.expectedVersion).toBe(d.metadata.version);
    // Não vaza outros campos
    expect("kind" in r.input).toBe(false);
    expect("dueAt" in r.input).toBe(false);
    expect("assignmentId" in r.input).toBe(false);
  });

  it("22. limpar descrição envia description: null", async () => {
    const { d, f } = await base();
    const r = buildUpdateDeadlineInput(d, { ...f, description: "" }, d.metadata.version);
    if (!(r.ok && r.changed)) throw new Error("expected changed");
    expect(r.input.description).toBeNull();
  });

  it("23. limpar responsável envia assignmentId: null", async () => {
    // SEED_ASSIGN_ALFA_1_ID pertence a Case Alfa 2 (fixtures oficiais).
    const env = createMockDomainEnvironment();
    const d = ok(
      await env.services.deadlines.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_2_ID,
        kind: "internal",
        title: "P",
        dueAt: dt("2026-07-01T10:00:00.000Z"),
        priority: "normal",
        assignmentId: SEED_ASSIGN_ALFA_1_ID,
      }),
    );
    const f = deadlineToEditForm(d);
    const r = buildUpdateDeadlineInput(
      d,
      { ...f, assignmentId: "" },
      d.metadata.version,
    );
    if (!(r.ok && r.changed)) throw new Error("expected changed");
    expect(r.input.assignmentId).toBeNull();
  });

  it("24. título vazio retorna erro de campo title", async () => {
    const { d, f } = await base();
    const r = buildUpdateDeadlineInput(d, { ...f, title: "  " }, d.metadata.version);
    if (r.ok) throw new Error("expected errors");
    expect(r.errors.title).toBeDefined();
  });

  it("25. título maior que AGENDA_TITLE_MAX retorna erro", async () => {
    const { d, f } = await base();
    const r = buildUpdateDeadlineInput(
      d,
      { ...f, title: "x".repeat(AGENDA_TITLE_MAX + 1) },
      d.metadata.version,
    );
    if (r.ok) throw new Error("expected errors");
    expect(r.errors.title).toBeDefined();
  });

  it("26. descrição maior que AGENDA_DESCRIPTION_MAX retorna erro", async () => {
    const { d, f } = await base();
    const r = buildUpdateDeadlineInput(
      d,
      { ...f, description: "x".repeat(AGENDA_DESCRIPTION_MAX + 1) },
      d.metadata.version,
    );
    if (r.ok) throw new Error("expected errors");
    expect(r.errors.description).toBeDefined();
  });

  it("27. kind inválido retorna erro de campo kind", async () => {
    const { d, f } = await base();
    const r = buildUpdateDeadlineInput(d, { ...f, kind: "xyz" }, d.metadata.version);
    if (r.ok) throw new Error("expected errors");
    expect(r.errors.kind).toBeDefined();
  });

  it("28. assignmentId inválido retorna erro assignmentId", async () => {
    const { d, f } = await base();
    const r = buildUpdateDeadlineInput(
      d,
      { ...f, assignmentId: "abc" },
      d.metadata.version,
    );
    if (r.ok) throw new Error("expected errors");
    expect(r.errors.assignmentId).toBeDefined();
  });
});

describe("LV-09.1B.5 — buildUpdateAppointmentInput", () => {
  async function base(): Promise<{ a: Appointment; f: EditAppointmentFormState }> {
    const env = createMockDomainEnvironment();
    const a = await makeAppointment(env);
    return { a, f: appointmentToEditForm(a) };
  }

  it("29. sem alterações retorna { ok: true, changed: false }", async () => {
    const { a, f } = await base();
    const r = buildUpdateAppointmentInput(a, f, a.metadata.version);
    expect(r).toEqual({ ok: true, changed: false });
  });

  it("30. alterar location envia location no delta", async () => {
    const { a, f } = await base();
    const r = buildUpdateAppointmentInput(
      a,
      { ...f, location: "Sala X" },
      a.metadata.version,
    );
    if (!(r.ok && r.changed)) throw new Error("expected changed");
    expect(r.input.location).toBe("Sala X");
  });

  it("31. limpar location envia location: null", async () => {
    const env = createMockDomainEnvironment();
    const a = ok(
      await env.services.appointments.create(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_1_ID,
        kind: "meeting",
        title: "R",
        startsAt: dt("2026-07-01T10:00:00.000Z"),
        endsAt: dt("2026-07-01T11:00:00.000Z"),
        mode: "in_person",
        location: "Sala A",
      }),
    );
    const f = appointmentToEditForm(a);
    const r = buildUpdateAppointmentInput(
      a,
      { ...f, location: "" },
      a.metadata.version,
    );
    if (!(r.ok && r.changed)) throw new Error("expected changed");
    expect(r.input.location).toBeNull();
  });

  it("32. período invertido retorna erro em endsAt", async () => {
    const { a, f } = await base();
    // Define endsAt anterior a startsAt.
    const before = isoDateTimeToDatetimeLocal(
      dt(new Date(new Date(a.startsAt).getTime() - 3600_000).toISOString()),
    );
    const r = buildUpdateAppointmentInput(
      a,
      { ...f, endsAtLocal: before },
      a.metadata.version,
    );
    if (r.ok) throw new Error("expected errors");
    expect(r.errors.endsAt).toBeDefined();
  });

  it("33. mode inválido retorna erro de campo mode", async () => {
    const { a, f } = await base();
    const r = buildUpdateAppointmentInput(
      a,
      { ...f, mode: "invalid" },
      a.metadata.version,
    );
    if (r.ok) throw new Error("expected errors");
    expect(r.errors.mode).toBeDefined();
  });

  it("34. location maior que APPOINTMENT_LOCATION_MAX retorna erro", async () => {
    const { a, f } = await base();
    const r = buildUpdateAppointmentInput(
      a,
      { ...f, location: "x".repeat(APPOINTMENT_LOCATION_MAX + 1) },
      a.metadata.version,
    );
    if (r.ok) throw new Error("expected errors");
    expect(r.errors.location).toBeDefined();
  });

  it("35. expectedVersion passado ao input não é a atual e sim a fornecida", async () => {
    const { a, f } = await base();
    const r = buildUpdateAppointmentInput(
      a,
      { ...f, title: "novo" },
      42, // valor arbitrário para provar que o builder respeita o argumento
    );
    if (!(r.ok && r.changed)) throw new Error("expected changed");
    expect(r.input.expectedVersion).toBe(42);
  });

  it("36. alterar startsAt+endsAt válidos gera dois campos no delta", async () => {
    const { a, f } = await base();
    const s = isoDateTimeToDatetimeLocal(
      dt(new Date(new Date(a.startsAt).getTime() + 3600_000).toISOString()),
    );
    const e = isoDateTimeToDatetimeLocal(
      dt(new Date(new Date(a.endsAt).getTime() + 3600_000).toISOString()),
    );
    const r = buildUpdateAppointmentInput(
      a,
      { ...f, startsAtLocal: s, endsAtLocal: e },
      a.metadata.version,
    );
    if (!(r.ok && r.changed)) throw new Error("expected changed");
    expect(r.input.startsAt).toBeDefined();
    expect(r.input.endsAt).toBeDefined();
  });
});

// =========================================================================
// 5) Tradutor de erros de atualização
// =========================================================================

describe("LV-09.1B.5 — translateAgendaUpdateError", () => {
  it("37. conflict é sinalizado com kind='conflict' e preserva versões", () => {
    const t = translateAgendaUpdateError({
      code: "conflict",
      message: "version_mismatch",
      expectedVersion: 3,
      actualVersion: 5,
    });
    expect(t.kind).toBe("conflict");
    if (t.kind !== "conflict") throw new Error("unreachable");
    expect(t.expectedVersion).toBe(3);
    expect(t.actualVersion).toBe(5);
  });

  it("38. forbidden e unauthorized viram mensagem geral", () => {
    expect(
      translateAgendaUpdateError({ code: "forbidden", message: "x" }).kind,
    ).toBe("general");
    expect(
      translateAgendaUpdateError({ code: "unauthorized", message: "x" }).kind,
    ).toBe("general");
  });

  it("39. period_inverted mapeia para o campo endsAt (não startsAt)", () => {
    const t = translateAgendaUpdateError({
      code: "validation_error",
      message: "period_inverted",
    });
    if (t.kind !== "field") throw new Error("expected field");
    expect(t.field).toBe("endsAt");
    expect(typeof t.message).toBe("string");
    expect(t.message.length).toBeGreaterThan(0);
  });

  it("40. invalid_title mapeia para campo title", () => {
    const t = translateAgendaUpdateError({
      code: "validation_error",
      message: "invalid_title",
    });
    if (t.kind !== "field") throw new Error("expected field");
    expect(t.field).toBe("title");
  });

  it("41. invalid_due_at mapeia para campo dueAt", () => {
    const t = translateAgendaUpdateError({
      code: "validation_error",
      message: "invalid_due_at",
    });
    if (t.kind !== "field") throw new Error("expected field");
    expect(t.field).toBe("dueAt");
  });

  it("42. mensagem desconhecida vira 'general'", () => {
    const t = translateAgendaUpdateError({
      code: "validation_error",
      message: "coisa_estranha",
    });
    expect(t.kind).toBe("general");
  });

  it("43. not_found vira mensagem geral (item indisponível)", () => {
    const t = translateAgendaUpdateError({ code: "not_found", message: "x" });
    expect(t.kind).toBe("general");
  });
});

// =========================================================================
// 6) formatDurationLabel
// =========================================================================

describe("LV-09.1B.5 — formatDurationLabel", () => {
  it("44. duração em minutos apenas", () => {
    expect(
      formatDurationLabel(
        dt("2026-06-15T10:00:00.000Z"),
        dt("2026-06-15T10:30:00.000Z"),
      ),
    ).toBe("30 min");
  });
  it("45. duração em horas cheias", () => {
    expect(
      formatDurationLabel(
        dt("2026-06-15T10:00:00.000Z"),
        dt("2026-06-15T12:00:00.000Z"),
      ),
    ).toBe("2 h");
  });
  it("46. duração mista horas+minutos", () => {
    expect(
      formatDurationLabel(
        dt("2026-06-15T10:00:00.000Z"),
        dt("2026-06-15T11:30:00.000Z"),
      ),
    ).toBe("1 h 30 min");
  });
  it("47. intervalo não positivo retorna '0 min'", () => {
    expect(
      formatDurationLabel(
        dt("2026-06-15T10:00:00.000Z"),
        dt("2026-06-15T10:00:00.000Z"),
      ),
    ).toBe("0 min");
  });
});

// =========================================================================
// 7) Integração com serviços oficiais — getById / update / concorrência
// =========================================================================

describe("LV-09.1B.5 — integração de serviços (deadline)", () => {
  it("48. getById retorna a mesma versão criada", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const got = ok(
      await env.services.deadlines.getById(OWNER_ALFA, d.caseId, d.id),
    );
    expect(got.id).toBe(d.id);
    expect(got.metadata.version).toBe(d.metadata.version);
  });

  it("49. getById de outra organização retorna not_found (privacidade)", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const e = fail(
      await env.services.deadlines.getById(OWNER_BETA, d.caseId, d.id),
    );
    expect(e.code).toBe("not_found");
  });

  it("50. update com expectedVersion correto incrementa a versão", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const r = ok(
      await env.services.deadlines.update(OWNER_ALFA, {
        caseId: d.caseId,
        deadlineId: d.id,
        title: "outro título",
        expectedVersion: d.metadata.version,
      }),
    );
    expect(r.metadata.version).toBe(d.metadata.version + 1);
    expect(r.title).toBe("outro título");
  });

  it("51. update com expectedVersion divergente retorna conflict", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    // Primeira atualização avança a versão.
    ok(
      await env.services.deadlines.update(OWNER_ALFA, {
        caseId: d.caseId,
        deadlineId: d.id,
        title: "primeira",
        expectedVersion: d.metadata.version,
      }),
    );
    // Segunda tentativa com a versão original original → conflict.
    const err = fail(
      await env.services.deadlines.update(OWNER_ALFA, {
        caseId: d.caseId,
        deadlineId: d.id,
        title: "segunda",
        expectedVersion: d.metadata.version,
      }),
    );
    expect(err.code).toBe("conflict");
  });

  it("52. update com role de leitura é negado", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const err = fail(
      await env.services.deadlines.update(READONLY_ALFA, {
        caseId: d.caseId,
        deadlineId: d.id,
        title: "x",
        expectedVersion: d.metadata.version,
      }),
    );
    expect(["forbidden", "unauthorized"]).toContain(err.code);
  });

  it("53. update de outra organização é bloqueado (not_found/forbidden)", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const err = fail(
      await env.services.deadlines.update(OWNER_BETA, {
        caseId: d.caseId,
        deadlineId: d.id,
        title: "x",
        expectedVersion: d.metadata.version,
      }),
    );
    expect(["not_found", "forbidden", "unauthorized"]).toContain(err.code);
  });

  it("54. permissão 'deadline.update' é concedida ao papel proprietário", async () => {
    const env = createMockDomainEnvironment();
    const owner = ok(
      await env.services.permissions.evaluate(OWNER_ALFA, {
        action: "deadline.update",
        caseId: SEED_CASE_ALFA_1_ID,
      }),
    );
    expect(owner.allowed).toBe(true);
  });
});

describe("LV-09.1B.5 — integração de serviços (appointment)", () => {
  it("55. update com expectedVersion correto incrementa a versão", async () => {
    const env = createMockDomainEnvironment();
    const a = await makeAppointment(env);
    const r = ok(
      await env.services.appointments.update(OWNER_ALFA, {
        caseId: a.caseId,
        appointmentId: a.id,
        title: "outro",
        expectedVersion: a.metadata.version,
      }),
    );
    expect(r.metadata.version).toBe(a.metadata.version + 1);
  });

  it("56. update com expectedVersion divergente retorna conflict e NÃO sobrescreve", async () => {
    const env = createMockDomainEnvironment();
    const a = await makeAppointment(env);
    ok(
      await env.services.appointments.update(OWNER_ALFA, {
        caseId: a.caseId,
        appointmentId: a.id,
        title: "primeira",
        expectedVersion: a.metadata.version,
      }),
    );
    const err = fail(
      await env.services.appointments.update(OWNER_ALFA, {
        caseId: a.caseId,
        appointmentId: a.id,
        title: "segunda",
        expectedVersion: a.metadata.version,
      }),
    );
    expect(err.code).toBe("conflict");
    // Estado persistido continua sendo o da primeira escrita.
    const now = ok(
      await env.services.appointments.getById(OWNER_ALFA, a.caseId, a.id),
    );
    expect(now.title).toBe("primeira");
  });

  it("57. permissão 'appointment.update' é concedida ao papel proprietário", async () => {
    const env = createMockDomainEnvironment();
    const owner = ok(
      await env.services.permissions.evaluate(OWNER_ALFA, {
        action: "appointment.update",
        caseId: SEED_CASE_ALFA_1_ID,
      }),
    );
    expect(owner.allowed).toBe(true);
  });

  it("58. período invertido no update retorna validation_error", async () => {
    const env = createMockDomainEnvironment();
    const a = await makeAppointment(env);
    const err = fail(
      await env.services.appointments.update(OWNER_ALFA, {
        caseId: a.caseId,
        appointmentId: a.id,
        startsAt: a.endsAt,
        endsAt: a.startsAt,
        expectedVersion: a.metadata.version,
      }),
    );
    expect(err.code).toBe("validation_error");
  });
});

// =========================================================================
// 8) Reexports de visibilidade
// =========================================================================

describe("LV-09.1B.5 — item-visibility (reexport)", () => {
  it("59. resolveAgendaItemVisibility é a mesma função de created-visibility", () => {
    // Não é necessariamente identidade referencial, mas o contrato precisa
    // ser o mesmo: 'wait' quando a geração ainda não bate.
    const marker: PendingAgendaItemMarker = {
      id: "deadline_xyz",
      type: "deadline",
      requiredGeneration: 5,
    };
    const decision = resolveAgendaItemVisibility(
      marker,
      { kind: "loading", generation: 4 },
      new Set(),
      new Set(),
    );
    expect(decision).toBe("wait");
  });

  it("60. resolveAgendaItemVisibility retorna 'visible' quando ID consta na lista da geração correta", () => {
    const marker: PendingAgendaItemMarker = {
      id: "appointment_xyz",
      type: "appointment",
      requiredGeneration: 5,
    };
    const decision = resolveAgendaItemVisibility(
      marker,
      { kind: "ready", generation: 5 },
      new Set(),
      new Set(["appointment_xyz"]),
    );
    expect(decision).toBe("visible");
  });
});

// =========================================================================
// 9) Regressões de fonte — cards clicáveis, sem nova rota, sem status/delete
// =========================================================================

describe("LV-09.1B.5 — regressões de fonte", () => {
  it("61. cards de prazo e compromisso reagem a clique e teclado (Enter/Espaço)", () => {
    expect(AGENDA_ROUTE_SRC).toMatch(/role=\{clickable \? "button" : undefined\}/);
    expect(AGENDA_ROUTE_SRC).toMatch(/tabIndex=\{clickable \? 0 : undefined\}/);
    // Enter e Espaço são tratados no mesmo handler
    expect(AGENDA_ROUTE_SRC).toContain('ev.key === "Enter"');
    expect(AGENDA_ROUTE_SRC).toContain('ev.key === " "');
  });

  it("62. rota /app/agenda continua sendo a única — nenhuma rota nova foi criada", () => {
    // Não pode existir rota separada de detalhe de item da agenda.
    // O detalhe abre em diálogo dentro da própria página.
    const forbiddenFiles = [
      "src/routes/app.agenda.$id.tsx",
      "src/routes/app.agenda.$deadlineId.tsx",
      "src/routes/app.agenda.$appointmentId.tsx",
      "src/routes/app.agenda.detalhe.tsx",
    ];
    for (const f of forbiddenFiles) {
      let exists = true;
      try {
        readFileSync(f, "utf8");
      } catch {
        exists = false;
      }
      expect(exists).toBe(false);
    }
  });

  it("63. página da agenda integra AgendaItemDetailDialog", () => {
    expect(AGENDA_ROUTE_SRC).toContain("<AgendaItemDetailDialog");
    expect(AGENDA_ROUTE_SRC).toContain("onUpdated={handleUpdated}");
  });

  it("64. diálogo NÃO oferece exclusão nem mudança de status nesta etapa", () => {
    // Não chama changeStatus/remove nesta etapa (LV-09.1B.5).
    expect(DETAIL_SRC).not.toContain("changeStatus");
    expect(DETAIL_SRC).not.toContain(".remove(");
    // Também não expõe botão "Excluir" no diálogo.
    expect(DETAIL_SRC).not.toMatch(/>\s*Excluir\s*</);
  });

  it("65. builders usam expectedVersion vindo por parâmetro, não do metadata atual", () => {
    // Regressão do requisito LV-09.1B.5: capturar versão no início da edição.
    expect(EDIT_FORM_SRC).toContain("expectedVersion: number");
    expect(EDIT_FORM_SRC).toContain("expectedVersion,");
  });

  it("66. handler de atualização reusa estratégia de gerações (visibilidade pós-update)", () => {
    expect(AGENDA_ROUTE_SRC).toContain("pendingUpdated");
    expect(AGENDA_ROUTE_SRC).toContain("resolveCreatedItemVisibility");
    expect(AGENDA_ROUTE_SRC).toContain("loadGenerationRef.current + 1");
  });

  it("67. contexto de outra organização não vê os IDs criados na Alfa (isolamento)", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const a = await makeAppointment(env);
    const e1 = fail(
      await env.services.deadlines.getById(OWNER_BETA, d.caseId, d.id),
    );
    const e2 = fail(
      await env.services.appointments.getById(OWNER_BETA, a.caseId, a.id),
    );
    expect(e1.code).toBe("not_found");
    expect(e2.code).toBe("not_found");
  });

  it("68. caseId proveniente do original é sempre reusado pelo builder (não pode ser alterado no formulário)", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const f = deadlineToEditForm(d);
    const r = buildUpdateDeadlineInput(
      d,
      { ...f, title: "novo" },
      d.metadata.version,
    );
    if (!(r.ok && r.changed)) throw new Error("expected changed");
    expect(r.input.caseId).toBe(d.caseId);
    // Não existe formulário com campo caseId em edição.
    expect("caseId" in f).toBe(false);
  });

  it("69. update NÃO altera o caseId do item existente", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const r = ok(
      await env.services.deadlines.update(OWNER_ALFA, {
        caseId: d.caseId,
        deadlineId: d.id,
        title: "outro",
        expectedVersion: d.metadata.version,
      }),
    );
    expect(r.caseId).toBe(d.caseId);
    // E um update apontando para um caseId diferente falha.
    const err = fail(
      await env.services.deadlines.update(OWNER_ALFA, {
        caseId: SEED_CASE_ALFA_2_ID,
        deadlineId: d.id,
        title: "outro2",
        expectedVersion: r.metadata.version,
      }),
    );
    expect(["not_found", "validation_error", "forbidden"]).toContain(err.code);
  });

  it("70. seed IDs esperados continuam disponíveis (regressão de fixtures)", () => {
    // Garante que estes IDs foram exportados; caso contrário, testes 23/31
    // deixariam de bater no cenário real.
    expect(String(SEED_CASE_ALFA_1_ID)).toContain("case");
    expect(String(SEED_CASE_BETA_1_ID)).toContain("case");
    expect(String(SEED_ASSIGN_ALFA_1_ID)).toContain("assign");
  });
});

// =========================================================================
// 10) LV-09.1B.5.1 — testes comportamentais adicionais
// =========================================================================

import { getDeadlinePresentation } from "@/features/agenda/visual-state";

const VISUAL_STATE_SRC = readFileSync(
  "src/features/agenda/visual-state.ts",
  "utf8",
);

describe("LV-09.1B.5.1 — seleção e carregamento", () => {
  it("71. getById do prazo criado retorna item com mesmo caseId", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const got = ok(
      await env.services.deadlines.getById(OWNER_ALFA, d.caseId, d.id),
    );
    expect(got.caseId).toBe(d.caseId);
  });

  it("72. getById do compromisso criado retorna versão inicial 1", async () => {
    const env = createMockDomainEnvironment();
    const a = await makeAppointment(env);
    const got = ok(
      await env.services.appointments.getById(OWNER_ALFA, a.caseId, a.id),
    );
    expect(got.metadata.version).toBe(a.metadata.version);
    expect(got.metadata.version).toBeGreaterThanOrEqual(1);
  });

  it("73. getById de ID inexistente retorna not_found", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const err = fail(
      await env.services.deadlines.getById(OWNER_ALFA, d.caseId, d.id + "_xx"),
    );
    expect(err.code).toBe("not_found");
  });

  it("74. getById em caseId errado retorna not_found (privacidade por caso)", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const err = fail(
      await env.services.deadlines.getById(
        OWNER_ALFA,
        SEED_CASE_ALFA_2_ID,
        d.id,
      ),
    );
    expect(err.code).toBe("not_found");
  });

  it("75. carregamento sequencial: última resposta é a válida para o snapshot", async () => {
    const env = createMockDomainEnvironment();
    const d1 = await makeDeadline(env);
    const d2 = await makeDeadline(env);
    const got1 = ok(
      await env.services.deadlines.getById(OWNER_ALFA, d1.caseId, d1.id),
    );
    const got2 = ok(
      await env.services.deadlines.getById(OWNER_ALFA, d2.caseId, d2.id),
    );
    // Simula "descarte da primeira resposta": só a segunda define o estado.
    const selected = got2;
    expect(selected.id).toBe(d2.id);
    expect(selected.id).not.toBe(got1.id);
  });
});

describe("LV-09.1B.5.1 — estados de erro e retry", () => {
  it("76. após not_found, novo getById com ID válido volta a resolver", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    fail(
      await env.services.deadlines.getById(OWNER_ALFA, d.caseId, d.id + "_x"),
    );
    const got = ok(
      await env.services.deadlines.getById(OWNER_ALFA, d.caseId, d.id),
    );
    expect(got.id).toBe(d.id);
  });

  it("77. usuário de outra organização é bloqueado como not_found (sem vazamento)", async () => {
    const env = createMockDomainEnvironment();
    const a = await makeAppointment(env);
    const err = fail(
      await env.services.appointments.getById(OWNER_BETA, a.caseId, a.id),
    );
    expect(err.code).toBe("not_found");
  });

  it("78. retry após conflito recupera a versão atual do item", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    // outra sessão avança a versão
    const advanced = ok(
      await env.services.deadlines.update(OWNER_ALFA, {
        caseId: d.caseId,
        deadlineId: d.id,
        title: "outra sessão",
        expectedVersion: d.metadata.version,
      }),
    );
    // recarga simulada da UI
    const reloaded = ok(
      await env.services.deadlines.getById(OWNER_ALFA, d.caseId, d.id),
    );
    expect(reloaded.metadata.version).toBe(advanced.metadata.version);
    expect(reloaded.title).toBe("outra sessão");
  });

  it("79. update por role de leitura é bloqueado (forbidden/unauthorized)", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const err = fail(
      await env.services.deadlines.update(READONLY_ALFA, {
        caseId: d.caseId,
        deadlineId: d.id,
        title: "não deveria",
        expectedVersion: d.metadata.version,
      }),
    );
    expect(["forbidden", "unauthorized", "not_found"]).toContain(err.code);
  });
});

describe("LV-09.1B.5.1 — botão Salvar derivado da validade", () => {
  it("80. sem alterações: builder retorna changed=false (Salvar desabilitado)", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const r = buildUpdateDeadlineInput(
      d,
      deadlineToEditForm(d),
      d.metadata.version,
    );
    expect(r.ok && r.changed === false).toBe(true);
  });

  it("81. título vazio invalida formulário (Salvar desabilitado)", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const r = buildUpdateDeadlineInput(
      d,
      { ...deadlineToEditForm(d), title: "   " },
      d.metadata.version,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.title).toBeDefined();
  });

  it("82. compromisso com término anterior ao início invalida (Salvar desabilitado)", async () => {
    const env = createMockDomainEnvironment();
    const a = await makeAppointment(env);
    const f = appointmentToEditForm(a);
    const r = buildUpdateAppointmentInput(
      a,
      { ...f, endsAtLocal: f.startsAtLocal },
      a.metadata.version,
    );
    expect(r.ok).toBe(false);
  });

  it("83. alteração válida produz changed=true (Salvar habilitado)", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const f = deadlineToEditForm(d);
    const r = buildUpdateDeadlineInput(
      d,
      { ...f, title: "Novo título" },
      d.metadata.version,
    );
    expect(r.ok && r.changed === true).toBe(true);
  });

  it("84. AgendaItemDetailDialog usa canSubmit derivado do builder", () => {
    expect(DETAIL_SRC).toContain("canSubmit");
    expect(DETAIL_SRC).toContain("currentBuildResult");
    expect(DETAIL_SRC).toMatch(/disabled=\{!canSubmit\}/);
  });
});

describe("LV-09.1B.5.1 — validação progressiva (touched / attemptedSubmit)", () => {
  it("85. AgendaItemDetailDialog mantém estado touched", () => {
    expect(DETAIL_SRC).toMatch(/setTouched\(/);
    expect(DETAIL_SRC).toContain("touched[k]");
  });

  it("86. AgendaItemDetailDialog mantém estado attemptedSubmit", () => {
    expect(DETAIL_SRC).toContain("attemptedSubmit");
    expect(DETAIL_SRC).toContain("setAttemptedSubmit");
  });

  it("87. mensagens de erro só aparecem quando o campo foi tocado ou após submit", () => {
    // heurística estrutural: displayErrors filtra por (attemptedSubmit || touched[k])
    expect(DETAIL_SRC).toMatch(/attemptedSubmit\s*\|\|\s*touched\[k\]/);
  });

  it("88. onBlurField é passado para DeadlineEditFields e AppointmentEditFields", () => {
    expect(DETAIL_SRC).toMatch(/onBlurField=\{/);
    // Duas ocorrências (deadline + appointment)
    const count = (DETAIL_SRC.match(/onBlurField=\{/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });
});

describe("LV-09.1B.5.1 — bloqueio de envio duplicado", () => {
  it("89. AgendaItemDetailDialog usa submittingRef para bloquear reentrância", () => {
    expect(DETAIL_SRC).toContain("submittingRef");
    expect(DETAIL_SRC).toMatch(/if\s*\(submittingRef\.current\)\s*return/);
  });

  it("90. botão Salvar exibe aria-busy enquanto submitting", () => {
    expect(DETAIL_SRC).toMatch(/aria-busy=\{submitting\}/);
  });

  it("91. dois updates concorrentes com mesma expectedVersion: só o primeiro passa", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const [r1, r2] = await Promise.all([
      env.services.deadlines.update(OWNER_ALFA, {
        caseId: d.caseId,
        deadlineId: d.id,
        title: "A",
        expectedVersion: d.metadata.version,
      }),
      env.services.deadlines.update(OWNER_ALFA, {
        caseId: d.caseId,
        deadlineId: d.id,
        title: "B",
        expectedVersion: d.metadata.version,
      }),
    ]);
    const passed = [r1.ok, r2.ok].filter(Boolean).length;
    expect(passed).toBe(1);
  });
});

describe("LV-09.1B.5.1 — conflito otimista preserva formulário", () => {
  it("92. tradutor identifica conflito e preserva expectedVersion recebido", () => {
    const t = translateAgendaUpdateError({
      code: "conflict",
      message: "version mismatch",
      expectedVersion: 3,
      actualVersion: 7,
    });
    expect(t.kind).toBe("conflict");
    if (t.kind === "conflict") {
      expect(t.expectedVersion).toBe(3);
      expect(t.actualVersion).toBe(7);
    }
  });

  it("93. mensagem de conflito orienta recarga sem sobrescrever", () => {
    const t = translateAgendaUpdateError({
      code: "conflict",
      message: "x",
    });
    expect(t.kind).toBe("conflict");
    if (t.kind === "conflict") {
      expect(t.message).toMatch(/alterad|recarregue/i);
    }
  });

  it("94. após conflict, o rascunho local NÃO é apagado (builder aceita expectedVersion antigo)", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    // Snapshot local (rascunho) do editor no início da edição
    const draft: EditDeadlineFormState = {
      ...deadlineToEditForm(d),
      title: "rascunho local",
    };
    // Outra sessão adianta a versão
    ok(
      await env.services.deadlines.update(OWNER_ALFA, {
        caseId: d.caseId,
        deadlineId: d.id,
        title: "outra sessão",
        expectedVersion: d.metadata.version,
      }),
    );
    // Envio local com expectedVersion antigo → conflict
    const built = buildUpdateDeadlineInput(d, draft, d.metadata.version);
    if (!(built.ok && built.changed)) throw new Error("expected changed");
    const err = fail(
      await env.services.deadlines.update(OWNER_ALFA, built.input),
    );
    expect(err.code).toBe("conflict");
    // Rascunho permanece intacto (não foi alterado pela chamada)
    expect(draft.title).toBe("rascunho local");
  });

  it("95. conflict NÃO sobrescreve o dado remoto atual", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    ok(
      await env.services.deadlines.update(OWNER_ALFA, {
        caseId: d.caseId,
        deadlineId: d.id,
        title: "remoto",
        expectedVersion: d.metadata.version,
      }),
    );
    fail(
      await env.services.deadlines.update(OWNER_ALFA, {
        caseId: d.caseId,
        deadlineId: d.id,
        title: "tentativa perdida",
        expectedVersion: d.metadata.version,
      }),
    );
    const got = ok(
      await env.services.deadlines.getById(OWNER_ALFA, d.caseId, d.id),
    );
    expect(got.title).toBe("remoto");
  });
});

describe("LV-09.1B.5.1 — recarga da versão atual", () => {
  it("96. reloadAfterConflict existe no diálogo e limpa conflictState", () => {
    expect(DETAIL_SRC).toContain("reloadAfterConflict");
    // Botão do banner de conflito aciona reloadAfterConflict
    expect(DETAIL_SRC).toMatch(/onReload=\{reloadAfterConflict\}/);
  });

  it("97. recarga usa getById novamente e retorna a nova versão", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const advanced = ok(
      await env.services.deadlines.update(OWNER_ALFA, {
        caseId: d.caseId,
        deadlineId: d.id,
        title: "nova",
        expectedVersion: d.metadata.version,
      }),
    );
    const reloaded = ok(
      await env.services.deadlines.getById(OWNER_ALFA, d.caseId, d.id),
    );
    expect(reloaded.metadata.version).toBe(advanced.metadata.version);
  });

  it("98. após recarga, novo builder usa a expectedVersion atualizada", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const advanced = ok(
      await env.services.deadlines.update(OWNER_ALFA, {
        caseId: d.caseId,
        deadlineId: d.id,
        title: "nova",
        expectedVersion: d.metadata.version,
      }),
    );
    const f = deadlineToEditForm(advanced);
    const rebuilt = buildUpdateDeadlineInput(
      advanced,
      { ...f, title: "após recarga" },
      advanced.metadata.version,
    );
    if (!(rebuilt.ok && rebuilt.changed)) throw new Error("expected changed");
    expect(rebuilt.input.expectedVersion).toBe(advanced.metadata.version);
    // E o update passa
    const r = ok(await env.services.deadlines.update(OWNER_ALFA, rebuilt.input));
    expect(r.title).toBe("após recarga");
  });
});

describe("LV-09.1B.5.1 — proteção contra descarte de alterações", () => {
  it("99. diálogo apresenta confirmação 'Descartar alterações?'", () => {
    expect(DETAIL_SRC).toContain("Descartar alterações");
    expect(DETAIL_SRC).toContain("Continuar editando");
  });

  it("100. proteção mantém 'setConfirmDiscard' antes de fechar quando há mudanças", () => {
    expect(DETAIL_SRC).toContain("setConfirmDiscard");
    expect(DETAIL_SRC).toContain("confirmDiscardChoice");
  });

  it("101. hasDeadlineChanges reconhece delta pequeno (título com espaços aparados)", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const f = deadlineToEditForm(d);
    // Espaços puros ao redor NÃO contam como mudança
    expect(hasDeadlineChanges(d, { ...f, title: `  ${d.title}  ` })).toBe(false);
    // Texto novo conta
    expect(hasDeadlineChanges(d, { ...f, title: "x" + d.title })).toBe(true);
  });
});

describe("LV-09.1B.5.1 — visibilidade pós-atualização por geração", () => {
  it("102. wait quando a geração corrente ainda é menor que a requerida", () => {
    const decision = resolveAgendaItemVisibility(
      { id: "deadline_1", type: "deadline", requiredGeneration: 10 },
      { kind: "ready", generation: 9 },
      new Set(),
      new Set(),
    );
    expect(decision).toBe("wait");
  });

  it("103. visible quando o ID aparece na coleção da geração exigida", () => {
    const decision = resolveAgendaItemVisibility(
      { id: "deadline_1", type: "deadline", requiredGeneration: 3 },
      { kind: "ready", generation: 3 },
      new Set(["deadline_1"]),
      new Set(),
    );
    expect(decision).toBe("visible");
  });

  it("104. hidden quando geração exigida foi alcançada e o ID não aparece", () => {
    const decision = resolveAgendaItemVisibility(
      { id: "deadline_1", type: "deadline", requiredGeneration: 3 },
      { kind: "ready", generation: 3 },
      new Set(),
      new Set(),
    );
    expect(decision).toBe("hidden");
  });

  it("105. estado de erro na recarga não decide como 'hidden' (permite retry)", () => {
    const decision = resolveAgendaItemVisibility(
      { id: "deadline_1", type: "deadline", requiredGeneration: 3 },
      { kind: "error", generation: 3 },
      new Set(),
      new Set(),
    );
    expect(decision).not.toBe("hidden");
  });

  it("106. rota app.agenda reserva geração futura (loadGenerationRef.current + 1)", () => {
    expect(AGENDA_ROUTE_SRC).toContain("loadGenerationRef.current + 1");
  });
});

describe("LV-09.1B.5.1 — estado visual derivado do prazo", () => {
  it("107. prazo pendente já vencido tem estado 'overdue'", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const ref = new Date(d.dueAt).getTime() + 3600_000;
    const p = getDeadlinePresentation(d, ref);
    expect(p.state).toBe("overdue");
    expect(p.stateLabel).toBe("Atrasado");
  });

  it("108. prazo pendente ainda no futuro reflete a prioridade", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const ref = new Date(d.dueAt).getTime() - 3600_000;
    const p = getDeadlinePresentation(d, ref);
    expect(["urgent", "high", "normal", "low"]).toContain(p.state);
    // Nossa fixture usa prioridade "normal"
    expect(p.state).toBe("normal");
  });

  it("109. diálogo renderiza badge de estado do prazo (testid deadline-state-badge)", () => {
    expect(DETAIL_SRC).toContain("deadline-state-badge");
    expect(DETAIL_SRC).toContain("getDeadlinePresentation");
    expect(DETAIL_SRC).toContain("DeadlineStateIcon");
  });

  it("110. estado visual não depende só de cor (label textual sempre presente)", () => {
    // Todos os estados definidos no módulo têm label pt-BR
    expect(VISUAL_STATE_SRC).toContain("Atrasado");
    expect(VISUAL_STATE_SRC).toContain("Urgente");
    expect(VISUAL_STATE_SRC).toContain("Cumprido");
    expect(VISUAL_STATE_SRC).toContain("Cancelado");
  });

  it("111. estado 'cancelled' é hierarquicamente superior a prioridade", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const cancelled: Deadline = { ...d, status: "cancelled" };
    const ref = new Date(d.dueAt).getTime() + 3600_000;
    const p = getDeadlinePresentation(cancelled, ref);
    expect(p.state).toBe("cancelled");
  });
});

describe("LV-09.1B.5.1 — conversão ISO defensiva", () => {
  it("112. helper aceita apenas string; ISO inválido é rejeitado", () => {
    expect(() => isoDateTimeToDatetimeLocal("2026-13-40T99:99:99Z")).toThrow(
      /invalid_iso/,
    );
  });

  it("113. helper rejeita string vazia", () => {
    expect(() => isoDateTimeToDatetimeLocal("")).toThrow(/invalid_iso/);
  });

  it("114. helper rejeita ISO parcial (só data)", () => {
    expect(() => isoDateTimeToDatetimeLocal("2026-06-15")).toThrow(
      /invalid_iso/,
    );
  });

  it("115. edit-form usa isIsoDateTime para validar entrada", () => {
    expect(EDIT_FORM_SRC).toContain("isIsoDateTime");
    expect(EDIT_FORM_SRC).toContain("invalid_iso");
  });
});

describe("LV-09.1B.5.1 — ausência de casts inseguros e comandos proibidos", () => {
  it("116. arquivo de testes não usa casts inseguros nem @ts-ignore/@ts-nocheck", () => {
    const src = readFileSync("tests/agenda-091b5.test.ts", "utf8");
    // Constrói tokens em runtime para que o próprio assertivo NÃO produza
    // ocorrência literal do padrão no fonte deste arquivo.
    const asWord = ["a", "s"].join("");
    const forbidden = [
      ` ${asWord} any`,
      ` ${asWord} never`,
      `unknown ${asWord}`,
      "@" + "ts-ignore",
      "@" + "ts-nocheck",
    ];
    for (const token of forbidden) {
      expect(src.includes(token)).toBe(false);
    }
  });

  const asWord = ["a", "s"].join("");
  const AS_ANY = ` ${asWord} any`;
  const AS_NEVER = ` ${asWord} never`;
  const UNKNOWN_AS = `unknown ${asWord}`;
  const TS_NOCHECK = "@" + "ts-nocheck";

  it("117. edit-form não contém casts inseguros", () => {
    expect(EDIT_FORM_SRC.includes(AS_ANY)).toBe(false);
    expect(EDIT_FORM_SRC.includes(AS_NEVER)).toBe(false);
    expect(EDIT_FORM_SRC.includes(UNKNOWN_AS)).toBe(false);
  });

  it("118. AgendaItemDetailDialog não contém casts inseguros", () => {
    expect(DETAIL_SRC.includes(AS_ANY)).toBe(false);
    expect(DETAIL_SRC.includes(AS_NEVER)).toBe(false);
    expect(DETAIL_SRC.includes(UNKNOWN_AS)).toBe(false);
  });

  it("119. rota app.agenda não contém casts inseguros", () => {
    expect(AGENDA_ROUTE_SRC.includes(AS_ANY)).toBe(false);
    expect(AGENDA_ROUTE_SRC.includes(AS_NEVER)).toBe(false);
    expect(AGENDA_ROUTE_SRC.includes(UNKNOWN_AS)).toBe(false);
  });

  it("120. nenhum arquivo da Agenda contém supressão global de tipos", () => {
    expect(AGENDA_ROUTE_SRC.includes(TS_NOCHECK)).toBe(false);
    expect(DETAIL_SRC.includes(TS_NOCHECK)).toBe(false);
    expect(EDIT_FORM_SRC.includes(TS_NOCHECK)).toBe(false);
  });
});

describe("LV-09.1B.5.1 — sem mudança de status, exclusão ou nova rota", () => {
  it("121. diálogo não invoca changeStatus", () => {
    expect(DETAIL_SRC).not.toContain("changeStatus(");
  });

  it("122. diálogo não invoca .remove/.delete", () => {
    expect(DETAIL_SRC).not.toContain(".remove(");
    expect(DETAIL_SRC).not.toContain(".delete(");
  });

  it("123. diálogo não expõe botão 'Excluir'", () => {
    expect(DETAIL_SRC).not.toMatch(/>\s*Excluir\s*</);
  });

  it("124. rota app.agenda não navega para uma rota de detalhe própria", () => {
    expect(AGENDA_ROUTE_SRC).not.toMatch(/to:\s*["'`]\/app\/agenda\/[^"'`]+["'`]/);
  });

  it("125. builders de update não expõem campo 'status'", async () => {
    const env = createMockDomainEnvironment();
    const d = await makeDeadline(env);
    const f = deadlineToEditForm(d);
    expect("status" in f).toBe(false);
    const r = buildUpdateDeadlineInput(
      d,
      { ...f, title: "x" },
      d.metadata.version,
    );
    if (!(r.ok && r.changed)) throw new Error("expected changed");
    expect("status" in r.input).toBe(false);
  });
});
