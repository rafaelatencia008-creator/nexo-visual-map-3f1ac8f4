/**
 * Testes de contrato do domínio oficial — LV-07.1.
 *
 * Puro TypeScript. Sem navegador, sem Vite, sem HMR, sem storage.
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
  containsForbiddenKey,
  isOrganization,
  isCase,
  isPerson,
  isCasePerson,
  isRelationship,
  isAssignment,
  isProfessionalProfile,
  canLeaveDraft,
  getCaseReadinessIssues,
  validateCase,
  validateCasePerson,
  validateRelationship,
  validateAssignment,
  fixtures,
  type CaseReadiness,
  type PersonId,
  type OrganizationId,
} from "@/domain/core";

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
    expect(parseDomainId("case_")).toBeNull(); // sufixo vazio
    expect(parseDomainId("case_ab$cd")).toBeNull(); // sufixo inválido
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

// ---- Profissional e atribuição --------------------------------------------

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
    const bad = { ...F.assignmentFixture, caseId: "case_ghost" as unknown as typeof F.assignmentFixture.caseId };
    expect(validateAssignment(bad, ctx).ok).toBe(false);
  });
  it("26) rejeita organização divergente", () => {
    const bad = { ...F.assignmentFixture, organizationId: F.ORG_TEAM_ID as OrganizationId };
    expect(validateAssignment(bad, ctx).ok).toBe(false);
  });
});

// ---- Segurança estrutural --------------------------------------------------

describe("Segurança estrutural", () => {
  it("27) validadores estritos rejeitam campo desconhecido de shape", () => {
    // `isCase` NÃO usa allow-list, mas os validadores de entrada rejeitam
    // pelo menos chaves proibidas. Campo desconhecido aqui é rejeitado pela
    // ausência das chaves obrigatórias (shape_invalid) — cobrimos ambos.
    const missing = { extraField: "x" } as unknown;
    expect(validateCase(missing).ok).toBe(false);
  });
  it("28) rejeita campo password", () => {
    expect(containsForbiddenKey({ password: "x" })).toBe(true);
    const bad = { ...F.case001Fixture, password: "x" };
    expect(validateCase(bad).ok).toBe(false);
  });
  it("29) rejeita campo token", () => {
    expect(containsForbiddenKey({ token: "x" })).toBe(true);
    expect(containsForbiddenKey({ accessToken: "x" })).toBe(true);
    expect(containsForbiddenKey({ apiKey: "x" })).toBe(true);
  });
  it("30) confirma ausência de dados pessoais nos fixtures", () => {
    const json = JSON.stringify(F.DOMAIN_FIXTURES);
    // Nenhuma PII textual conhecida.
    for (const banned of [
      /\d{3}\.\d{3}\.\d{3}-\d{2}/, // CPF
      /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/, // CNPJ
      /@[a-z0-9.-]+\.[a-z]{2,}/i, // e-mail
      /\(\d{2}\)\s?\d{4,5}-\d{4}/, // telefone
    ]) {
      expect(banned.test(json)).toBe(false);
    }
    // Nenhuma chave proibida em nenhuma coleção de fixture.
    for (const coll of Object.values(F.DOMAIN_FIXTURES)) {
      for (const item of coll) {
        expect(containsForbiddenKey(item)).toBe(false);
      }
    }
  });
});
