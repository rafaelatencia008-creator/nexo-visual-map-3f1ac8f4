/**
 * LV-09.2B1 — Fundação estendida das Comunicações (domínio, mock e seed).
 *
 * Cobertura: novos kinds, novos outcomes, canal opcional condicional, canal
 * obrigatório por tipo, conteúdo textual mínimo (subject OU note), ordenação
 * do histórico (occurredAt DESC, id DESC) e integridade relacional do seed.
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
  SEED_CASE_ALFA_2_ID,
  validateMockDomainSeed,
} from "@/domain/mocks/seed";
import type { ServiceContext } from "@/domain/services/context";
import type { CreateCommunicationInput } from "@/domain/services/inputs";
import {
  COMMUNICATION_KINDS,
  COMMUNICATION_OUTCOMES,
  isCoherentCommunication,
  isCommunication,
  kindRequiresChannel,
  type CommunicationKind,
} from "@/domain/core/communication";
import { buildDomainId } from "@/domain/core/ids";
import type { IsoDateTime } from "@/domain/core/common";

const OWNER_ALFA: ServiceContext = {
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_1_ID,
  membershipId: SEED_MEM_ALFA_OWNER_ID,
  role: "proprietario",
};
// referenciado apenas para provar isolamento cruzado
void SEED_ORG_BETA_ID;
void SEED_USER_2_ID;
void SEED_MEM_BETA_OWNER_ID;

const AP_A2_2 = buildDomainId("appointment", "seed_alfa2_meet_remote");
const AP_A2_1 = buildDomainId("appointment", "seed_alfa2_hearing");

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
    note: "Nota interna",
    occurredAt: "2026-02-01T10:00:00.000Z" as IsoDateTime,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// (A) Novos catálogos
// ---------------------------------------------------------------------------

describe("LV-09.2B1 · catálogos expandidos", () => {
  it("(1) inclui contact_attempt", () =>
    expect(COMMUNICATION_KINDS.includes("contact_attempt")).toBe(true));
  it("(2) inclui cancellation", () =>
    expect(COMMUNICATION_KINDS.includes("cancellation")).toBe(true));
  it("(3) inclui reschedule_request", () =>
    expect(COMMUNICATION_KINDS.includes("reschedule_request")).toBe(true));
  it("(4) inclui outcome completed", () =>
    expect(COMMUNICATION_OUTCOMES.includes("completed")).toBe(true));
  it("(5) inclui outcome message_left", () =>
    expect(COMMUNICATION_OUTCOMES.includes("message_left")).toBe(true));
  it("(6) inclui outcome absent", () =>
    expect(COMMUNICATION_OUTCOMES.includes("absent")).toBe(true));
  it("(7) inclui outcome cancelled", () =>
    expect(COMMUNICATION_OUTCOMES.includes("cancelled")).toBe(true));
  it("(8) inclui outcome reschedule_requested", () =>
    expect(COMMUNICATION_OUTCOMES.includes("reschedule_requested")).toBe(true));
});

// ---------------------------------------------------------------------------
// (B) Coerência dos novos kinds
// ---------------------------------------------------------------------------

describe("LV-09.2B1 · coerência dos novos tipos", () => {
  it("(9) contact_attempt exige outbound", () => {
    expect(isCoherentCommunication("contact_attempt", "outbound", "completed")).toBe(true);
    expect(isCoherentCommunication("contact_attempt", "outbound", "no_response")).toBe(true);
    expect(isCoherentCommunication("contact_attempt", "outbound", "message_left")).toBe(true);
    expect(isCoherentCommunication("contact_attempt", "inbound", "completed")).toBe(false);
    expect(isCoherentCommunication("contact_attempt", "outbound", "confirmed")).toBe(false);
  });
  it("(10) cancellation exige inbound/internal + cancelled", () => {
    expect(isCoherentCommunication("cancellation", "inbound", "cancelled")).toBe(true);
    expect(isCoherentCommunication("cancellation", "internal", "cancelled")).toBe(true);
    expect(isCoherentCommunication("cancellation", "outbound", "cancelled")).toBe(false);
    expect(isCoherentCommunication("cancellation", "internal", "confirmed")).toBe(false);
  });
  it("(11) reschedule_request exige inbound/internal + reschedule_requested", () => {
    expect(isCoherentCommunication("reschedule_request", "inbound", "reschedule_requested")).toBe(true);
    expect(isCoherentCommunication("reschedule_request", "internal", "reschedule_requested")).toBe(true);
    expect(isCoherentCommunication("reschedule_request", "outbound", "reschedule_requested")).toBe(false);
  });
  it("(12) absence agora restringe outcome a 'absent'", () => {
    expect(isCoherentCommunication("absence", "inbound", "absent")).toBe(true);
    expect(isCoherentCommunication("absence", "inbound", "informed")).toBe(false);
    expect(isCoherentCommunication("absence", "inbound", "rescheduled")).toBe(false);
  });
  it("(13) confirmation_response não aceita mais rescheduled", () => {
    expect(isCoherentCommunication("confirmation_response", "inbound", "rescheduled")).toBe(false);
  });
  it("(14) note não aceita outcomes novos (absent/cancelled/reschedule_requested/completed/message_left)", () => {
    for (const bad of ["absent", "cancelled", "reschedule_requested", "completed", "message_left"] as const)
      expect(isCoherentCommunication("note", "internal", bad)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// (C) Canal obrigatório condicional
// ---------------------------------------------------------------------------

describe("LV-09.2B1 · canal condicional", () => {
  it("(15) kindRequiresChannel só para contact_attempt / confirmation_request / confirmation_response", () => {
    const required: CommunicationKind[] = [
      "contact_attempt",
      "confirmation_request",
      "confirmation_response",
    ];
    for (const k of COMMUNICATION_KINDS)
      expect(kindRequiresChannel(k)).toBe(required.includes(k));
  });

  it("(16) create rejeita canal ausente quando exigido", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      kind: "contact_attempt",
      direction: "outbound",
      outcome: "completed",
      channel: undefined,
      subject: "Tentativa",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error.message).toBe("communication_channel_required");
  });

  it("(17) create aceita canal ausente para reschedule_request", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      kind: "reschedule_request",
      direction: "internal",
      outcome: "reschedule_requested",
      channel: undefined,
      note: "Solicitar novo horário",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.data.channel).toBeUndefined();
  });

  it("(18) isCommunication rejeita canal ausente quando exigido", () => {
    const env = createMockDomainEnvironment();
    const seed = env.snapshot().communications[0];
    const c = { ...seed, kind: "contact_attempt", channel: undefined } as unknown;
    expect(isCommunication(c)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// (D) Conteúdo textual mínimo
// ---------------------------------------------------------------------------

describe("LV-09.2B1 · conteúdo mínimo (subject OU note)", () => {
  it("(19) create rejeita quando ambos ausentes", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      caseId: SEED_CASE_ALFA_2_ID,
      appointmentId: AP_A2_2,
      kind: "note",
      channel: "system",
      outcome: "informed",
      direction: "internal",
      occurredAt: "2026-02-01T10:00:00.000Z" as IsoDateTime,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error.message).toBe("communication_content_required");
  });

  it("(20) create aceita apenas subject", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      note: undefined,
      subject: "Somente assunto",
    });
    expect(r.ok).toBe(true);
  });

  it("(21) create aceita apenas note", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      subject: undefined,
      note: "Somente nota",
    });
    expect(r.ok).toBe(true);
  });

  it("(22) isCommunication rejeita entidade sem subject nem note", () => {
    const env = createMockDomainEnvironment();
    const seed = env.snapshot().communications.find((c) => c.subject);
    if (!seed) throw new Error("expected seed com subject");
    const c = { ...seed, subject: undefined, note: undefined } as unknown;
    expect(isCommunication(c)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// (E) Ordenação DESC (occurredAt, id)
// ---------------------------------------------------------------------------

describe("LV-09.2B1 · ordenação do histórico", () => {
  it("(23) list retorna occurredAt em ordem decrescente", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
    );
    if (!r.ok) throw new Error("unreachable");
    const t = r.data.items.map((c) => c.occurredAt);
    for (let i = 1; i < t.length; i++) expect(t[i - 1] >= t[i]).toBe(true);
  });

  it("(24) empates de occurredAt desempatam por id DESC", async () => {
    const env = createMockDomainEnvironment();
    const when: IsoDateTime = "2026-02-02T09:00:00.000Z" as IsoDateTime;
    const a = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      occurredAt: when,
      note: "A",
    });
    const b = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      occurredAt: when,
      note: "B",
    });
    if (!a.ok || !b.ok) throw new Error("unreachable");
    const r = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
    );
    if (!r.ok) throw new Error("unreachable");
    const withTie = r.data.items.filter((c) => c.occurredAt === when);
    expect(withTie.length).toBe(2);
    expect(withTie[0].id > withTie[1].id).toBe(true);
  });

  it("(25) primeiro item do seed em AP_A2_2 é reschedule_request (mais recente)", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
    );
    if (!r.ok) throw new Error("unreachable");
    expect(r.data.items[0].kind).toBe("reschedule_request");
  });
});

// ---------------------------------------------------------------------------
// (F) Seed expandido — 8 registros e integridade relacional
// ---------------------------------------------------------------------------

describe("LV-09.2B1 · seed expandido", () => {
  it("(26) snapshot contém 8 comunicações", () => {
    const env = createMockDomainEnvironment();
    expect(env.snapshot().communications.length).toBe(8);
  });

  it("(27) AP_A2_2 recebe 6 comunicações", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
    );
    if (!r.ok) throw new Error("unreachable");
    expect(r.data.items.length).toBe(6);
  });

  it("(28) AP_A2_1 recebe 2 comunicações (absence + cancellation)", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_1,
    );
    if (!r.ok) throw new Error("unreachable");
    expect(r.data.items.length).toBe(2);
    const kinds = new Set(r.data.items.map((c) => c.kind));
    expect(kinds.has("absence")).toBe(true);
    expect(kinds.has("cancellation")).toBe(true);
  });

  it("(29) seed cobre os três novos kinds", () => {
    const env = createMockDomainEnvironment();
    const kinds = new Set(env.snapshot().communications.map((c) => c.kind));
    expect(kinds.has("contact_attempt")).toBe(true);
    expect(kinds.has("cancellation")).toBe(true);
    expect(kinds.has("reschedule_request")).toBe(true);
  });

  it("(30) seed contém reschedule_request sem canal (canal opcional exercitado)", () => {
    const env = createMockDomainEnvironment();
    const r = env
      .snapshot()
      .communications.find((c) => c.kind === "reschedule_request");
    expect(r).toBeDefined();
    expect(r?.channel).toBeUndefined();
  });

  it("(31) todos os registros do seed passam por isCommunication", () => {
    const env = createMockDomainEnvironment();
    for (const c of env.snapshot().communications)
      expect(isCommunication(c)).toBe(true);
  });

  it("(32) validateMockDomainSeed não emite issues para communications", () => {
    const env = createMockDomainEnvironment();
    // acessa internamente o store através de um snapshot canônico
    const issues = validateMockDomainSeed(env.snapshot()).filter(
      (i) => i.entity === "communication",
    );
    expect(issues).toEqual([]);
  });

  it("(33) snapshot é determinístico entre instâncias distintas", () => {
    const a = createMockDomainEnvironment().snapshot().communications;
    const b = createMockDomainEnvironment().snapshot().communications;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

// ---------------------------------------------------------------------------
// (G) Combinações inválidas cobertas pelo mock (regressão)
// ---------------------------------------------------------------------------

describe("LV-09.2B1 · rejeições de combinações inválidas", () => {
  it("(34) confirmation_response + rescheduled é rejeitado no create", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      kind: "confirmation_response",
      direction: "inbound",
      outcome: "rescheduled",
      channel: "email",
      subject: "resposta",
    });
    expect(r.ok).toBe(false);
  });

  it("(35) absence + informed é rejeitado no create", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      kind: "absence",
      direction: "internal",
      outcome: "informed",
      note: "x",
    });
    expect(r.ok).toBe(false);
  });

  it("(36) cancellation + outbound é rejeitado", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      kind: "cancellation",
      direction: "outbound",
      outcome: "cancelled",
      note: "x",
    });
    expect(r.ok).toBe(false);
  });

  it("(37) contact_attempt + inbound é rejeitado", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      kind: "contact_attempt",
      direction: "inbound",
      outcome: "completed",
      channel: "phone",
      note: "x",
    });
    expect(r.ok).toBe(false);
  });

  it("(38) reschedule_request + confirmed é rejeitado", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      kind: "reschedule_request",
      direction: "internal",
      outcome: "confirmed",
      note: "x",
    });
    expect(r.ok).toBe(false);
  });

  it("(39) note + absent é rejeitado", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      kind: "note",
      outcome: "absent",
      direction: "internal",
      note: "x",
    });
    expect(r.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// (H) Aceitações canônicas
// ---------------------------------------------------------------------------

describe("LV-09.2B1 · aceitações canônicas", () => {
  it("(40) contact_attempt outbound + completed com canal phone é aceito", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      kind: "contact_attempt",
      direction: "outbound",
      outcome: "completed",
      channel: "phone",
      subject: "contato realizado",
    });
    expect(r.ok).toBe(true);
  });

  it("(41) contact_attempt outbound + message_left com canal whatsapp é aceito", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      kind: "contact_attempt",
      direction: "outbound",
      outcome: "message_left",
      channel: "whatsapp",
      subject: "mensagem deixada",
    });
    expect(r.ok).toBe(true);
  });

  it("(42) cancellation inbound + cancelled sem canal é aceito", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      kind: "cancellation",
      direction: "inbound",
      outcome: "cancelled",
      channel: undefined,
      note: "informou cancelamento",
    });
    expect(r.ok).toBe(true);
  });

  it("(43) absence internal + absent sem canal é aceito", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      kind: "absence",
      direction: "internal",
      outcome: "absent",
      channel: undefined,
      note: "parte ausente",
    });
    expect(r.ok).toBe(true);
  });

  it("(44) note interno com subject preenche conteúdo mínimo", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      kind: "note",
      direction: "internal",
      outcome: "informed",
      channel: undefined,
      subject: "assunto",
      note: undefined,
    });
    expect(r.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// (I) Imutabilidade e limpeza
// ---------------------------------------------------------------------------

describe("LV-09.2B1 · imutabilidade e paginação com histórico expandido", () => {
  it("(45) getById devolve deep clone (mutação externa não altera store)", async () => {
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
    if (!r.ok) throw new Error("unreachable");
    (r.data as unknown as { note?: string }).note = "MUTATED";
    const again = await env.services.communications.getById(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
      first.id,
    );
    if (!again.ok) throw new Error("unreachable");
    expect(again.data.note).not.toBe("MUTATED");
  });

  it("(46) paginação com limit=3 percorre AP_A2_2 sem duplicatas", async () => {
    const env = createMockDomainEnvironment();
    const seen = new Set<string>();
    let cursor: string | undefined;
    let iterations = 0;
    do {
      const r = await env.services.communications.listByAppointment(
        OWNER_ALFA,
        SEED_CASE_ALFA_2_ID,
        AP_A2_2,
        { page: { limit: 3, cursor } },
      );
      if (!r.ok) throw new Error("unreachable");
      for (const it of r.data.items) {
        expect(seen.has(it.id)).toBe(false);
        seen.add(it.id);
      }
      cursor = r.data.nextCursor;
      iterations += 1;
      expect(iterations).toBeLessThan(10);
    } while (cursor);
    expect(seen.size).toBe(6);
  });

  it("(47) filtro por outcomes novos funciona (message_left)", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
      { outcomes: ["message_left"] },
    );
    if (!r.ok) throw new Error("unreachable");
    expect(r.data.items.length).toBe(1);
    expect(r.data.items[0].outcome).toBe("message_left");
  });

  it("(48) filtro por kinds novos funciona (contact_attempt)", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
      { kinds: ["contact_attempt"] },
    );
    if (!r.ok) throw new Error("unreachable");
    expect(r.data.items.length).toBe(2);
    for (const it of r.data.items) expect(it.kind).toBe("contact_attempt");
  });

  it("(49) filtro por kinds reschedule_request retorna 1", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
      { kinds: ["reschedule_request"] },
    );
    if (!r.ok) throw new Error("unreachable");
    expect(r.data.items.length).toBe(1);
  });

  it("(50) filtro por kinds cancellation em AP_A2_1 retorna 1", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.listByAppointment(
      OWNER_ALFA,
      SEED_CASE_ALFA_2_ID,
      AP_A2_1,
      { kinds: ["cancellation"] },
    );
    if (!r.ok) throw new Error("unreachable");
    expect(r.data.items.length).toBe(1);
  });
});
