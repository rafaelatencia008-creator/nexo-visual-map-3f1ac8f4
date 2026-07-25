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

// ---------------------------------------------------------------------------
// (F) LV-09.2B2 · Provas residuais da B1 (invariantes profundas do serviço)
// ---------------------------------------------------------------------------

import {
  SEED_CASE_BETA_1_ID,
  SEED_MEM_ALFA_SUSPENDED_ID,
} from "@/domain/mocks/seed";

const OWNER_BETA: ServiceContext = {
  organizationId: SEED_ORG_BETA_ID,
  userId: SEED_USER_2_ID,
  membershipId: SEED_MEM_BETA_OWNER_ID,
  role: "proprietario",
};

const AP_BETA_1 = buildDomainId("appointment", "seed_beta1_diligence");
const AP_FAKE = buildDomainId("appointment", "does_not_exist");
const CASE_FAKE = buildDomainId("case", "does_not_exist");
const MEM_FAKE = buildDomainId("membership", "does_not_exist");

describe("LV-09.2B2 · provas residuais da B1", () => {
  it("(51) seed não contém communication com id duplicado", () => {
    const env = createMockDomainEnvironment();
    const ids = env.snapshot().communications.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("(52) create rejeita quando organização é inexistente (contexto inválido)", async () => {
    const env = createMockDomainEnvironment();
    const bogusCtx: ServiceContext = {
      organizationId: buildDomainId("organization", "ghost"),
      userId: SEED_USER_1_ID,
      membershipId: SEED_MEM_ALFA_OWNER_ID,
      role: "proprietario",
    };
    const r = await env.services.communications.create(bogusCtx, baseInput());
    expect(r.ok).toBe(false);
  });

  it("(53) create rejeita processo inexistente", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      caseId: CASE_FAKE,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error.code).toBe("not_found");
  });

  it("(54) create rejeita compromisso inexistente", async () => {
    const env = createMockDomainEnvironment();
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      appointmentId: AP_FAKE,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error.code).toBe("not_found");
  });

  it("(55) create rejeita compromisso pertencente a outro processo", async () => {
    const env = createMockDomainEnvironment();
    // AP_A2_2 pertence ao caso ALFA_2; usar caso ALFA_1 provoca mismatch.
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      caseId: buildDomainId("case", "seed_alfa_1"),
      appointmentId: AP_A2_2,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error.code).toBe("not_found");
  });

  it("(56) create rejeita organização divergente do processo (isolamento)", async () => {
    const env = createMockDomainEnvironment();
    // OWNER_BETA tentando registrar em caso ALFA.
    const r = await env.services.communications.create(OWNER_BETA, {
      ...baseInput(),
      caseId: SEED_CASE_ALFA_2_ID,
      appointmentId: AP_A2_2,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error.code).toBe("not_found");
  });

  it("(57) create rejeita organização divergente do compromisso", async () => {
    const env = createMockDomainEnvironment();
    // OWNER_BETA no caso beta, mas apontando appointment de ALFA.
    const r = await env.services.communications.create(OWNER_BETA, {
      ...baseInput(),
      caseId: SEED_CASE_BETA_1_ID,
      appointmentId: AP_A2_2,
    });
    expect(r.ok).toBe(false);
  });

  it("(58) create rejeita quando authorMembership pertence a outra org", async () => {
    const env = createMockDomainEnvironment();
    // Contexto forjado com membershipId de outra org: o serviço não deve
    // aceitar/associar essa autoria — o requireContext valida a coerência.
    const bad: ServiceContext = {
      organizationId: SEED_ORG_ALFA_ID,
      userId: SEED_USER_1_ID,
      membershipId: SEED_MEM_BETA_OWNER_ID, // pertence à Beta
      role: "proprietario",
    };
    const r = await env.services.communications.create(bad, baseInput());
    expect(r.ok).toBe(false);
  });

  it("(59) create rejeita quando membership do autor é inexistente", async () => {
    const env = createMockDomainEnvironment();
    const bad: ServiceContext = {
      organizationId: SEED_ORG_ALFA_ID,
      userId: SEED_USER_1_ID,
      membershipId: MEM_FAKE,
      role: "proprietario",
    };
    const r = await env.services.communications.create(bad, baseInput());
    expect(r.ok).toBe(false);
  });

  it("(60) falha de validação não altera o snapshot de comunicações", async () => {
    const env = createMockDomainEnvironment();
    const before = env.snapshot().communications;
    const r = await env.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      // Coerência quebrada.
      kind: "note",
      outcome: "cancelled",
    });
    expect(r.ok).toBe(false);
    const after = env.snapshot().communications;
    expect(after.length).toBe(before.length);
    expect(after.map((c) => c.id)).toEqual(before.map((c) => c.id));
  });

  it("(61) falha de validação não consome o próximo ID", async () => {
    const envA = createMockDomainEnvironment();
    // Provoca falha primeiro em A.
    const fail = await envA.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      kind: "note",
      outcome: "cancelled", // incoerente
    });
    expect(fail.ok).toBe(false);
    const okA = await envA.services.communications.create(
      OWNER_ALFA,
      baseInput(),
    );
    const envB = createMockDomainEnvironment();
    const okB = await envB.services.communications.create(
      OWNER_ALFA,
      baseInput(),
    );
    if (!okA.ok || !okB.ok) throw new Error("unreachable");
    expect(okA.data.id).toBe(okB.data.id);
  });

  it("(62) falha de validação não avança o relógio determinístico", async () => {
    const envA = createMockDomainEnvironment();
    const fail = await envA.services.communications.create(OWNER_ALFA, {
      ...baseInput(),
      kind: "note",
      outcome: "cancelled",
    });
    expect(fail.ok).toBe(false);
    const okA = await envA.services.communications.create(
      OWNER_ALFA,
      baseInput(),
    );
    const envB = createMockDomainEnvironment();
    const okB = await envB.services.communications.create(
      OWNER_ALFA,
      baseInput(),
    );
    if (!okA.ok || !okB.ok) throw new Error("unreachable");
    expect(okA.data.metadata.createdAt).toBe(okB.data.metadata.createdAt);
    expect(okA.data.occurredAt).toBe(okB.data.occurredAt);
  });
});

// ---------------------------------------------------------------------------
// (G) LV-09.2B2 · Formulário e rótulos (puros)
// ---------------------------------------------------------------------------

import {
  buildCommunicationCreateInput,
  createCommunicationFormForAction,
  EMPTY_COMMUNICATION_FORM,
  getAllowedOutcomesForAction,
  COMMUNICATION_QUICK_ACTIONS,
  type CommunicationQuickAction,
} from "@/features/agenda/communication-form";
import {
  COMMUNICATION_ACTION_LABEL,
  COMMUNICATION_CHANNEL_LABEL,
  COMMUNICATION_DIRECTION_LABEL,
  COMMUNICATION_KIND_LABEL,
  COMMUNICATION_OUTCOME_LABEL,
  getCommunicationActionLabel,
  getCommunicationKindLabel,
} from "@/features/agenda/communication-labels";
import {
  COMMUNICATION_CHANNELS,
  COMMUNICATION_DIRECTIONS,
} from "@/domain/core/communication";

const OCCUR = "2026-02-15T10:30";

describe("LV-09.2B2 · presets e builder", () => {
  it("(63) EMPTY_COMMUNICATION_FORM está congelado", () => {
    expect(Object.isFrozen(EMPTY_COMMUNICATION_FORM)).toBe(true);
  });

  it("(64) preset contact tem kind=contact_attempt, outbound, completed", () => {
    const f = createCommunicationFormForAction("contact");
    expect(f.kind).toBe("contact_attempt");
    expect(f.direction).toBe("outbound");
    expect(f.outcome).toBe("completed");
    expect(f.channel).toBe("");
    expect(f.summary).toBe("");
    expect(Object.isFrozen(f)).toBe(true);
  });

  it("(65) preset confirm inbound + confirmed", () => {
    const f = createCommunicationFormForAction("confirm");
    expect(f.kind).toBe("confirmation_response");
    expect(f.direction).toBe("inbound");
    expect(f.outcome).toBe("confirmed");
  });

  it("(66) preset absence internal + absent", () => {
    const f = createCommunicationFormForAction("absence");
    expect(f.kind).toBe("absence");
    expect(f.direction).toBe("internal");
    expect(f.outcome).toBe("absent");
  });

  it("(67) preset cancellation internal + cancelled", () => {
    const f = createCommunicationFormForAction("cancellation");
    expect(f.kind).toBe("cancellation");
    expect(f.direction).toBe("internal");
    expect(f.outcome).toBe("cancelled");
  });

  it("(68) preset reschedule_request internal + reschedule_requested", () => {
    const f = createCommunicationFormForAction("reschedule_request");
    expect(f.kind).toBe("reschedule_request");
    expect(f.direction).toBe("internal");
    expect(f.outcome).toBe("reschedule_requested");
  });

  it("(69) getAllowedOutcomesForAction contact permite 3 resultados", () => {
    const allowed = getAllowedOutcomesForAction("contact");
    expect(allowed).toContain("completed");
    expect(allowed).toContain("no_response");
    expect(allowed).toContain("message_left");
  });

  it("(70) getAllowedOutcomesForAction outras ações têm resultado fixo", () => {
    for (const a of ["confirm", "absence", "cancellation", "reschedule_request"] as const) {
      expect(getAllowedOutcomesForAction(a).length).toBe(1);
    }
  });

  it("(71) COMMUNICATION_QUICK_ACTIONS possui exatamente 5 ações", () => {
    expect(COMMUNICATION_QUICK_ACTIONS.length).toBe(5);
  });

  it("(72) builder recusa quando canal é exigido e ausente", () => {
    const f = createCommunicationFormForAction("contact");
    const state = {
      ...f,
      occurredAtLocal: OCCUR,
      summary: "Ligação de rotina",
    };
    const r = buildCommunicationCreateInput(SEED_CASE_ALFA_2_ID, AP_A2_2, state);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.errors.channel).toBeTruthy();
  });

  it("(73) builder aceita canal ausente para reschedule_request", () => {
    const f = createCommunicationFormForAction("reschedule_request");
    const state = { ...f, occurredAtLocal: OCCUR, summary: "Nova data" };
    const r = buildCommunicationCreateInput(SEED_CASE_ALFA_2_ID, AP_A2_2, state);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect("channel" in r.input).toBe(false);
  });

  it("(74) builder exige resumo", () => {
    const f = createCommunicationFormForAction("absence");
    const state = { ...f, occurredAtLocal: OCCUR };
    const r = buildCommunicationCreateInput(SEED_CASE_ALFA_2_ID, AP_A2_2, state);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.errors.summary).toBeTruthy();
  });

  it("(75) builder rejeita data e hora vazias/ inválidas", () => {
    const f = createCommunicationFormForAction("absence");
    const state = { ...f, summary: "X", occurredAtLocal: "" };
    const r1 = buildCommunicationCreateInput(SEED_CASE_ALFA_2_ID, AP_A2_2, state);
    expect(r1.ok).toBe(false);
    const state2 = { ...f, summary: "X", occurredAtLocal: "2026-13-40T99:99" };
    const r2 = buildCommunicationCreateInput(SEED_CASE_ALFA_2_ID, AP_A2_2, state2);
    expect(r2.ok).toBe(false);
  });

  it("(76) builder aplica limites (subject 160, note 2000, recipient 160)", () => {
    const f = createCommunicationFormForAction("absence");
    const long = "x".repeat(161);
    const state = { ...f, occurredAtLocal: OCCUR, summary: long };
    const r = buildCommunicationCreateInput(SEED_CASE_ALFA_2_ID, AP_A2_2, state);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.errors.summary).toBeTruthy();

    const state2 = {
      ...f,
      occurredAtLocal: OCCUR,
      summary: "ok",
      notes: "y".repeat(2001),
    };
    const r2 = buildCommunicationCreateInput(SEED_CASE_ALFA_2_ID, AP_A2_2, state2);
    expect(r2.ok).toBe(false);
    if (r2.ok) throw new Error("unreachable");
    expect(r2.errors.notes).toBeTruthy();

    const state3 = {
      ...f,
      occurredAtLocal: OCCUR,
      summary: "ok",
      recipientLabel: "z".repeat(161),
    };
    const r3 = buildCommunicationCreateInput(SEED_CASE_ALFA_2_ID, AP_A2_2, state3);
    expect(r3.ok).toBe(false);
  });

  it("(77) builder omite propriedades opcionais quando vazias", () => {
    const f = createCommunicationFormForAction("absence");
    const state = { ...f, occurredAtLocal: OCCUR, summary: "Registrado" };
    const r = buildCommunicationCreateInput(SEED_CASE_ALFA_2_ID, AP_A2_2, state);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect("channel" in r.input).toBe(false);
    expect("note" in r.input).toBe(false);
    expect("recipientLabel" in r.input).toBe(false);
    expect(r.input.subject).toBe("Registrado");
  });

  it("(78) DTO final é aceito por communications.create", async () => {
    const env = createMockDomainEnvironment();
    const f = createCommunicationFormForAction("contact");
    const state = {
      ...f,
      channel: "phone",
      occurredAtLocal: OCCUR,
      summary: "Ligação",
    };
    const built = buildCommunicationCreateInput(
      SEED_CASE_ALFA_2_ID,
      AP_A2_2,
      state,
    );
    if (!built.ok) throw new Error("unreachable");
    const r = await env.services.communications.create(OWNER_ALFA, built.input);
    expect(r.ok).toBe(true);
  });
});

describe("LV-09.2B2 · rótulos completos em português", () => {
  it("(79) mapas cobrem todos os kinds e todos são em português", () => {
    for (const k of COMMUNICATION_KINDS) {
      const label = COMMUNICATION_KIND_LABEL[k];
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
      // não contém underline (característica dos valores internos).
      expect(label.includes("_")).toBe(false);
    }
  });

  it("(80) mapas cobrem todos os canais e são em português", () => {
    for (const c of COMMUNICATION_CHANNELS) {
      expect(COMMUNICATION_CHANNEL_LABEL[c].length).toBeGreaterThan(0);
    }
  });

  it("(81) mapas cobrem todos os outcomes e nenhum contém underline", () => {
    for (const o of COMMUNICATION_OUTCOMES) {
      const label = COMMUNICATION_OUTCOME_LABEL[o];
      expect(label.length).toBeGreaterThan(0);
      expect(label.includes("_")).toBe(false);
    }
  });

  it("(82) mapa de direções completo", () => {
    for (const d of COMMUNICATION_DIRECTIONS) {
      expect(COMMUNICATION_DIRECTION_LABEL[d].length).toBeGreaterThan(0);
    }
  });

  it("(83) mapa de ações rápidas cobre as cinco ações", () => {
    for (const a of COMMUNICATION_QUICK_ACTIONS) {
      expect(COMMUNICATION_ACTION_LABEL[a].length).toBeGreaterThan(0);
    }
  });

  it("(84) getters coincidem com os mapas", () => {
    expect(getCommunicationKindLabel("absence")).toBe("Ausência");
    expect(getCommunicationActionLabel("reschedule_request")).toBe(
      "Registrar pedido de reagendamento",
    );
  });
});

// ---------------------------------------------------------------------------
// (H) LV-09.2B2 · Integração, seção, diálogo e histórico
// ---------------------------------------------------------------------------

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const CWD = process.cwd();
const readSrc = (rel: string) => readFileSync(resolve(CWD, rel), "utf8");

describe("LV-09.2B2 · integração e escopo", () => {
  it("(85) arquivo AgendaCommunicationsSection existe", () => {
    expect(existsSync(resolve(CWD, "src/features/agenda/AgendaCommunicationsSection.tsx"))).toBe(true);
  });

  it("(86) arquivo AgendaCommunicationDialog existe (único)", () => {
    const path = "src/features/agenda/AgendaCommunicationDialog.tsx";
    expect(existsSync(resolve(CWD, path))).toBe(true);
    // Nenhum diálogo por ação separado.
    const dir = readdirSync(resolve(CWD, "src/features/agenda"));
    const dialogs = dir.filter(
      (n) => n.startsWith("AgendaCommunication") && n.endsWith("Dialog.tsx"),
    );
    expect(dialogs).toEqual(["AgendaCommunicationDialog.tsx"]);
  });

  it("(87) seção é integrada no AgendaItemDetailContent", () => {
    const src = readSrc("src/features/agenda/AgendaItemDetailContent.tsx");
    expect(src.includes("AgendaCommunicationsSection")).toBe(true);
  });

  it("(88) seção é renderizada apenas para appointment", () => {
    const src = readSrc("src/features/agenda/AgendaItemDetailContent.tsx");
    expect(
      src.includes('detail.loaded.type === "appointment"') &&
        src.includes("<AgendaCommunicationsSection"),
    ).toBe(true);
  });

  it("(89) AgendaItemDetailDialog e a página não integram a seção diretamente", () => {
    const dialog = readSrc("src/features/agenda/AgendaItemDetailDialog.tsx");
    const page = readSrc("src/routes/app.agenda.$appointmentId.tsx");
    expect(dialog.includes("AgendaCommunicationsSection")).toBe(false);
    expect(page.includes("AgendaCommunicationsSection")).toBe(false);
  });

  it("(90) não existe rota /app/comunicacoes", () => {
    const routes = readdirSync(resolve(CWD, "src/routes"));
    const has = routes.some((n) => n.includes("comunicacoes"));
    expect(has).toBe(false);
  });

  it("(91) nenhuma alteração automática do compromisso a partir da seção", () => {
    const src = readSrc("src/features/agenda/AgendaCommunicationsSection.tsx");
    expect(src.includes("appointments.update")).toBe(false);
    expect(src.includes("appointments.changeStatus")).toBe(false);
    expect(src.includes("appointments.remove")).toBe(false);
  });

  it("(92) nenhuma integração externa (fetch/http/ws) na seção ou no diálogo", () => {
    const s = readSrc("src/features/agenda/AgendaCommunicationsSection.tsx");
    const d = readSrc("src/features/agenda/AgendaCommunicationDialog.tsx");
    for (const src of [s, d]) {
      expect(/\bfetch\s*\(/.test(src)).toBe(false);
      expect(/XMLHttpRequest/.test(src)).toBe(false);
      expect(/WebSocket/.test(src)).toBe(false);
      expect(/window\.location\.reload/.test(src)).toBe(false);
    }
  });

  it("(93) seção usa o serviço oficial listByAppointment com PAGE_LIMIT_MAX", () => {
    const src = readSrc("src/features/agenda/AgendaCommunicationsSection.tsx");
    expect(src.includes("listByAppointment")).toBe(true);
    expect(src.includes("PAGE_LIMIT_MAX")).toBe(true);
  });

  it("(94) seção define teto de páginas COMMUNICATION_HISTORY_MAX_PAGES=20", () => {
    const src = readSrc("src/features/agenda/AgendaCommunicationsSection.tsx");
    expect(/COMMUNICATION_HISTORY_MAX_PAGES\s*=\s*20/.test(src)).toBe(true);
  });

  it("(95) seção detecta cursor repetido explicitamente", () => {
    const src = readSrc("src/features/agenda/AgendaCommunicationsSection.tsx");
    expect(src.includes("seenCursors")).toBe(true);
    expect(src.includes("cursor_repeat")).toBe(true);
  });

  it("(96) diálogo aplica single-flight e aria-busy", () => {
    const src = readSrc("src/features/agenda/AgendaCommunicationDialog.tsx");
    expect(src.includes("savingRef")).toBe(true);
    expect(src.includes("aria-busy")).toBe(true);
  });

  it("(97) diálogo aplica confirmação de descarte com AlertDialog", () => {
    const src = readSrc("src/features/agenda/AgendaCommunicationDialog.tsx");
    expect(src.includes("Descartar registro?")).toBe(true);
    expect(src.includes("AlertDialog")).toBe(true);
  });

  it("(98) diálogo restaura foco ao gatilho via returnFocusRef", () => {
    const src = readSrc("src/features/agenda/AgendaCommunicationDialog.tsx");
    expect(src.includes("returnFocusRef")).toBe(true);
  });

  it("(99) seção anuncia sucesso via aria-live=\"polite\"", () => {
    const src = readSrc("src/features/agenda/AgendaCommunicationsSection.tsx");
    expect(src.includes('aria-live="polite"')).toBe(true);
    expect(src.includes("Registro salvo")).toBe(true);
  });

  it("(100) mapeamento de erros: forbidden→sem permissão, offline→offline", () => {
    const src = readSrc("src/features/agenda/AgendaCommunicationsSection.tsx");
    expect(src.includes('forbidden')).toBe(true);
    expect(src.includes('offline')).toBe(true);
    expect(src.includes("Você está offline")).toBe(true);
    expect(
      src.includes(
        "Você não tem permissão para visualizar estes registros",
      ),
    ).toBe(true);
  });

  it("(101) seção usa role/li/ul semânticos no histórico", () => {
    const src = readSrc("src/features/agenda/AgendaCommunicationsSection.tsx");
    expect(/<ul[\s>]/.test(src) && /<li[\s>]/.test(src)).toBe(true);
  });

  it("(102) DEC-AGE-002 existe e confirma o encerramento da LV-09.2", () => {
    const path = "docs/decisions/DEC-AGE-002-comunicacoes-ausencias.md";
    expect(existsSync(resolve(CWD, path))).toBe(true);
    const src = readSrc(path);
    expect(src.includes("LV-09.2 está concluída")).toBe(true);
    expect(src.includes("append-only")).toBe(true);
  });

  it("(103) rotas de app.agenda* e app.disponibilidade não foram alteradas para expor rota de comunicações", () => {
    const routes = ["app.agenda.index.tsx", "app.agenda.novo.tsx", "app.agenda.$appointmentId.tsx", "app.disponibilidade.tsx"];
    for (const n of routes) {
      const src = readSrc(`src/routes/${n}`);
      expect(src.includes("/app/comunicacoes")).toBe(false);
      expect(src.includes("AgendaCommunicationsSection")).toBe(false);
    }
  });

  it("(104) app-nav.ts não expõe entrada para /app/comunicacoes", () => {
    const src = readSrc("src/lib/app-nav.ts");
    expect(src.includes("/app/comunicacoes")).toBe(false);
  });
});
