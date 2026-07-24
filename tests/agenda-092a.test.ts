/**
 * LV-09.2A — Fundação lógica das Comunicações da Agenda.
 *
 * Cobertura: catálogos, guards de tipo, coerência semântica, entidade
 * `Communication`, permissões, seed determinístico e serviço mock
 * (create/getById/listByAppointment) — puro TypeScript, sem UI.
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
} from "@/domain/mocks/seed";
import type { ServiceContext } from "@/domain/services/context";
import { PERMISSION_ACTIONS } from "@/domain/services/permissions";
import type { CreateCommunicationInput } from "@/domain/services/inputs";
import {
  COMMUNICATION_KINDS,
  COMMUNICATION_CHANNELS,
  COMMUNICATION_OUTCOMES,
  COMMUNICATION_DIRECTIONS,
  COMMUNICATION_SUBJECT_MAX,
  COMMUNICATION_NOTE_MAX,
  COMMUNICATION_RECIPIENT_MAX,
  isCommunication,
  isCommunicationKind,
  isCommunicationChannel,
  isCommunicationOutcome,
  isCommunicationDirection,
  isCoherentCommunication,
} from "@/domain/core/communication";
import {
  buildDomainId,
  createAppointmentId,
  createCommunicationId,
  isCommunicationId,
} from "@/domain/core/ids";
import type { IsoDateTime } from "@/domain/core/common";

const OWNER_ALFA: ServiceContext = {
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_1_ID,
  membershipId: SEED_MEM_ALFA_OWNER_ID,
  role: "proprietario",
};
const OWNER_BETA: ServiceContext = {
  organizationId: SEED_ORG_BETA_ID,
  userId: SEED_USER_2_ID,
  membershipId: SEED_MEM_BETA_OWNER_ID,
  role: "proprietario",
};
const AP_A2_2 = buildDomainId("appointment", "seed_alfa2_meet_remote");
const AP_A2_1 = buildDomainId("appointment", "seed_alfa2_hearing");
const AP_A1_1 = buildDomainId("appointment", "seed_alfa1_meet");

function baseInput(
  overrides: Partial<CreateCommunicationInput> = {},
): CreateCommunicationInput {
  return {
    caseId: SEED_CASE_ALFA_2_ID,
    appointmentId: AP_A2_2,
    kind: "note",
    channel: "system",
    outcome: "informed",
    direction: "internal",
    occurredAt: "2026-02-01T10:00:00.000Z" as IsoDateTime,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// (A) Catálogos e guards de tipo
// ---------------------------------------------------------------------------

describe("LV-09.2A · catálogos", () => {
  it("(1) tem 4 tipos", () => expect(COMMUNICATION_KINDS.length).toBe(4));
  it("(2) tem 6 canais", () => expect(COMMUNICATION_CHANNELS.length).toBe(6));
  it("(3) tem 6 desfechos", () => expect(COMMUNICATION_OUTCOMES.length).toBe(6));
  it("(4) tem 3 direções", () => expect(COMMUNICATION_DIRECTIONS.length).toBe(3));

  it("(5) kinds únicos", () =>
    expect(new Set(COMMUNICATION_KINDS).size).toBe(COMMUNICATION_KINDS.length));
  it("(6) channels únicos", () =>
    expect(new Set(COMMUNICATION_CHANNELS).size).toBe(
      COMMUNICATION_CHANNELS.length,
    ));
  it("(7) outcomes únicos", () =>
    expect(new Set(COMMUNICATION_OUTCOMES).size).toBe(
      COMMUNICATION_OUTCOMES.length,
    ));
  it("(8) directions únicos", () =>
    expect(new Set(COMMUNICATION_DIRECTIONS).size).toBe(
      COMMUNICATION_DIRECTIONS.length,
    ));

  it("(9) limits são positivos", () => {
    expect(COMMUNICATION_SUBJECT_MAX).toBeGreaterThan(0);
    expect(COMMUNICATION_NOTE_MAX).toBeGreaterThan(0);
    expect(COMMUNICATION_RECIPIENT_MAX).toBeGreaterThan(0);
  });

  it("(10) isCommunicationKind aceita catálogo e rejeita fora", () => {
    for (const k of COMMUNICATION_KINDS) expect(isCommunicationKind(k)).toBe(true);
    expect(isCommunicationKind("other")).toBe(false);
    expect(isCommunicationKind(null)).toBe(false);
    expect(isCommunicationKind(1)).toBe(false);
  });
  it("(11) isCommunicationChannel valida catálogo", () => {
    for (const c of COMMUNICATION_CHANNELS)
      expect(isCommunicationChannel(c)).toBe(true);
    expect(isCommunicationChannel("smoke")).toBe(false);
  });
  it("(12) isCommunicationOutcome valida catálogo", () => {
    for (const o of COMMUNICATION_OUTCOMES)
      expect(isCommunicationOutcome(o)).toBe(true);
    expect(isCommunicationOutcome("")).toBe(false);
  });
  it("(13) isCommunicationDirection valida catálogo", () => {
    for (const d of COMMUNICATION_DIRECTIONS)
      expect(isCommunicationDirection(d)).toBe(true);
    expect(isCommunicationDirection("both")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// (B) IDs
// ---------------------------------------------------------------------------

describe("LV-09.2A · IDs", () => {
  it("(14) createCommunicationId gera prefixo canônico", () => {
    const id = createCommunicationId("abc123");
    expect(id.startsWith("comm_")).toBe(true);
    expect(isCommunicationId(id)).toBe(true);
  });
  it("(15) isCommunicationId rejeita outros prefixos", () => {
    expect(isCommunicationId(AP_A2_2)).toBe(false);
    expect(isCommunicationId("comm_")).toBe(false);
    expect(isCommunicationId("comm_ok")).toBe(true);
  });
  it("(16) createCommunicationId rejeita sufixos inválidos", () => {
    expect(() => createCommunicationId("")).toThrow();
    expect(() => createCommunicationId("has space")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// (C) Coerência semântica
// ---------------------------------------------------------------------------

describe("LV-09.2A · coerência kind × direction × outcome", () => {
  it("(17) confirmation_request exige outbound + pending/no_response", () => {
    expect(isCoherentCommunication("confirmation_request", "outbound", "pending")).toBe(true);
    expect(isCoherentCommunication("confirmation_request", "outbound", "no_response")).toBe(true);
    expect(isCoherentCommunication("confirmation_request", "outbound", "confirmed")).toBe(false);
    expect(isCoherentCommunication("confirmation_request", "inbound", "pending")).toBe(false);
  });
  it("(18) confirmation_response exige inbound + confirmed/declined/rescheduled", () => {
    expect(isCoherentCommunication("confirmation_response", "inbound", "confirmed")).toBe(true);
    expect(isCoherentCommunication("confirmation_response", "inbound", "declined")).toBe(true);
    expect(isCoherentCommunication("confirmation_response", "inbound", "rescheduled")).toBe(true);
    expect(isCoherentCommunication("confirmation_response", "inbound", "pending")).toBe(false);
    expect(isCoherentCommunication("confirmation_response", "outbound", "confirmed")).toBe(false);
  });
  it("(19) absence: inbound/internal + informed/rescheduled", () => {
    expect(isCoherentCommunication("absence", "inbound", "informed")).toBe(true);
    expect(isCoherentCommunication("absence", "internal", "informed")).toBe(true);
    expect(isCoherentCommunication("absence", "inbound", "rescheduled")).toBe(true);
    expect(isCoherentCommunication("absence", "outbound", "informed")).toBe(false);
    expect(isCoherentCommunication("absence", "inbound", "confirmed")).toBe(false);
  });
  it("(20) note aceita qualquer combinação de direção/desfecho válida", () => {
    for (const d of COMMUNICATION_DIRECTIONS)
      for (const o of COMMUNICATION_OUTCOMES)
        expect(isCoherentCommunication("note", d, o)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// (D) Guard de entidade Communication
// ---------------------------------------------------------------------------

describe("LV-09.2A · isCommunication (guard)", () => {
  const env = createMockDomainEnvironment();
  const s = env.snapshot().communications;
  it("(21) seed contém 3 comunicações válidas", () => {
    expect(s.length).toBe(3);
    for (const c of s) expect(isCommunication(c)).toBe(true);
  });
  it("(22) rejeita objeto vazio", () => expect(isCommunication({})).toBe(false));
  it("(23) rejeita null e array", () => {
    expect(isCommunication(null)).toBe(false);
    expect(isCommunication([])).toBe(false);
  });
  it("(24) rejeita chave desconhecida", () => {
    const c = { ...s[0], extra: 1 } as unknown;
    expect(isCommunication(c)).toBe(false);
  });
  it("(25) rejeita kind fora do catálogo", () => {
    const c = { ...s[0], kind: "smoke" } as unknown;
    expect(isCommunication(c)).toBe(false);
  });
  it("(26) rejeita metadata.version != 1 (append-only)", () => {
    const c = { ...s[0], metadata: { ...s[0].metadata, version: 2 } } as unknown;
    expect(isCommunication(c)).toBe(false);
  });
  it("(27) rejeita updatedAt != createdAt", () => {
    const c = {
      ...s[0],
      metadata: {
        ...s[0].metadata,
        updatedAt: "2027-01-01T00:00:00.000Z" as IsoDateTime,
      },
    } as unknown;
    expect(isCommunication(c)).toBe(false);
  });
  it("(28) rejeita incoerência kind/direction/outcome", () => {
    const c = {
      ...s[0],
      kind: "confirmation_request",
      direction: "inbound",
      outcome: "pending",
    } as unknown;
    expect(isCommunication(c)).toBe(false);
  });
  it("(29) rejeita subject vazio (trim)", () => {
    const c = { ...s[0], subject: "   " } as unknown;
    expect(isCommunication(c)).toBe(false);
  });
  it("(30) rejeita subject acima do limite", () => {
    const c = { ...s[0], subject: "a".repeat(COMMUNICATION_SUBJECT_MAX + 1) } as unknown;
    expect(isCommunication(c)).toBe(false);
  });
  it("(31) rejeita note acima do limite", () => {
    const c = { ...s[0], note: "a".repeat(COMMUNICATION_NOTE_MAX + 1) } as unknown;
    expect(isCommunication(c)).toBe(false);
  });
  it("(32) rejeita occurredAt inválido", () => {
    const c = { ...s[0], occurredAt: "not-a-date" } as unknown;
    expect(isCommunication(c)).toBe(false);
  });
  it("(33) rejeita id de outro prefixo", () => {
    const c = { ...s[0], id: AP_A2_2 } as unknown;
    expect(isCommunication(c)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// (E) Permissões
// ---------------------------------------------------------------------------

describe("LV-09.2A · permissões", () => {
  it("(34) catálogo inclui as 3 novas ações", () => {
    expect(PERMISSION_ACTIONS.includes("communication.read")).toBe(true);
    expect(PERMISSION_ACTIONS.includes("communication.list")).toBe(true);
    expect(PERMISSION_ACTIONS.includes("communication.create")).toBe(true);
  });

  it("(35) total do catálogo passa a ser 69", () => {
    expect(PERMISSION_ACTIONS.length).toBe(69);
  });

  it("(36) papéis leitores autorizados para read/list", async () => {
    const env = createMockDomainEnvironment();
    const r1 = await env.services.permissions.evaluate(OWNER_ALFA, {
      action: "communication.read",
      caseId: SEED_CASE_ALFA_2_ID,
    });
    expect(r1.ok && r1.data.granted).toBe(true);
    const r2 = await env.services.permissions.evaluate(OWNER_ALFA, {
      action: "communication.list",
      caseId: SEED_CASE_ALFA_2_ID,
    });
    expect(r2.ok && r2.data.granted).toBe(true);
  });

  it("(37) proprietário pode criar", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.permissions.evaluate(OWNER_ALFA, {
      action: "communication.create",
      caseId: SEED_CASE_ALFA_2_ID,
    });
    expect(r.ok && r.data.granted).toBe(true);
  });

  it("(38) caseId de outra organização bloqueia (case_access)", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.permissions.evaluate(OWNER_ALFA, {
      action: "communication.create",
      caseId: SEED_CASE_BETA_1_ID,
    });
    expect(r.ok && r.data.granted).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// (F) Serviço mock — listByAppointment (seed)
// ---------------------------------------------------------------------------

describe("LV-09.2A · listByAppointment", () => {
  it("(39) lista as 3 do seed em AP_A2_2 ordenadas por occurredAt", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.data.items.length).toBe(3);
    const times = r.data.items.map((c) => c.occurredAt);
    for (let i = 1; i < times.length; i++)
      expect(times[i - 1] <= times[i]).toBe(true);
  });

  it("(40) filtra por kind", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
      { kinds: ["note"] },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.data.items.length).toBe(1);
    expect(r.data.items[0].kind).toBe("note");
  });

  it("(41) filtra por direction", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
      { directions: ["outbound"] },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.data.items.length).toBe(1);
    expect(r.data.items[0].direction).toBe("outbound");
  });

  it("(42) filtra por outcome", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
      { outcomes: ["confirmed"] },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.data.items.length).toBe(1);
  });

  it("(43) filtra por channel", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
      { channels: ["system"] },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.data.items.length).toBe(1);
    expect(r.data.items[0].channel).toBe("system");
  });

  it("(44) lista vazia para AP_A2_1 (sem seed)", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_1,
    );
    expect(r.ok && r.data.items.length === 0).toBe(true);
  });

  it("(45) appointment inexistente → not_found", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      createAppointmentId("nao_existe"),
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error.code).toBe("not_found");
  });

  it("(46) case de outra organização é not_found (isolamento)", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_BETA_1_ID,
      AP_A2_2,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error.code).toBe("not_found");
  });

  it("(47) contexto de outra organização não vê AP_A2_2", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.listByAppointment(
      OWNER_BETA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
    );
    expect(r.ok).toBe(false);
  });

  it("(48) options com chave desconhecida é validation_error", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
      { foo: 1 } as never,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error.code).toBe("validation_error");
  });

  it("(49) kinds inválidos rejeitados", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
      { kinds: ["bogus"] as never },
    );
    expect(r.ok).toBe(false);
  });

  it("(50) paginação com limit=2 emite cursor", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
      { page: { limit: 2 } },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.data.items.length).toBe(2);
    expect(typeof r.data.nextCursor).toBe("string");
  });

  it("(51) retorno é deep clone (mutação externa não afeta o store)", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
    );
    if (!r.ok) throw new Error("unreachable");
    (r.data.items as unknown as Array<{ kind: string }>)[0].kind = "note";
    const r2 = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
    );
    if (!r2.ok) throw new Error("unreachable");
    expect(r2.data.items[0].kind).toBe("confirmation_request");
  });
});

// ---------------------------------------------------------------------------
// (G) Serviço mock — getById
// ---------------------------------------------------------------------------

describe("LV-09.2A · getById", () => {
  it("(52) devolve entidade seed válida", async () => {
    const env = createMockDomainEnvironment();
    const list = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
    );
    if (!list.ok) throw new Error("unreachable");
    const first = list.data.items[0];
    const r = await env.services.communications.getById(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
      first.id,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.data.id).toBe(first.id);
    expect(isCommunication(r.data)).toBe(true);
  });
  it("(53) id inexistente → not_found", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.getById(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
      createCommunicationId("nao_existe"),
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error.code).toBe("not_found");
  });
  it("(54) id de outro prefixo → validation_error", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.getById(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
      AP_A2_2 as never,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error.code).toBe("validation_error");
  });
  it("(55) caseId errado → not_found", async () => {
    const env = createMockDomainEnvironment();
    const list = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
    );
    if (!list.ok) throw new Error("unreachable");
    const r = await env.services.communications.getById(
      OWNER_ALFA,
      SEED_CASE_ALFA_1_ID,
      AP_A2_2,
      list.data.items[0].id,
    );
    expect(r.ok).toBe(false);
  });
  it("(56) contexto de outra organização → not_found", async () => {
    const env = createMockDomainEnvironment();
    const list = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
    );
    if (!list.ok) throw new Error("unreachable");
    const r = await env.services.communications.getById(
      OWNER_BETA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
      list.data.items[0].id,
    );
    expect(r.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// (H) Serviço mock — create
// ---------------------------------------------------------------------------

describe("LV-09.2A · create", () => {
  it("(57) cria nota válida e devolve entidade completa", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, baseInput());
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(isCommunication(r.data)).toBe(true);
    expect(r.data.authorMembershipId).toBe(SEED_MEM_ALFA_OWNER_ID);
    expect(r.data.organizationId).toBe(SEED_ORG_ALFA_ID);
    expect(r.data.metadata.version).toBe(1);
    expect(r.data.metadata.createdAt).toBe(r.data.metadata.updatedAt);
  });

  it("(58) append-only: incrementa lista", async () => {
    const env = createMockDomainEnvironment();
    await env.services.communications.create(OWNER_ALFA, baseInput());
    const r = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
    );
    if (!r.ok) throw new Error("unreachable");
    expect(r.data.items.length).toBe(4);
  });

  it("(59) rejeita kind inválido", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      kind: "smoke" as never,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error.code).toBe("validation_error");
  });
  it("(60) rejeita incoerência (confirmation_request + inbound)", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      kind: "confirmation_request",
      direction: "inbound",
      outcome: "pending",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error.code).toBe("validation_error");
  });
  it("(61) rejeita channel inválido", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      channel: "carrier_pigeon" as never,
    });
    expect(r.ok).toBe(false);
  });
  it("(62) rejeita occurredAt inválido", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      occurredAt: "not-a-date" as IsoDateTime,
    });
    expect(r.ok).toBe(false);
  });
  it("(63) rejeita subject acima do limite", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      subject: "x".repeat(COMMUNICATION_SUBJECT_MAX + 1),
    });
    expect(r.ok).toBe(false);
  });
  it("(64) rejeita note acima do limite", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      note: "x".repeat(COMMUNICATION_NOTE_MAX + 1),
    });
    expect(r.ok).toBe(false);
  });
  it("(65) rejeita recipientLabel acima do limite", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      recipientLabel: "x".repeat(COMMUNICATION_RECIPIENT_MAX + 1),
    });
    expect(r.ok).toBe(false);
  });
  it("(66) rejeita subject somente com espaços", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      subject: "    ",
    });
    expect(r.ok).toBe(false);
  });
  it("(67) rejeita chave desconhecida (envelope)", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(
      OWNER_ALFA,
      { ...baseInput(), foo: 1 } as never,
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error.code).toBe("validation_error");
  });
  it("(68) rejeita caseId de outra organização (not_found)", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      caseId: SEED_CASE_BETA_1_ID,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error.code === "not_found" || r.error.code === "forbidden").toBe(true);
  });
  it("(69) rejeita appointment que não pertence ao case informado", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      caseId: SEED_CASE_ALFA_1_ID,
      appointmentId: AP_A2_2,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error.code).toBe("not_found");
  });
  it("(70) rejeita appointment inexistente", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      appointmentId: createAppointmentId("nao_existe"),
    });
    expect(r.ok).toBe(false);
  });
  it("(71) rejeita contexto de outra organização", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_BETA, baseInput());
    expect(r.ok).toBe(false);
  });
  it("(72) IDs são únicos entre chamadas sucessivas", async () => {
    const env = createMockDomainEnvironment();
    const a = await env.services.communications.create(OWNER_ALFA, baseInput());
    const b = await env.services.communications.create(OWNER_ALFA, baseInput());
    if (!a.ok || !b.ok) throw new Error("unreachable");
    expect(a.data.id).not.toBe(b.data.id);
  });
  it("(73) createdAt monotônico entre chamadas", async () => {
    const env = createMockDomainEnvironment();
    const a = await env.services.communications.create(OWNER_ALFA, baseInput());
    const b = await env.services.communications.create(OWNER_ALFA, baseInput());
    if (!a.ok || !b.ok) throw new Error("unreachable");
    expect(a.data.metadata.createdAt < b.data.metadata.createdAt).toBe(true);
  });
  it("(74) omite recipientLabel opcional quando ausente", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, baseInput());
    if (!r.ok) throw new Error("unreachable");
    expect(r.data.recipientLabel).toBeUndefined();
  });
  it("(75) aceita todos os canais válidos", async () => {
    const env = createMockDomainEnvironment();
    for (const ch of COMMUNICATION_CHANNELS) {
      const r = await env.services.communications.create(OWNER_ALFA, {
        ...baseInput(),
        channel: ch,
      });
      expect(r.ok).toBe(true);
    }
  });
  it("(76) confirmation_response com outbound é rejeitado", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      kind: "confirmation_response",
      direction: "outbound",
      outcome: "confirmed",
    });
    expect(r.ok).toBe(false);
  });
  it("(77) absence com outbound é rejeitado", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      kind: "absence",
      direction: "outbound",
      outcome: "informed",
    });
    expect(r.ok).toBe(false);
  });
  it("(78) confirmation_request (outbound+pending) sucede", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      kind: "confirmation_request",
      direction: "outbound",
      outcome: "pending",
      channel: "email",
      subject: "Pedido de confirmação",
    });
    expect(r.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// (I) Isolamento organizacional & imutabilidade do seed
// ---------------------------------------------------------------------------

describe("LV-09.2A · isolamento e imutabilidade", () => {
  it("(79) snapshot inicial é determinístico entre instâncias", () => {
    const a = createMockDomainEnvironment().snapshot().communications;
    const b = createMockDomainEnvironment().snapshot().communications;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it("(80) create em um env não afeta outro env", async () => {
    const e1 = createMockDomainEnvironment();
    const e2 = createMockDomainEnvironment();
    await e1.services.communications.create(OWNER_ALFA, baseInput());
    expect(e1.snapshot().communications.length).toBe(4);
    expect(e2.snapshot().communications.length).toBe(3);
  });
  it("(81) appointment de outro case (AP_A1_1) fica sem comunicações", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_1_ID,
      AP_A1_1,
    );
    expect(r.ok && r.data.items.length === 0).toBe(true);
  });
  it("(82) snapshot.communications é congelado (readonly)", () => {
    const s = createMockDomainEnvironment().snapshot();
    expect(Array.isArray(s.communications)).toBe(true);
    // Object.freeze é aplicado no envelope do snapshot.
    expect(Object.isFrozen(s)).toBe(true);
  });
});
