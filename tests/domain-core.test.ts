/**
 * Testes de contrato do domínio oficial — LV-07.1 + correção LV-07.1.1.
 */

import { describe, it, expect } from "bun:test";
import {
  ID_PREFIX,
  buildDomainId,
  hasExpectedPrefix,
  isCaseId,
  isPersonId,
  parseDomainId,
  isIsoDate,
  isIsoDateTime,
  isValidVersion,
  isEntityMetadata,
  containsForbiddenKey,
  isOrganization,
  isCase,
  isPerson,
  isCasePerson,
  isRelationship,
  isAssignment,
  isProfessionalProfile,
  isUser,
  isMembership,
  isCredential,
  canLeaveDraft,
  getCaseReadinessIssues,
  validateCase,
  validatePerson,
  validateOrganization,
  validateUser,
  validateMembership,
  validateCredential,
  validateCasePerson,
  validateRelationship,
  validateAssignment,
  fixtures,
  WORK_MODES,
  PERFIS,
  ORGANIZATION_KINDS,
  PROFESSIONAL_AREAS,
  type CaseReadiness,
  type PersonId,
  type OrganizationId,
  type CaseId,
  type UserId,
  type MembershipId,
  type OrganizationKind,
  type ProfessionalArea,
} from "@/domain/core";
import type { Perfil, WorkMode } from "@/domain/shared/work-context";

const F = fixtures;

// ---- IDs -------------------------------------------------------------------

describe("IDs", () => {
  it("1) aceita prefixo correto", () => {
    expect(hasExpectedPrefix("case_demo_001", "case")).toBe(true);
    expect(isCaseId("case_demo_001")).toBe(true);
  });
  it("2) rejeita prefixo incorreto", () => {
    expect(hasExpectedPrefix("person_x", "case")).toBe(false);
    expect(isCaseId("person_x")).toBe(false);
  });
  it("3) rejeita string vazia", () => {
    expect(hasExpectedPrefix("", "case")).toBe(false);
    expect(isCaseId("")).toBe(false);
    expect(parseDomainId("")).toBeNull();
  });
  it("4) diferencia CaseId de PersonId", () => {
    expect(isCaseId("person_a")).toBe(false);
    expect(isPersonId("case_a")).toBe(false);
    expect(isCaseId("case_a")).toBe(true);
    expect(isPersonId("person_a")).toBe(true);
  });
  it("5) identifica o tipo pelo prefixo", () => {
    expect(parseDomainId("case_demo_001")?.kind).toBe("case");
    expect(parseDomainId("person_A")?.kind).toBe("person");
    expect(parseDomainId("assign_x")?.kind).toBe("assignment");
  });
  it("6) rejeita tipo desconhecido", () => {
    expect(parseDomainId("foo_abc")).toBeNull();
    expect(parseDomainId("case_")).toBeNull();
    expect(parseDomainId("case_ab$cd")).toBeNull();
  });
  it("prefixos são estáveis", () => {
    expect(ID_PREFIX.case).toBe("case_");
    expect(ID_PREFIX.person).toBe("person_");
    expect(ID_PREFIX.assignment).toBe("assign_");
  });
  it("buildDomainId aplica prefixo e rejeita sufixo inválido", () => {
    expect(buildDomainId("case", "abc")).toBe("case_abc");
    expect(() => buildDomainId("case", "")).toThrow();
    expect(() => buildDomainId("case", "in valid")).toThrow();
  });
});

// ---- Datas e metadados -----------------------------------------------------

describe("Datas e metadados", () => {
  it("7) aceita data ISO válida", () => {
    expect(isIsoDate("2026-08-05")).toBe(true);
  });
  it("8) rejeita data inválida", () => {
    expect(isIsoDate("2026-13-40")).toBe(false);
    expect(isIsoDate("08/05/2026")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });
  it("9) aceita datetime ISO válido", () => {
    expect(isIsoDateTime("2026-08-05T14:00:00.000Z")).toBe(true);
    expect(isIsoDateTime("2026-08-05T14:00:00Z")).toBe(true);
  });
  it("9b) rejeita datetime inválido", () => {
    expect(isIsoDateTime("2026-08-05")).toBe(false);
    expect(isIsoDateTime("not-a-date")).toBe(false);
  });
  it("10) rejeita versão zero, negativa ou decimal", () => {
    expect(isValidVersion(1)).toBe(true);
    expect(isValidVersion(0)).toBe(false);
    expect(isValidVersion(-1)).toBe(false);
    expect(isValidVersion(1.5)).toBe(false);
    expect(isValidVersion("1")).toBe(false);
  });
});

// ---- Caso ------------------------------------------------------------------

describe("Case", () => {
  it("11) aceita caso estruturalmente válido", () => {
    expect(isCase(F.case001Fixture)).toBe(true);
    expect(validateCase(F.case001Fixture).ok).toBe(true);
  });
  it("12) rejeita caso sem organizationId", () => {
    const { organizationId: _o, ...bad } = F.case001Fixture;
    expect(isCase(bad)).toBe(false);
    expect(validateCase(bad).ok).toBe(false);
  });
  it("13) rejeita status desconhecido", () => {
    expect(isCase({ ...F.case001Fixture, status: "unknown_status" })).toBe(false);
  });

  const emptyReadiness: CaseReadiness = {
    professionalRoleDefined: false,
    objectDefined: false,
    deadlineReviewed: false,
    confidentialityReviewed: false,
    conflictOfInterestReviewed: false,
  };
  const fullReadiness: CaseReadiness = {
    professionalRoleDefined: true,
    objectDefined: true,
    deadlineReviewed: true,
    confidentialityReviewed: true,
    conflictOfInterestReviewed: true,
  };

  it("14) impede saída de draft com triagem incompleta", () => {
    expect(canLeaveDraft(emptyReadiness)).toBe(false);
    expect(getCaseReadinessIssues(emptyReadiness).length).toBe(5);
  });
  it("15) permite saída quando todos os requisitos estão completos", () => {
    expect(canLeaveDraft(fullReadiness)).toBe(true);
    expect(getCaseReadinessIssues(fullReadiness).length).toBe(0);
  });
});

// ---- Organização e profissional -------------------------------------------

describe("Organization e ProfessionalProfile", () => {
  it("Organization válida passa", () => {
    expect(isOrganization(F.orgIndividualFixture)).toBe(true);
    expect(isOrganization(F.orgTeamFixture)).toBe(true);
  });
  it("Organization com kind inválido é rejeitada", () => {
    expect(isOrganization({ ...F.orgIndividualFixture, kind: "team" })).toBe(false);
    expect(isOrganization({ ...F.orgIndividualFixture, kind: "bogus" })).toBe(false);
  });
  it("23) aceita perfil profissional válido", () => {
    expect(isProfessionalProfile(F.professionalProfileFixture)).toBe(true);
  });
});

// ---- Pessoas e vínculos ----------------------------------------------------

describe("Pessoas e vínculos", () => {
  const ctx = { cases: F.DOMAIN_FIXTURES.cases, persons: F.DOMAIN_FIXTURES.persons };

  it("16) aceita pessoa válida", () => {
    expect(isPerson(F.personAFixture)).toBe(true);
  });
  it("17) aceita CasePerson válido", () => {
    const r = validateCasePerson(F.casePersonAFixture, ctx);
    expect(r.ok).toBe(true);
  });
  it("18) rejeita CasePerson com organização divergente", () => {
    const bad = { ...F.casePersonAFixture, organizationId: F.ORG_TEAM_ID };
    const r = validateCasePerson(bad, ctx);
    expect(r.ok).toBe(false);
  });
  it("19) rejeita pessoa inexistente", () => {
    const bad = { ...F.casePersonAFixture, personId: "person_ghost" as PersonId };
    const r = validateCasePerson(bad, ctx);
    expect(r.ok).toBe(false);
  });
  it("20) rejeita relação da pessoa consigo mesma", () => {
    const bad = { ...F.relationshipFixture, toPersonId: F.relationshipFixture.fromPersonId };
    expect(isRelationship(bad)).toBe(false);
    const r = validateRelationship(bad, ctx);
    expect(r.ok).toBe(false);
  });
  it("21) aceita relação entre pessoas distintas", () => {
    const r = validateRelationship(F.relationshipFixture, ctx);
    expect(r.ok).toBe(true);
  });
  it("22) rejeita criança sem restrição padrão", () => {
    const bad = { ...F.casePersonCFixture, restrictedByDefault: false };
    const r = validateCasePerson(bad, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("minor_must_be_restricted");
  });
});

// ---- Assignment ------------------------------------------------------------

describe("Assignment", () => {
  const ctx = {
    cases: F.DOMAIN_FIXTURES.cases,
    professionalProfiles: F.DOMAIN_FIXTURES.professionalProfiles,
  };
  it("24) aceita assignment válido", () => {
    expect(isAssignment(F.assignmentFixture)).toBe(true);
    expect(validateAssignment(F.assignmentFixture, ctx).ok).toBe(true);
  });
  it("25) rejeita assignment para caso inexistente", () => {
    const bad = { ...F.assignmentFixture, caseId: "case_ghost" as CaseId };
    expect(validateAssignment(bad, ctx).ok).toBe(false);
  });
  it("26) rejeita organização divergente", () => {
    const bad = { ...F.assignmentFixture, organizationId: F.ORG_TEAM_ID };
    expect(validateAssignment(bad, ctx).ok).toBe(false);
  });
});

// ---- Segurança estrutural (teste 27 substituído + adicionais) --------------

describe("Segurança estrutural — allow-list e chaves proibidas", () => {
  it("27a) rejeita caso válido + extraField", () => {
    const bad = { ...F.case001Fixture, extraField: "não permitido" };
    expect(validateCase(bad).ok).toBe(false);
    expect(isCase(bad)).toBe(false);
  });
  it("27b) rejeita pessoa válida + extraField", () => {
    const bad = { ...F.personAFixture, extraField: "x" };
    expect(validatePerson(bad).ok).toBe(false);
  });
  it("27c) rejeita organization válida + extraField", () => {
    const bad = { ...F.orgIndividualFixture, extraField: "x" };
    expect(validateOrganization(bad).ok).toBe(false);
  });
  it("27d) rejeita membership válido + extraField", () => {
    const bad = { ...F.membershipFixture, extraField: "x" };
    const r = validateMembership(bad, {
      users: F.DOMAIN_FIXTURES.users,
      organizations: F.DOMAIN_FIXTURES.organizations,
    });
    expect(r.ok).toBe(false);
  });
  it("27e) rejeita assignment válido + extraField", () => {
    const bad = { ...F.assignmentFixture, extraField: "x" };
    const r = validateAssignment(bad, {
      cases: F.DOMAIN_FIXTURES.cases,
      professionalProfiles: F.DOMAIN_FIXTURES.professionalProfiles,
    });
    expect(r.ok).toBe(false);
  });
  it("27f) rejeita metadata válido + extraField", () => {
    const bad = {
      ...F.case001Fixture,
      metadata: { ...F.case001Fixture.metadata, extraField: "x" },
    };
    expect(validateCase(bad).ok).toBe(false);
    expect(isEntityMetadata({ ...F.case001Fixture.metadata, extraField: "x" })).toBe(false);
  });

  it("28) rejeita campo password", () => {
    expect(containsForbiddenKey({ password: "x" })).toBe(true);
    const bad = { ...F.case001Fixture, password: "x" };
    expect(validateCase(bad).ok).toBe(false);
  });
  it("29) rejeita campo token e derivados", () => {
    expect(containsForbiddenKey({ token: "x" })).toBe(true);
    expect(containsForbiddenKey({ accessToken: "x" })).toBe(true);
    expect(containsForbiddenKey({ refreshToken: "x" })).toBe(true);
    expect(containsForbiddenKey({ apiKey: "x" })).toBe(true);
    expect(containsForbiddenKey({ senha: "x" })).toBe(true);
    expect(containsForbiddenKey({ secret: "x" })).toBe(true);
  });
  it("30) fixtures não contêm dados pessoais nem chaves proibidas", () => {
    const json = JSON.stringify(F.DOMAIN_FIXTURES);
    for (const banned of [
      /\d{3}\.\d{3}\.\d{3}-\d{2}/,
      /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/,
      /@[a-z0-9.-]+\.[a-z]{2,}/i,
      /\(\d{2}\)\s?\d{4,5}-\d{4}/,
    ]) {
      expect(banned.test(json)).toBe(false);
    }
    for (const coll of Object.values(F.DOMAIN_FIXTURES)) {
      for (const item of coll) {
        expect(containsForbiddenKey(item)).toBe(false);
      }
    }
  });

  // -- Novos testes obrigatórios --

  it("17-novo) token aninhado em metadata é detectado", () => {
    expect(containsForbiddenKey({ metadata: { token: "x" } })).toBe(true);
    const bad = {
      ...F.case001Fixture,
      metadata: { ...F.case001Fixture.metadata, token: "x" } as unknown,
    };
    expect(validateCase(bad).ok).toBe(false);
  });
  it("18-novo) senha dentro de array é detectada", () => {
    expect(containsForbiddenKey({ items: [{ password: "x" }] })).toBe(true);
    expect(containsForbiddenKey([{ password: "x" }])).toBe(true);
  });
  it("19-novo) objeto circular não causa loop infinito", () => {
    const a: Record<string, unknown> = { name: "root" };
    a.self = a;
    expect(containsForbiddenKey(a)).toBe(false);
    // com chave proibida em ramo que retorna à raiz
    const b: Record<string, unknown> = { token: "x" };
    b.self = b;
    expect(containsForbiddenKey(b)).toBe(true);
  });
});

// ---- User e Membership -----------------------------------------------------

describe("User", () => {
  it("N1) User válido", () => {
    expect(isUser(F.userFixture)).toBe(true);
    expect(validateUser(F.userFixture).ok).toBe(true);
  });
  it("N2) User com campo desconhecido é rejeitado", () => {
    expect(isUser({ ...F.userFixture, email: "x@x" })).toBe(false);
    expect(validateUser({ ...F.userFixture, extraField: "x" }).ok).toBe(false);
  });
  it("N3) User com chave proibida é rejeitado", () => {
    expect(validateUser({ ...F.userFixture, password: "x" } as unknown).ok).toBe(false);
    expect(validateUser({ ...F.userFixture, token: "x" } as unknown).ok).toBe(false);
  });
});

describe("Membership", () => {
  const ctx = {
    users: F.DOMAIN_FIXTURES.users,
    organizations: F.DOMAIN_FIXTURES.organizations,
  };
  it("N4) Membership válido", () => {
    expect(isMembership(F.membershipFixture)).toBe(true);
    expect(validateMembership(F.membershipFixture, ctx).ok).toBe(true);
  });
  it("N5) usuário inexistente", () => {
    const bad = { ...F.membershipFixture, userId: "usr_ghost" as UserId };
    const r = validateMembership(bad, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("user_not_found");
  });
  it("N6) organização inexistente", () => {
    const bad = { ...F.membershipFixture, organizationId: "org_ghost" as OrganizationId };
    const r = validateMembership(bad, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("organization_not_found");
  });
  it("N7) papel inválido", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bad = { ...F.membershipFixture, role: "chefe" as any };
    expect(isMembership(bad)).toBe(false);
    expect(validateMembership(bad, ctx).ok).toBe(false);
  });
  it("N8) Membership com campo desconhecido", () => {
    const bad = { ...F.membershipFixture, extraField: "x" };
    expect(validateMembership(bad, ctx).ok).toBe(false);
  });
});

// ---- Enums compartilhados --------------------------------------------------

describe("Enums compartilhados (sem duplicação)", () => {
  it("N9) Organization.kind usa WorkMode", () => {
    expect(F.orgIndividualFixture.kind).toBe("individual");
    expect(F.orgTeamFixture.kind).toBe("equipe");
    // Tipo compile-time: WorkMode aceita esses valores.
    const kinds: WorkMode[] = ["individual", "equipe", "institucional"];
    expect(kinds.every((k) => WORK_MODES.includes(k))).toBe(true);
  });
  it("N10) ProfessionalProfile.area usa Perfil", () => {
    expect(F.professionalProfileFixture.area).toBe("psicologia");
    const areas: Perfil[] = ["psicologia", "servico-social", "multi", "outro"];
    expect(areas.every((a) => PERFIS.includes(a))).toBe(true);
  });
  it("N11) não há arrays duplicados de enum — aliases apontam para os mesmos", () => {
    expect(ORGANIZATION_KINDS).toBe(WORK_MODES);
    expect(PROFESSIONAL_AREAS).toBe(PERFIS);
    // Também: tipos alias satisfazem os originais.
    const k: OrganizationKind = "individual";
    const w: WorkMode = k;
    expect(w).toBe("individual");
    const a: ProfessionalArea = "psicologia";
    const p: Perfil = a;
    expect(p).toBe("psicologia");
  });
});

// ---- Credential ------------------------------------------------------------

describe("Credential", () => {
  const ctx = { professionalProfiles: F.DOMAIN_FIXTURES.professionalProfiles };
  it("N12) Credential válida", () => {
    expect(isCredential(F.credentialFixture)).toBe(true);
    expect(validateCredential(F.credentialFixture, ctx).ok).toBe(true);
  });
  it("N13) credential com organização divergente é rejeitada", () => {
    const bad = { ...F.credentialFixture, organizationId: F.ORG_TEAM_ID };
    const r = validateCredential(bad, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("organization_mismatch");
  });
  it("credential com perfil inexistente é rejeitada", () => {
    const bad = {
      ...F.credentialFixture,
      professionalProfileId: buildDomainId("professionalProfile", "ghost"),
    };
    const r = validateCredential(bad, ctx);
    expect(r.ok).toBe(false);
  });
});

// ---- Builder tipado --------------------------------------------------------

describe("buildDomainId tipado", () => {
  it("N20) retorna branded types para tipos implementados", () => {
    const orgId = buildDomainId("organization", "x");
    const caseId = buildDomainId("case", "x");
    const personId = buildDomainId("person", "x");
    // Verificações de runtime — o tipo é verificado em compile-time.
    expect(orgId).toBe("org_x");
    expect(caseId).toBe("case_x");
    expect(personId).toBe("person_x");
    // Usa os retornos onde os branded types são esperados:
    const acceptsOrg = (_id: OrganizationId) => _id;
    const acceptsCase = (_id: CaseId) => _id;
    const acceptsPerson = (_id: PersonId) => _id;
    expect(acceptsOrg(orgId)).toBeDefined();
    expect(acceptsCase(caseId)).toBeDefined();
    expect(acceptsPerson(personId)).toBeDefined();
  });
});

// ---- Não uso de tipos como `never` ----------------------------------------

describe("IDs de tipos reservados", () => {
  it("reservados retornam string neutra sem branded type específico", () => {
    const dl = buildDomainId("deadline", "x");
    expect(dl).toBe("deadline_x");
  });
});

// Compile-time helpers — usados apenas para provar tipagem via `satisfies`.
type _UserIdOk = UserId extends string ? true : false;
type _MembershipIdOk = MembershipId extends string ? true : false;
const _typeChecks: [_UserIdOk, _MembershipIdOk] = [true, true];
void _typeChecks;
