/**
 * LV-09.1B.2 — Cards semânticos de prazos e compromissos.
 *
 * Testes puros dos helpers visuais e regressão da tela oficial.
 */

import { describe, it, expect } from "bun:test";
import { createMockDomainEnvironment } from "@/domain/mocks";
import {
  SEED_ORG_ALFA_ID,
  SEED_USER_1_ID,
  SEED_MEM_ALFA_OWNER_ID,
  SEED_CASE_ALFA_1_ID,
} from "@/domain/mocks/seed";
import type { ServiceContext } from "@/domain/services/context";
import type { IsoDateTime } from "@/domain/core/common";
import type { Deadline, DeadlinePriority } from "@/domain/core/agenda";
import type {
  CreateDeadlineInput,
  CreateAppointmentInput,
} from "@/domain/services/inputs";
import {
  getAppointmentPresentation,
  getAppointmentVisualState,
  getDeadlinePresentation,
  getDeadlineVisualState,
  isDeadlineOverdue,
} from "@/features/agenda/visual-state";

const OWNER: ServiceContext = Object.freeze({
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_1_ID,
  membershipId: SEED_MEM_ALFA_OWNER_ID,
  role: "proprietario",
});

const dt = (s: string): IsoDateTime => s as IsoDateTime;

// Instante fixo de referência para todos os testes.
const REF = Date.parse("2026-06-15T12:00:00Z");

function ok<T>(
  r: { ok: true; data: T } | { ok: false; error: { code: string; message: string } },
): T {
  if (!r.ok) throw new Error(`expected ok: ${r.error.code}`);
  return r.data;
}

async function makeDeadline(
  overrides: Partial<CreateDeadlineInput> & { dueAt: IsoDateTime },
  opts: { status?: "completed" | "cancelled" } = {},
): Promise<Deadline> {
  const env = createMockDomainEnvironment();
  const input: CreateDeadlineInput = {
    caseId: SEED_CASE_ALFA_1_ID,
    kind: "administrative",
    title: "Prazo",
    priority: "normal",
    ...overrides,
  };
  const created = ok(await env.services.deadlines.create(OWNER, input));
  if (opts.status) {
    return ok(
      await env.services.deadlines.changeStatus(OWNER, {
        caseId: SEED_CASE_ALFA_1_ID,
        deadlineId: created.id,
        status: opts.status,
        expectedVersion: created.metadata.version,
      }),
    );
  }
  return created;
}

// ============================================================================
// (A) Estado visual de prazo — hierarquia
// ============================================================================

describe("LV-09.1B.2 · getDeadlineVisualState", () => {
  it("pendente prioridade baixa → low", async () => {
    const d = await makeDeadline({
      dueAt: dt("2027-01-10T09:00:00Z"),
      priority: "low",
    });
    expect(getDeadlineVisualState(d, REF)).toBe("low");
  });

  it("pendente prioridade normal → normal", async () => {
    const d = await makeDeadline({
      dueAt: dt("2027-01-10T09:00:00Z"),
      priority: "normal",
    });
    expect(getDeadlineVisualState(d, REF)).toBe("normal");
  });

  it("pendente prioridade alta → high", async () => {
    const d = await makeDeadline({
      dueAt: dt("2027-01-10T09:00:00Z"),
      priority: "high",
    });
    expect(getDeadlineVisualState(d, REF)).toBe("high");
  });

  it("pendente prioridade urgente → urgent", async () => {
    const d = await makeDeadline({
      dueAt: dt("2027-01-10T09:00:00Z"),
      priority: "urgent",
    });
    expect(getDeadlineVisualState(d, REF)).toBe("urgent");
  });

  it("pendente vencido normal → overdue", async () => {
    const d = await makeDeadline({
      dueAt: dt("2025-01-01T09:00:00Z"),
      priority: "normal",
    });
    expect(getDeadlineVisualState(d, REF)).toBe("overdue");
  });

  it("pendente urgente vencido → overdue (atraso vence urgência)", async () => {
    const d = await makeDeadline({
      dueAt: dt("2025-01-01T09:00:00Z"),
      priority: "urgent",
    });
    expect(getDeadlineVisualState(d, REF)).toBe("overdue");
  });

  it("concluído mesmo vencido não é atrasado", async () => {
    const d = await makeDeadline(
      { dueAt: dt("2025-01-01T09:00:00Z"), priority: "urgent" },
      { status: "completed" },
    );
    expect(getDeadlineVisualState(d, REF)).toBe("completed");
    expect(isDeadlineOverdue(d, REF)).toBe(false);
  });

  it("cancelado mesmo vencido não é atrasado", async () => {
    const d = await makeDeadline(
      { dueAt: dt("2025-01-01T09:00:00Z"), priority: "urgent" },
      { status: "cancelled" },
    );
    expect(getDeadlineVisualState(d, REF)).toBe("cancelled");
    expect(isDeadlineOverdue(d, REF)).toBe(false);
  });

  it("dueAt exatamente igual ao referenceEpoch NÃO é atrasado", async () => {
    const iso = "2026-06-15T12:00:00Z";
    const d = await makeDeadline({ dueAt: dt(iso), priority: "normal" });
    expect(Date.parse(iso)).toBe(REF);
    expect(isDeadlineOverdue(d, REF)).toBe(false);
    expect(getDeadlineVisualState(d, REF)).toBe("normal");
  });

  it("atraso funciona com offsets misturados (Z vs -03:00)", async () => {
    // 09:00 em -03:00 == 12:00Z. Ref = 12:00Z. Igualdade → NÃO atrasado.
    const equal = await makeDeadline({
      dueAt: dt("2026-06-15T09:00:00-03:00"),
      priority: "normal",
    });
    expect(isDeadlineOverdue(equal, REF)).toBe(false);
    // 08:59 em -03:00 == 11:59Z < ref → atrasado.
    const before = await makeDeadline({
      dueAt: dt("2026-06-15T08:59:00-03:00"),
      priority: "normal",
    });
    expect(isDeadlineOverdue(before, REF)).toBe(true);
  });
});

// ============================================================================
// (B) Apresentação de prazo — rótulos e classes
// ============================================================================

describe("LV-09.1B.2 · getDeadlinePresentation", () => {
  const cases: Array<{ p: DeadlinePriority; label: string }> = [
    { p: "low", label: "Baixa" },
    { p: "normal", label: "Normal" },
    { p: "high", label: "Alta" },
    { p: "urgent", label: "Urgente" },
  ];
  for (const c of cases) {
    it(`rótulo pt-BR para prioridade ${c.p}`, async () => {
      const d = await makeDeadline({
        dueAt: dt("2027-01-10T09:00:00Z"),
        priority: c.p,
      });
      const p = getDeadlinePresentation(d, REF);
      expect(p.stateLabel).toBe(c.label);
      expect(p.containerClass.length).toBeGreaterThan(0);
      expect(p.accentClass.length).toBeGreaterThan(0);
      expect(p.stateBadgeClass.length).toBeGreaterThan(0);
    });
  }
  it("atrasado usa rótulo 'Atrasado'", async () => {
    const d = await makeDeadline({
      dueAt: dt("2025-01-01T09:00:00Z"),
      priority: "normal",
    });
    expect(getDeadlinePresentation(d, REF).stateLabel).toBe("Atrasado");
  });
  it("cancelado usa rótulo 'Cancelado'", async () => {
    const d = await makeDeadline(
      { dueAt: dt("2027-01-10T09:00:00Z"), priority: "normal" },
      { status: "cancelled" },
    );
    expect(getDeadlinePresentation(d, REF).stateLabel).toBe("Cancelado");
  });
  it("concluído usa rótulo 'Cumprido'", async () => {
    const d = await makeDeadline(
      { dueAt: dt("2027-01-10T09:00:00Z"), priority: "normal" },
      { status: "completed" },
    );
    expect(getDeadlinePresentation(d, REF).stateLabel).toBe("Cumprido");
  });
});

// ============================================================================
// (C) Estado visual de compromisso
// ============================================================================

async function makeAppointment(
  overrides: Partial<CreateAppointmentInput> & {
    startsAt: IsoDateTime;
    endsAt: IsoDateTime;
  },
  opts: { status?: "completed" | "cancelled" } = {},
) {
  const env = createMockDomainEnvironment();
  const input: CreateAppointmentInput = {
    caseId: SEED_CASE_ALFA_1_ID,
    kind: "meeting",
    title: "Reunião",
    mode: "in_person",
    ...overrides,
  };
  const created = ok(await env.services.appointments.create(OWNER, input));
  if (opts.status) {
    return ok(
      await env.services.appointments.changeStatus(OWNER, {
        caseId: SEED_CASE_ALFA_1_ID,
        appointmentId: created.id,
        status: opts.status,
        expectedVersion: created.metadata.version,
      }),
    );
  }
  return created;
}

describe("LV-09.1B.2 · Compromisso — estado visual", () => {
  it("agendado", async () => {
    const a = await makeAppointment({
      startsAt: dt("2027-01-10T09:00:00Z"),
      endsAt: dt("2027-01-10T10:00:00Z"),
    });
    expect(getAppointmentVisualState(a)).toBe("scheduled");
    expect(getAppointmentPresentation(a).stateLabel).toBe("Agendado");
  });
  it("realizado", async () => {
    const a = await makeAppointment(
      {
        startsAt: dt("2027-01-10T09:00:00Z"),
        endsAt: dt("2027-01-10T10:00:00Z"),
      },
      { status: "completed" },
    );
    expect(getAppointmentVisualState(a)).toBe("completed");
    expect(getAppointmentPresentation(a).stateLabel).toBe("Realizado");
  });
  it("cancelado", async () => {
    const a = await makeAppointment(
      {
        startsAt: dt("2027-01-10T09:00:00Z"),
        endsAt: dt("2027-01-10T10:00:00Z"),
      },
      { status: "cancelled" },
    );
    expect(getAppointmentVisualState(a)).toBe("cancelled");
    expect(getAppointmentPresentation(a).stateLabel).toBe("Cancelado");
  });

  it("modalidades aceitas (presencial/remoto/híbrido)", async () => {
    for (const mode of ["in_person", "remote", "hybrid"] as const) {
      const a = await makeAppointment({
        mode,
        startsAt: dt("2027-01-10T09:00:00Z"),
        endsAt: dt("2027-01-10T10:00:00Z"),
      });
      expect(a.mode).toBe(mode);
    }
  });

  it("compromisso sem localização não expõe conteúdo vazio", async () => {
    const a = await makeAppointment({
      startsAt: dt("2027-01-10T09:00:00Z"),
      endsAt: dt("2027-01-10T10:00:00Z"),
    });
    expect(a.location).toBeUndefined();
  });
});

// ============================================================================
// (D) Regressão da tela — via serviços (contratos oficiais preservados)
// ============================================================================

describe("LV-09.1B.2 · Regressão — serviços continuam operando", () => {
  it("list de prazos retorna paginado", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(
      await env.services.deadlines.list(OWNER, { page: { limit: 100 } }),
    );
    expect(Array.isArray(r.items)).toBe(true);
  });

  it("list de compromissos retorna paginado", async () => {
    const env = createMockDomainEnvironment();
    const r = ok(
      await env.services.appointments.list(OWNER, { page: { limit: 100 } }),
    );
    expect(Array.isArray(r.items)).toBe(true);
  });

  it("mudança de status preserva concorrência otimista", async () => {
    const env = createMockDomainEnvironment();
    const created = ok(
      await env.services.deadlines.create(OWNER, {
        caseId: SEED_CASE_ALFA_1_ID,
        kind: "administrative",
        title: "Prazo",
        dueAt: dt("2027-01-10T09:00:00Z"),
        priority: "normal",
      }),
    );
    const bad = await env.services.deadlines.changeStatus(OWNER, {
      caseId: SEED_CASE_ALFA_1_ID,
      deadlineId: created.id,
      status: "completed",
      expectedVersion: 999,
    });
    expect(bad.ok).toBe(false);
  });
});
