/**
 * Testes de contrato da camada de serviços — LV-07.2.
 * Nada aqui exporta implementação para o app. Fakes são LOCAIS.
 */

import { describe, it, expect } from "bun:test";
import {
  buildDomainId,
  fixtures,
  type Case,
  type CaseId,
  type CasePersonId,
  type Membership,
  type MembershipId,
  type Organization,
  type Person,
  type PersonId,
  type ProfessionalProfileId,
  type RelationshipId,
  type AssignmentId,
  type CredentialId,
  type User,
  type ProfessionalProfile,
  type Credential,
  type CasePerson,
  type Relationship,
  type Assignment,
} from "@/domain/core";
import {
  isServiceContext,
  isServiceSuccess,
  isServiceFailure,
  serviceOk,
  serviceFailure,
  validatePageRequest,
  isSortDirection,
  isPermissionAction,
  isPermissionRequest,
  PERMISSION_ACTIONS,
  PERMISSION_REQUEST_ALLOWED_KEYS,
  PAGE_REQUEST_ALLOWED_KEYS,
  SERVICE_ERROR_CODES,
  SORT_DIRECTIONS,
  PAGE_LIMIT_MAX,
  CASE_SORT_FIELDS,
  CASE_READINESS_ISSUES,
  type ServiceContext,
  type ServiceResult,
  type ServiceError,
  type PermissionPolicy,
  type PermissionDecision,
  type OrganizationService,
  type MembershipService,
  type ProfessionalProfileService,
  type CredentialService,
  type CaseService,
  type PersonService,
  type CasePersonService,
  type RelationshipService,
  type AssignmentService,
  type CreateCaseInput,
  type UpdateCaseInput,
  type CreateCasePersonInput,
  type CreateAssignmentInput,
  type CaseListRequest,
  type CaseReadinessIssue,
} from "@/domain/services";
import type { CaseReadiness } from "@/domain/core";
import * as servicesBarrel from "@/domain/services";

const F = fixtures;

const CTX: ServiceContext = {
  organizationId: F.ORG_INDIVIDUAL_ID,
  userId: F.USER_ID,
  membershipId: F.MEMBERSHIP_ID,
  role: "proprietario",
};

const GHOST_CASE_ID = buildDomainId("case", "ghost");
const GHOST_MEMBERSHIP_ID = buildDomainId("membership", "ghost");

// =========================================================================
// Contexto
// =========================================================================

describe("ServiceContext", () => {
  it("S1) contexto válido", () => {
    expect(isServiceContext(CTX)).toBe(true);
  });
  it("S2) rejeita ausência de organizationId", () => {
    const { organizationId: _o, ...bad } = CTX;
    expect(isServiceContext(bad)).toBe(false);
  });
  it("S3) rejeita ausência de membershipId", () => {
    const { membershipId: _m, ...bad } = CTX;
    expect(isServiceContext(bad)).toBe(false);
  });
  it("S4) rejeita papel inválido", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isServiceContext({ ...CTX, role: "chefe" as any })).toBe(false);
  });
  it("S5) rejeita campo desconhecido", () => {
    expect(isServiceContext({ ...CTX, extraField: "x" })).toBe(false);
  });
  it("S6) rejeita chave proibida aninhada", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bad: any = { ...CTX, wrapper: { token: "x" } };
    expect(isServiceContext(bad)).toBe(false);
  });
});

// =========================================================================
// Resultados e erros
// =========================================================================

describe("ServiceResult", () => {
  it("S7) serviceOk cria sucesso", () => {
    const r = serviceOk(42);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBe(42);
    expect(isServiceSuccess(r)).toBe(true);
  });
  it("S8) cada categoria de falha é representável", () => {
    for (const code of SERVICE_ERROR_CODES) {
      const err: ServiceError = { code, message: `err_${code}` } as ServiceError;
      const r = serviceFailure<number>(err);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe(code);
    }
  });
  it("S9) narrowing por ok", () => {
    const r: ServiceResult<string> = serviceOk("x");
    if (isServiceSuccess(r)) {
      const s: string = r.data;
      expect(s).toBe("x");
    } else {
      throw new Error("branch impossível");
    }
  });
  it("S10) helpers de sucesso e falha", () => {
    const s = serviceOk(1);
    const f: ServiceResult<number> = serviceFailure({
      code: "not_found",
      message: "x",
    });
    expect(isServiceSuccess(s)).toBe(true);
    expect(isServiceFailure(s)).toBe(false);
    expect(isServiceSuccess(f)).toBe(false);
    expect(isServiceFailure(f)).toBe(true);
  });
  it("S11) ServiceError não expõe Error, stack, cause ou payload bruto", () => {
    // Test estrutural: nenhuma chave desses nomes aparece nas variantes.
    const forbidden = ["stack", "cause", "raw", "sql", "response", "toString"];
    const samples: ServiceError[] = [
      { code: "validation_error", message: "x" },
      { code: "not_found", message: "x" },
      { code: "forbidden", message: "x" },
      { code: "unauthorized", message: "x" },
      { code: "conflict", message: "x", expectedVersion: 1, actualVersion: 2 },
      { code: "offline", message: "x" },
      { code: "unavailable", message: "x", retryAfterMs: 1000 },
      { code: "internal_error", message: "x" },
    ];
    for (const err of samples) {
      const keys = Object.keys(err);
      for (const k of forbidden) expect(keys.includes(k)).toBe(false);
      // e não deve haver campo Error nativo
      expect((err as unknown) instanceof Error).toBe(false);
    }
  });
  it("S12) fieldErrors só existe em validation_error", () => {
    const v: ServiceError = {
      code: "validation_error",
      message: "x",
      fieldErrors: { title: ["required"] },
    };
    expect(v.code).toBe("validation_error");
    // @ts-expect-error — fieldErrors não existe em not_found
    const _bad: ServiceError = { code: "not_found", message: "x", fieldErrors: {} };
    void _bad;
  });
  it("S13) conflito carrega expectedVersion e actualVersion", () => {
    const c: ServiceError = {
      code: "conflict",
      message: "x",
      expectedVersion: 1,
      actualVersion: 2,
    };
    if (c.code === "conflict") {
      expect(c.expectedVersion).toBe(1);
      expect(c.actualVersion).toBe(2);
    }
  });
});

// =========================================================================
// Paginação
// =========================================================================

describe("PageRequest / PageResult", () => {
  it("S14) limite 1 é aceito", () => {
    expect(validatePageRequest({ limit: 1 }).ok).toBe(true);
  });
  it("S15) limite 100 é aceito", () => {
    expect(validatePageRequest({ limit: PAGE_LIMIT_MAX }).ok).toBe(true);
  });
  it("S16) limite 0 é rejeitado", () => {
    expect(validatePageRequest({ limit: 0 }).ok).toBe(false);
  });
  it("S17) limite 101 é rejeitado", () => {
    expect(validatePageRequest({ limit: 101 }).ok).toBe(false);
  });
  it("S18) cursor vazio é rejeitado", () => {
    const r = validatePageRequest({ limit: 20, cursor: "" });
    expect(r.ok).toBe(false);
  });
  it("S19) cursor opaco é aceito", () => {
    const r = validatePageRequest({ limit: 20, cursor: "opaque-token" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.cursor).toBe("opaque-token");
  });
  it("S20) PageResult items é readonly em tipo", () => {
    const items: readonly number[] = [1, 2, 3];
    const pr = { items, nextCursor: undefined, total: 3 } as const;
    expect(pr.items.length).toBe(3);
    // @ts-expect-error — readonly array não aceita push
    (pr.items as readonly number[]).push?.(4);
    void pr;
    expect(SORT_DIRECTIONS.includes("asc")).toBe(true);
    expect(isSortDirection("desc")).toBe(true);
    expect(isSortDirection("qualquer")).toBe(false);
  });
});

// =========================================================================
// Permissões
// =========================================================================

describe("Permissões", () => {
  it("S21) catálogo sem duplicatas", () => {
    expect(new Set(PERMISSION_ACTIONS).size).toBe(PERMISSION_ACTIONS.length);
  });
  it("S22) ações mínimas presentes", () => {
    const required = [
      "organization.read",
      "organization.update",
      "membership.list",
      "case.list",
      "case.create",
      "case.changeStatus",
      "case.archive",
      "assignment.create",
      "assignment.changeStatus",
      "person.list",
      "casePerson.create",
      "relationship.create",
    ];
    for (const a of required) {
      expect((PERMISSION_ACTIONS as readonly string[]).includes(a)).toBe(true);
    }
  });
  it("S23) ação inválida rejeitada", () => {
    expect(isPermissionAction("case.explode")).toBe(false);
    expect(isPermissionAction("")).toBe(false);
  });
  it("S24) isPermissionRequest valida em runtime", () => {
    // Verificações de tipo estão em tests/domain-services.types.ts. Aqui
    // validamos o guard em runtime.
    expect(isPermissionRequest({ action: "case.read", caseId: F.CASE_001_ID })).toBe(true);
    expect(isPermissionRequest({ action: "invalid.action" })).toBe(false);
    expect(isPermissionRequest({ action: "case.read", caseId: "not_branded" })).toBe(false);
    expect(isPermissionRequest({ action: "case.read", extraField: "x" })).toBe(false);
    expect(isPermissionRequest({ action: "case.read", resourceId: "" })).toBe(false);
    expect(isPermissionRequest({ action: "case.read", resourceId: "res_1" })).toBe(true);
    expect(isPermissionRequest(null)).toBe(false);
    expect(isPermissionRequest([])).toBe(false);
    expect(isPermissionRequest({ action: "case.read", nested: { token: "x" } })).toBe(false);
    // allow-list exposta
    expect(PERMISSION_REQUEST_ALLOWED_KEYS.has("action")).toBe(true);
    expect(PERMISSION_REQUEST_ALLOWED_KEYS.has("caseId")).toBe(true);
    expect(PERMISSION_REQUEST_ALLOWED_KEYS.has("resourceId")).toBe(true);
    expect(PERMISSION_REQUEST_ALLOWED_KEYS.size).toBe(3);
  });
  it("S25) fake local de PermissionPolicy retorna decisão", async () => {
    const policy: PermissionPolicy = {
      async evaluate(_ctx, req): Promise<ServiceResult<PermissionDecision>> {
        if (req.action === "case.archive") {
          return serviceOk({ allowed: false, reason: "not_owner" });
        }
        return serviceOk({ allowed: true });
      },
    };
    const ok = await policy.evaluate(CTX, { action: "case.read" });
    expect(isServiceSuccess(ok)).toBe(true);
    if (ok.ok) expect(ok.data.allowed).toBe(true);
    const deny = await policy.evaluate(CTX, { action: "case.archive" });
    if (deny.ok) expect(deny.data.allowed).toBe(false);
  });
  it("S26) negação vem como resultado, não como throw", async () => {
    const policy: PermissionPolicy = {
      async evaluate() {
        return serviceFailure<PermissionDecision>({
          code: "forbidden",
          message: "denied",
        });
      },
    };
    const r = await policy.evaluate(CTX, { action: "case.read" });
    expect(isServiceFailure(r)).toBe(true);
    if (!r.ok) expect(r.error.code).toBe("forbidden");
  });
});

// =========================================================================
// DTOs
// =========================================================================

describe("DTOs", () => {
  it("S27) CreateCaseInput não tem id", () => {
    const dto: CreateCaseInput = {
      reference: "REF-1",
      title: "T",
      confidentiality: "standard",
    };
    expect("id" in dto).toBe(false);
  });
  it("S28) CreateCaseInput não tem organizationId", () => {
    const dto: CreateCaseInput = {
      reference: "REF",
      title: "T",
      confidentiality: "standard",
    };
    expect("organizationId" in dto).toBe(false);
    // @ts-expect-error — organizationId proibido no DTO
    const _bad: CreateCaseInput = {
      reference: "R",
      title: "T",
      confidentiality: "standard",
      organizationId: F.ORG_INDIVIDUAL_ID,
    };
    void _bad;
  });
  it("S29) CreateCaseInput não tem metadata", () => {
    const dto: CreateCaseInput = {
      reference: "R",
      title: "T",
      confidentiality: "standard",
    };
    expect("metadata" in dto).toBe(false);
    // @ts-expect-error — metadata proibido no DTO
    const _bad: CreateCaseInput = {
      reference: "R",
      title: "T",
      confidentiality: "standard",
      metadata: F.case001Fixture.metadata,
    };
    void _bad;
  });
  it("S30) UpdateCaseInput exige expectedVersion", () => {
    const dto: UpdateCaseInput = { title: "novo", expectedVersion: 3 };
    expect(dto.expectedVersion).toBe(3);
    // @ts-expect-error — expectedVersion é obrigatório
    const _bad: UpdateCaseInput = { title: "x" };
    void _bad;
  });
  it("S31) CreateCasePersonInput usa branded IDs", () => {
    const dto: CreateCasePersonInput = {
      caseId: F.CASE_001_ID,
      personId: F.PERSON_A_ID,
      role: "evaluated_person",
      restrictedByDefault: false,
    };
    expect(dto.caseId.startsWith("case_")).toBe(true);
    // @ts-expect-error — string livre rejeitada
    const _bad: CreateCasePersonInput = {
      caseId: "not_branded" as string,
      personId: F.PERSON_A_ID,
      role: "evaluated_person",
      restrictedByDefault: false,
    };
    void _bad;
  });
  it("S32) CreateAssignmentInput usa branded IDs e não aceita organizationId", () => {
    const dto: CreateAssignmentInput = {
      caseId: F.CASE_001_ID,
      professionalProfileId: F.PROF_ID,
      role: "lead_professional",
      startedOn: F.case001Fixture.metadata.createdAt.slice(0, 10) as unknown as import("@/domain/core").IsoDate,
    };
    expect(dto.role).toBe("lead_professional");
    // @ts-expect-error — organizationId proibido
    const _bad: CreateAssignmentInput = {
      caseId: F.CASE_001_ID,
      professionalProfileId: F.PROF_ID,
      role: "lead_professional",
      startedOn: dto.startedOn,
      organizationId: F.ORG_INDIVIDUAL_ID,
    };
    void _bad;
  });
  it("S33) DTOs não têm chaves de autenticação", () => {
    const dto = {
      reference: "R",
      title: "T",
      confidentiality: "standard" as const,
    } satisfies CreateCaseInput;
    // @ts-expect-error — token é chave proibida no domínio
    const _bad: CreateCaseInput = { ...dto, token: "x" };
    void _bad;
    // @ts-expect-error — password é chave proibida no domínio
    const _bad2: CreateCaseInput = { ...dto, password: "x" };
    void _bad2;
  });
});

// =========================================================================
// Fakes locais — provam que as interfaces são implementáveis
// =========================================================================

function conflict<T>(actual: number, expected: number): ServiceResult<T> {
  return serviceFailure<T>({
    code: "conflict",
    message: "version_mismatch",
    expectedVersion: expected,
    actualVersion: actual,
  });
}

function notFound<T>(resource: string): ServiceResult<T> {
  return serviceFailure<T>({ code: "not_found", message: resource, resource });
}

function forbidden<T>(): ServiceResult<T> {
  return serviceFailure<T>({ code: "forbidden", message: "denied" });
}

const FakeOrgService: OrganizationService = {
  async getCurrent(ctx) {
    if (ctx.organizationId !== F.ORG_INDIVIDUAL_ID) return notFound<Organization>("organization");
    return serviceOk(F.orgIndividualFixture);
  },
  async update(_ctx, input) {
    if (input.expectedVersion !== 1) return conflict<Organization>(1, input.expectedVersion);
    return serviceOk(F.orgIndividualFixture);
  },
};

const FakeMembershipService: MembershipService = {
  async getById(_ctx, id) {
    if (id !== F.MEMBERSHIP_ID) return notFound<Membership>("membership");
    return serviceOk(F.membershipFixture);
  },
  async list(_ctx, _req) {
    return serviceOk({ items: [F.membershipFixture] as readonly Membership[] });
  },
  async create(_ctx, _input) {
    return serviceOk(F.membershipFixture);
  },
  async changeRole(_ctx, input) {
    if (input.expectedVersion !== 1) return conflict<Membership>(1, input.expectedVersion);
    return serviceOk(F.membershipFixture);
  },
  async changeStatus(_ctx, input) {
    if (input.expectedVersion !== 1) return conflict<Membership>(1, input.expectedVersion);
    return serviceOk(F.membershipFixture);
  },
  async revoke(_ctx, input) {
    if (input.membershipId !== F.MEMBERSHIP_ID) return forbidden<Membership>();
    if (input.expectedVersion !== 1) return conflict<Membership>(1, input.expectedVersion);
    return serviceOk(F.membershipFixture);
  },
};

const FakeProfService: ProfessionalProfileService = {
  async getById(_ctx, _id) {
    return serviceOk(F.professionalProfileFixture);
  },
  async list(_ctx, _req) {
    return serviceOk({
      items: [F.professionalProfileFixture] as readonly ProfessionalProfile[],
    });
  },
  async create(_ctx, _input) {
    return serviceOk(F.professionalProfileFixture);
  },
  async update(_ctx, _id, input) {
    if (input.expectedVersion !== 1) return conflict<ProfessionalProfile>(1, input.expectedVersion);
    return serviceOk(F.professionalProfileFixture);
  },
  async changeStatus(_ctx, input) {
    if (input.expectedVersion !== 1) return conflict<ProfessionalProfile>(1, input.expectedVersion);
    return serviceOk(F.professionalProfileFixture);
  },
};

const FakeCredService: CredentialService = {
  async getById(_ctx, _id) {
    return serviceOk(F.credentialFixture);
  },
  async listByProfessionalProfile(_ctx, _pid, _page) {
    return serviceOk({ items: [F.credentialFixture] as readonly Credential[] });
  },
  async create(_ctx, _input) {
    return serviceOk(F.credentialFixture);
  },
  async updateStatus(_ctx, input) {
    if (input.expectedVersion !== 1) return conflict<Credential>(1, input.expectedVersion);
    return serviceOk(F.credentialFixture);
  },
};

const FakeCaseService: CaseService = {
  async getById(_ctx, id) {
    if (id !== F.CASE_001_ID) return notFound<Case>("case");
    return serviceOk(F.case001Fixture);
  },
  async list(_ctx, _req) {
    return serviceOk({ items: [F.case001Fixture] as readonly Case[] });
  },
  async create(_ctx, _input) {
    return serviceOk(F.case001Fixture);
  },
  async update(_ctx, _id, input) {
    if (input.expectedVersion !== 1) return conflict<Case>(1, input.expectedVersion);
    return serviceOk(F.case001Fixture);
  },
  async changeStatus(_ctx, input) {
    if (input.expectedVersion !== 1) return conflict<Case>(1, input.expectedVersion);
    return serviceOk(F.case001Fixture);
  },
  async archive(_ctx, _id, expectedVersion) {
    if (expectedVersion !== 1) return conflict<Case>(1, expectedVersion);
    return serviceOk(F.case001Fixture);
  },
  async getReadiness(_ctx, id) {
    if (id !== F.CASE_001_ID) return notFound("case");
    return serviceOk({
      readiness: {
        professionalRoleDefined: true,
        objectDefined: true,
        deadlineReviewed: true,
        confidentialityReviewed: true,
        conflictOfInterestReviewed: true,
      },
      issues: [] as readonly string[],
    });
  },
};

const FakePersonService: PersonService = {
  async getById(_ctx, _id) {
    return serviceOk(F.personAFixture);
  },
  async list(_ctx, _req) {
    return serviceOk({ items: [F.personAFixture] as readonly Person[] });
  },
  async create(_ctx, _input) {
    return serviceOk(F.personAFixture);
  },
  async update(_ctx, _id, input) {
    if (input.expectedVersion !== 1) return conflict<Person>(1, input.expectedVersion);
    return serviceOk(F.personAFixture);
  },
};

const FakeCasePersonService: CasePersonService = {
  async getById(_ctx, _caseId, _id) {
    return serviceOk(F.casePersonAFixture);
  },
  async listByCase(_ctx, _caseId, _page) {
    return serviceOk({ items: [F.casePersonAFixture] as readonly CasePerson[] });
  },
  async create(_ctx, _input) {
    return serviceOk(F.casePersonAFixture);
  },
  async update(_ctx, _caseId, input) {
    if (input.expectedVersion !== 1) return conflict<CasePerson>(1, input.expectedVersion);
    return serviceOk(F.casePersonAFixture);
  },
  async remove(_ctx, _caseId, _id, expectedVersion) {
    if (expectedVersion !== 1) return conflict<CasePerson>(1, expectedVersion);
    return serviceOk(F.casePersonAFixture);
  },
};

const FakeRelService: RelationshipService = {
  async getById(_ctx, _caseId, _id) {
    return serviceOk(F.relationshipFixture);
  },
  async listByCase(_ctx, _caseId, _page) {
    return serviceOk({ items: [F.relationshipFixture] as readonly Relationship[] });
  },
  async create(_ctx, _input) {
    return serviceOk(F.relationshipFixture);
  },
  async update(_ctx, _caseId, input) {
    if (input.expectedVersion !== 1) return conflict<Relationship>(1, input.expectedVersion);
    return serviceOk(F.relationshipFixture);
  },
  async remove(_ctx, _caseId, _id, expectedVersion) {
    if (expectedVersion !== 1) return conflict<Relationship>(1, expectedVersion);
    return serviceOk(F.relationshipFixture);
  },
};

const FakeAssignmentService: AssignmentService = {
  async getById(_ctx, _caseId, _id) {
    return serviceOk(F.assignmentFixture);
  },
  async listByCase(_ctx, _caseId, _page) {
    return serviceOk({ items: [F.assignmentFixture] as readonly Assignment[] });
  },
  async create(_ctx, _input) {
    return serviceOk(F.assignmentFixture);
  },
  async update(_ctx, _caseId, input) {
    if (input.expectedVersion !== 1) return conflict<Assignment>(1, input.expectedVersion);
    return serviceOk(F.assignmentFixture);
  },
  async changeStatus(_ctx, caseId, input) {
    if (caseId !== F.CASE_001_ID) return notFound<Assignment>("case");
    if (input.expectedVersion !== 1) return conflict<Assignment>(1, input.expectedVersion);
    return serviceOk(F.assignmentFixture);
  },
};

// =========================================================================
// Interfaces — comportamento observado dos fakes
// =========================================================================

describe("Fakes locais e conformidade das interfaces", () => {
  it("S34) OrganizationService implementável", async () => {
    const r = await FakeOrgService.getCurrent(CTX);
    expect(r.ok).toBe(true);
  });
  it("S35) MembershipService implementável", async () => {
    const r = await FakeMembershipService.list(CTX, { page: { limit: 10 } });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.items.length).toBeGreaterThan(0);
  });
  it("S36) ProfessionalProfileService implementável", async () => {
    const r = await FakeProfService.getById(CTX, F.PROF_ID);
    expect(r.ok).toBe(true);
  });
  it("S37) CredentialService implementável", async () => {
    const r = await FakeCredService.listByProfessionalProfile(CTX, F.PROF_ID, { limit: 10 });
    expect(r.ok).toBe(true);
  });
  it("S38) CaseService implementável", async () => {
    const req: CaseListRequest = {
      filter: { statuses: ["draft", "active"] },
      page: { limit: 20 },
      sortBy: "updatedAt",
      sortDir: "desc",
    };
    const r = await FakeCaseService.list(CTX, req);
    expect(r.ok).toBe(true);
  });
  it("S39) PersonService implementável", async () => {
    const r = await FakePersonService.list(CTX, { page: { limit: 5 } });
    expect(r.ok).toBe(true);
  });
  it("S40) CasePersonService implementável", async () => {
    const r = await FakeCasePersonService.listByCase(CTX, F.CASE_001_ID, { limit: 5 });
    expect(r.ok).toBe(true);
  });
  it("S41) RelationshipService implementável", async () => {
    const r = await FakeRelService.listByCase(CTX, F.CASE_001_ID, { limit: 5 });
    expect(r.ok).toBe(true);
  });
  it("S42) AssignmentService implementável", async () => {
    const r = await FakeAssignmentService.listByCase(CTX, F.CASE_001_ID, { limit: 5 });
    expect(r.ok).toBe(true);
  });

  it("S43) todos os métodos recebem contexto (assinaturas testadas em compile-time)", async () => {
    // A ausência de sobrecarga sem contexto é garantida pelo compilador. Aqui
    // apenas provamos que a chamada correta funciona.
    const r = await FakeCaseService.getById(CTX, F.CASE_001_ID);
    expect(r.ok).toBe(true);
    // @ts-expect-error — falta contexto
    void FakeCaseService.getById(F.CASE_001_ID);
  });

  it("S44) métodos de caso recebem CaseId", async () => {
    const r = await FakeCasePersonService.listByCase(CTX, F.CASE_001_ID, { limit: 5 });
    expect(r.ok).toBe(true);
    // @ts-expect-error — string livre no lugar de CaseId
    void FakeCasePersonService.listByCase(CTX, "case_not_branded", { limit: 5 });
  });

  it("S45) retornos usam Promise<ServiceResult<T>>", async () => {
    const promise = FakeCaseService.getById(CTX, F.CASE_001_ID);
    expect(promise instanceof Promise).toBe(true);
    const r = await promise;
    expect("ok" in r).toBe(true);
  });

  it("S46) não encontrado não usa null", async () => {
    const r = await FakeCaseService.getById(CTX, GHOST_CASE_ID);
    expect(r.ok).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((r as any).data).toBeUndefined();
    if (!r.ok) expect(r.error.code).toBe("not_found");
  });

  it("S47) permissão negada não lança exceção", async () => {
    const r = await FakeMembershipService.revoke(CTX, GHOST_MEMBERSHIP_ID);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("forbidden");
  });

  it("S48) conflito retorna code=conflict com versões", async () => {
    const r = await FakeCaseService.update(CTX, F.CASE_001_ID, {
      title: "novo",
      expectedVersion: 99,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("conflict");
      if (r.error.code === "conflict") {
        expect(r.error.expectedVersion).toBe(99);
        expect(r.error.actualVersion).toBe(1);
      }
    }
  });

  it("S49) filtros aceitam somente valores catalogados", () => {
    // @ts-expect-error — status inexistente
    const _bad: CaseListRequest = {
      filter: { statuses: ["not_a_status"] },
      page: { limit: 10 },
    };
    void _bad;
    // sortBy limitado a CASE_SORT_FIELDS
    // @ts-expect-error — sortBy livre proibido
    const _bad2: CaseListRequest = { page: { limit: 10 }, sortBy: "anything" };
    void _bad2;
    expect(CASE_SORT_FIELDS.includes("updatedAt")).toBe(true);
  });

  it("S50) barrel não exporta implementação, mocks ou estado", () => {
    const keys = Object.keys(servicesBarrel);
    for (const k of keys) {
      const forbiddenNames =
        /^(InMemory|Mock|Fake|Stub|.*Store|.*Database|.*Data|.*Repository|.*Repo)$/;
      expect(forbiddenNames.test(k)).toBe(false);
    }
    // Precisa exportar pelo menos os contratos-chave como valores/funções
    expect(typeof servicesBarrel.serviceOk).toBe("function");
    expect(typeof servicesBarrel.isServiceContext).toBe("function");
    expect(Array.isArray(servicesBarrel.PERMISSION_ACTIONS)).toBe(true);
  });
});

// =========================================================================
// Compile-time — IDs branded exigidos
// =========================================================================

// Type-level sanity: os fakes acima só compilam se os métodos aceitarem os
// IDs branded. Estes aliases apenas provam presença dos tipos.
type _IdsCheck = [
  MembershipId,
  CaseId,
  PersonId,
  CasePersonId,
  RelationshipId,
  AssignmentId,
  ProfessionalProfileId,
  CredentialId,
  User,
];
const _idsCheck: _IdsCheck extends readonly unknown[] ? true : false = true;
void _idsCheck;
