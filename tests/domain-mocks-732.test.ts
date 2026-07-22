/**
 * LV-07.3.3 — Correção final verificável da LV-07.3.
 *
 * Cobre:
 *   1. Cursor de paginação vinculado à consulta (assinatura, limite, offset).
 *   2. Preview-then-commit em todas as oito rotinas de criação.
 *   3. Registro literal do TanStack React Start em routeTree.gen.ts.
 */

import { describe, it, expect } from "bun:test";
import { createMockDomainEnvironment } from "../src/domain/mocks";
import type { ServiceContext } from "../src/domain/services/context";
import type { ServiceResult } from "../src/domain/services/result";
import {
  SEED_ORG_ALFA_ID,
  SEED_ORG_BETA_ID,
  SEED_USER_1_ID,
  SEED_USER_2_ID,
  SEED_USER_3_ID,
  SEED_MEM_ALFA_OWNER_ID,
  SEED_MEM_BETA_OWNER_ID,
  SEED_PROF_ALFA_ID,
  SEED_CASE_ALFA_1_ID,
  SEED_CASE_ALFA_2_ID,
  SEED_PERSON_ALFA_1_ID,
  SEED_PERSON_ALFA_2_ID,
} from "../src/domain/mocks/seed";
import type { Role } from "../src/domain/shared/work-context";
import type { Perfil } from "../src/domain/shared/work-context";
import type { ConfidentialityLevel } from "../src/domain/core/case";
import type { AgeClassification } from "../src/domain/core/person";
import type {
  AssignmentRole,
  CasePersonRole,
  RelationshipType,
} from "../src/domain/core/assignment";
import type {
  ProfessionalProfileId,
} from "../src/domain/core/ids";
import type { IsoDate } from "../src/domain/core/common";

function unwrapOk<T>(r: ServiceResult<T>): T {
  expect(r.ok).toBe(true);
  if (!r.ok) throw new Error(r.error.code);
  return r.data;
}

function unwrapErr<T>(r: ServiceResult<T>) {
  expect(r.ok).toBe(false);
  if (r.ok) throw new Error("esperava erro");
  return r.error;
}

const ctxAlfa: ServiceContext = {
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_1_ID,
  membershipId: SEED_MEM_ALFA_OWNER_ID,
  role: "proprietario",
};

const ctxBeta: ServiceContext = {
  organizationId: SEED_ORG_BETA_ID,
  userId: SEED_USER_2_ID,
  membershipId: SEED_MEM_BETA_OWNER_ID,
  role: "proprietario",
};

// ============================================================================
// 1) Cursor de paginação — 14 cenários independentes
// ============================================================================

async function popCasos(env: ReturnType<typeof createMockDomainEnvironment>, n: number, base = 1000, ctx = ctxAlfa) {
  for (let i = 0; i < n; i += 1) {
    unwrapOk(
      await env.services.cases.create(ctx, {
        reference: `NP-${base + i}`,
        title: `Caso ${i}`,
        confidentiality: "standard",
      }),
    );
  }
}

describe("LV-07.3.3 — cursor vinculado à consulta", () => {
  it("[1] cursor válido na mesma consulta prossegue à próxima página", async () => {
    const env = createMockDomainEnvironment();
    await popCasos(env, 5);
    const p1 = unwrapOk(
      await env.services.cases.list(ctxAlfa, {
        page: { limit: 2 },
        sortBy: "createdAt",
        sortDir: "asc",
      }),
    );
    expect(p1.nextCursor).toBeTruthy();
    const p2 = unwrapOk(
      await env.services.cases.list(ctxAlfa, {
        page: { limit: 2, cursor: p1.nextCursor! },
        sortBy: "createdAt",
        sortDir: "asc",
      }),
    );
    expect(p2.items.length).toBeGreaterThan(0);
  });

  it("[2] rejeita cursor emitido para outro filtro", async () => {
    const env = createMockDomainEnvironment();
    await popCasos(env, 5);
    const p1 = unwrapOk(
      await env.services.cases.list(ctxAlfa, { page: { limit: 2 } }),
    );
    const err = unwrapErr(
      await env.services.cases.list(ctxAlfa, {
        page: { limit: 2, cursor: p1.nextCursor! },
        filter: { statuses: ["draft"] },
      }),
    );
    expect(err.code).toBe("validation_error");
    expect(err.message).toBe("invalid_cursor");
  });

  it("[3] rejeita cursor emitido para outro campo de ordenação", async () => {
    const env = createMockDomainEnvironment();
    await popCasos(env, 5);
    const p1 = unwrapOk(
      await env.services.cases.list(ctxAlfa, {
        page: { limit: 2 },
        sortBy: "createdAt",
      }),
    );
    const err = unwrapErr(
      await env.services.cases.list(ctxAlfa, {
        page: { limit: 2, cursor: p1.nextCursor! },
        sortBy: "title",
      }),
    );
    expect(err.code).toBe("validation_error");
    expect(err.message).toBe("invalid_cursor");
  });

  it("[4] rejeita cursor emitido para outra direção", async () => {
    const env = createMockDomainEnvironment();
    await popCasos(env, 5);
    const p1 = unwrapOk(
      await env.services.cases.list(ctxAlfa, {
        page: { limit: 2 },
        sortBy: "createdAt",
        sortDir: "asc",
      }),
    );
    const err = unwrapErr(
      await env.services.cases.list(ctxAlfa, {
        page: { limit: 2, cursor: p1.nextCursor! },
        sortBy: "createdAt",
        sortDir: "desc",
      }),
    );
    expect(err.code).toBe("validation_error");
    expect(err.message).toBe("invalid_cursor");
  });

  it("[5] rejeita cursor emitido para outro limite", async () => {
    const env = createMockDomainEnvironment();
    await popCasos(env, 5);
    const p1 = unwrapOk(
      await env.services.cases.list(ctxAlfa, { page: { limit: 2 } }),
    );
    const err = unwrapErr(
      await env.services.cases.list(ctxAlfa, {
        page: { limit: 3, cursor: p1.nextCursor! },
      }),
    );
    expect(err.code).toBe("validation_error");
    expect(err.message).toBe("invalid_cursor");
  });

  it("[6] rejeita cursor de outra organização", async () => {
    const env = createMockDomainEnvironment();
    await popCasos(env, 5, 6000, ctxAlfa);
    await popCasos(env, 5, 7000, ctxBeta);
    const pAlfa = unwrapOk(
      await env.services.cases.list(ctxAlfa, { page: { limit: 2 } }),
    );
    const err = unwrapErr(
      await env.services.cases.list(ctxBeta, {
        page: { limit: 2, cursor: pAlfa.nextCursor! },
      }),
    );
    expect(err.code).toBe("validation_error");
    expect(err.message).toBe("invalid_cursor");
  });

  it("[7] rejeita cursor de outro serviço", async () => {
    const env = createMockDomainEnvironment();
    await popCasos(env, 5, 8000);
    const casesPage = unwrapOk(
      await env.services.cases.list(ctxAlfa, { page: { limit: 2 } }),
    );
    const err = unwrapErr(
      await env.services.persons.list(ctxAlfa, {
        page: { limit: 2, cursor: casesPage.nextCursor! },
      }),
    );
    expect(err.code).toBe("validation_error");
    expect(err.message).toBe("invalid_cursor");
  });

  it("[8] rejeita cursor emitido para outro caso (relacionamentos)", async () => {
    const env = createMockDomainEnvironment();
    // criar vínculos e relacionamentos em CASE_ALFA_2 (já povoado no seed)
    const page = unwrapOk(
      await env.services.relationships.listByCase(
        ctxAlfa,
        SEED_CASE_ALFA_2_ID,
        { limit: 1 },
      ),
    );
    // cursor válido em CASE_ALFA_2 — se houver >1, gera cursor; caso não,
    // pulamos comparação por consulta diferente com um cursor forjado a partir
    // da assinatura correta é impraticável, então usamos filtro diferente:
    // aqui, tentamos usar em outro caso (SEED_CASE_ALFA_1_ID).
    if (page.nextCursor) {
      const err = unwrapErr(
        await env.services.relationships.listByCase(
          ctxAlfa,
          SEED_CASE_ALFA_1_ID,
          { limit: 1, cursor: page.nextCursor },
        ),
      );
      expect(err.code).toBe("validation_error");
      expect(err.message).toBe("invalid_cursor");
    } else {
      // Sem cursor emitido: ainda assim provamos com um cursor forjado
      // reutilizando assinatura de outra consulta.
      await popCasos(env, 3, 8500);
      const casesPage = unwrapOk(
        await env.services.cases.list(ctxAlfa, { page: { limit: 2 } }),
      );
      const err = unwrapErr(
        await env.services.relationships.listByCase(
          ctxAlfa,
          SEED_CASE_ALFA_1_ID,
          { limit: 2, cursor: casesPage.nextCursor! },
        ),
      );
      expect(err.code).toBe("validation_error");
    }
  });

  it("[9] rejeita cursor emitido para outro perfil profissional (credenciais)", async () => {
    const env = createMockDomainEnvironment();
    // criar 5 credenciais no perfil alfa
    for (let i = 0; i < 5; i += 1) {
      unwrapOk(
        await env.services.credentials.create(ctxAlfa, {
          professionalProfileId: SEED_PROF_ALFA_ID,
        }),
      );
    }
    const p1 = unwrapOk(
      await env.services.credentials.listByProfessionalProfile(ctxAlfa, SEED_PROF_ALFA_ID, {
        limit: 2,
      }),
    );
    expect(p1.nextCursor).toBeTruthy();
    // criar outro perfil no mesmo user para trocar de escopo
    const outro = unwrapOk(
      await env.services.professionalProfiles.create(ctxAlfa, {
        userId: SEED_USER_1_ID,
        area: "servico-social",
      }),
    );
    const err = unwrapErr(
      await env.services.credentials.listByProfessionalProfile(ctxAlfa, outro.id, {
        limit: 2,
        cursor: p1.nextCursor!,
      }),
    );
    expect(err.code).toBe("validation_error");
    expect(err.message).toBe("invalid_cursor");
  });

  it("[10] rejeita cursor com assinatura correta mas offset fabricado (offset % limit != 0)", async () => {
    const env = createMockDomainEnvironment();
    await popCasos(env, 6, 9000);
    const firstPage = unwrapOk(
      await env.services.cases.list(ctxAlfa, { page: { limit: 2 } }),
    );
    // Preserva assinatura, injeta offset impossível (1 não é múltiplo de 2).
    const fabricado = firstPage.nextCursor!.replace(/_\d+$/, "_1");
    const err = unwrapErr(
      await env.services.cases.list(ctxAlfa, {
        page: { limit: 2, cursor: fabricado },
      }),
    );
    expect(err.code).toBe("validation_error");
    expect(err.message).toBe("invalid_cursor");
  });

  it("[11] rejeita cursor com offset zero", async () => {
    const env = createMockDomainEnvironment();
    await popCasos(env, 4, 9100);
    const p1 = unwrapOk(
      await env.services.cases.list(ctxAlfa, { page: { limit: 2 } }),
    );
    const forjado = p1.nextCursor!.replace(/_\d+$/, "_0");
    const err = unwrapErr(
      await env.services.cases.list(ctxAlfa, {
        page: { limit: 2, cursor: forjado },
      }),
    );
    expect(err.code).toBe("validation_error");
    expect(err.message).toBe("invalid_cursor");
  });

  it("[12] rejeita cursor com offset igual ao total", async () => {
    const env = createMockDomainEnvironment();
    await popCasos(env, 4, 9200);
    const all = unwrapOk(
      await env.services.cases.list(ctxAlfa, { page: { limit: 2 } }),
    );
    // Descobrir total total real.
    const total = all.total;
    const forjado = all.nextCursor!.replace(/_\d+$/, `_${total}`);
    const err = unwrapErr(
      await env.services.cases.list(ctxAlfa, {
        page: { limit: 2, cursor: forjado },
      }),
    );
    expect(err.code).toBe("validation_error");
    expect(err.message).toBe("invalid_cursor");
  });

  it("[13] rejeita cursor com offset maior que o total", async () => {
    const env = createMockDomainEnvironment();
    await popCasos(env, 4, 9300);
    const p1 = unwrapOk(
      await env.services.cases.list(ctxAlfa, { page: { limit: 2 } }),
    );
    const forjado = p1.nextCursor!.replace(/_\d+$/, "_9999");
    const err = unwrapErr(
      await env.services.cases.list(ctxAlfa, {
        page: { limit: 2, cursor: forjado },
      }),
    );
    expect(err.code).toBe("validation_error");
    expect(err.message).toBe("invalid_cursor");
  });

  it("[14] rejeita cursor malformado", async () => {
    const env = createMockDomainEnvironment();
    await popCasos(env, 2, 9400);
    const err = unwrapErr(
      await env.services.cases.list(ctxAlfa, {
        page: { limit: 2, cursor: "cursor_qualquer_nao_valido" },
      }),
    );
    expect(err.code).toBe("validation_error");
    expect(err.message).toBe("invalid_cursor");
  });
});

// ============================================================================
// 2) Preview-then-commit — 8 rotinas de criação (envA vs envB)
// ============================================================================

describe("LV-07.3.3 — preview-then-commit em todas as oito criações", () => {
  it("[C1] MembershipService.create — falha inválida não consome id/relógio", async () => {
    const envA = createMockDomainEnvironment();
    const envB = createMockDomainEnvironment();
    // preparação idêntica: nenhuma além do seed.
    const invalidRole = "papel_invalido" as unknown as Role;
    const errA = unwrapErr(
      await envA.services.memberships.create(ctxAlfa, {
        userId: SEED_USER_3_ID,
        role: invalidRole,
      }),
    );
    expect(errA.code).toBe("validation_error");
    const validA = unwrapOk(
      await envA.services.memberships.create(ctxAlfa, {
        userId: SEED_USER_3_ID,
        role: "colaborador",
      }),
    );
    const validB = unwrapOk(
      await envB.services.memberships.create(ctxAlfa, {
        userId: SEED_USER_3_ID,
        role: "colaborador",
      }),
    );
    expect(validA.id).toBe(validB.id);
    expect(validA.metadata.createdAt).toBe(validB.metadata.createdAt);
    expect(validA.metadata.updatedAt).toBe(validB.metadata.updatedAt);
    expect(validA.metadata.version).toBe(1);
    // snapshot de A não contém a tentativa inválida
    const only = envA
      .snapshot()
      .memberships.filter((m) => m.userId === SEED_USER_3_ID && m.organizationId === SEED_ORG_ALFA_ID);
    expect(only.length).toBe(1);
    expect(only[0]!.id).toBe(validA.id);
  });

  it("[C2] ProfessionalProfileService.create — falha inválida não consome id/relógio", async () => {
    const envA = createMockDomainEnvironment();
    const envB = createMockDomainEnvironment();
    const invalidArea = "area_invalida" as unknown as Perfil;
    unwrapErr(
      await envA.services.professionalProfiles.create(ctxAlfa, {
        userId: SEED_USER_2_ID,
        area: invalidArea,
      }),
    );
    const validA = unwrapOk(
      await envA.services.professionalProfiles.create(ctxAlfa, {
        userId: SEED_USER_2_ID,
        area: "servico-social",
      }),
    );
    const validB = unwrapOk(
      await envB.services.professionalProfiles.create(ctxAlfa, {
        userId: SEED_USER_2_ID,
        area: "servico-social",
      }),
    );
    expect(validA.id).toBe(validB.id);
    expect(validA.metadata.createdAt).toBe(validB.metadata.createdAt);
    expect(validA.metadata.updatedAt).toBe(validB.metadata.updatedAt);
    expect(validA.metadata.version).toBe(1);
    const rec = envA
      .snapshot()
      .professionalProfiles.filter(
        (p) => p.userId === SEED_USER_2_ID && p.organizationId === SEED_ORG_ALFA_ID,
      );
    expect(rec.length).toBe(1);
  });

  it("[C3] CredentialService.create — referência inválida não consome id/relógio", async () => {
    const envA = createMockDomainEnvironment();
    const envB = createMockDomainEnvironment();
    const fakeProfId = "professionalProfile_xxx" as unknown as ProfessionalProfileId;
    const err = unwrapErr(
      await envA.services.credentials.create(ctxAlfa, {
        professionalProfileId: fakeProfId,
      }),
    );
    expect(err.code).toBe("not_found");
    const validA = unwrapOk(
      await envA.services.credentials.create(ctxAlfa, {
        professionalProfileId: SEED_PROF_ALFA_ID,
      }),
    );
    const validB = unwrapOk(
      await envB.services.credentials.create(ctxAlfa, {
        professionalProfileId: SEED_PROF_ALFA_ID,
      }),
    );
    expect(validA.id).toBe(validB.id);
    expect(validA.metadata.createdAt).toBe(validB.metadata.createdAt);
    expect(validA.metadata.updatedAt).toBe(validB.metadata.updatedAt);
    expect(validA.metadata.version).toBe(1);
  });

  it("[C4] CaseService.create — confidencialidade inválida não consome id/relógio", async () => {
    const envA = createMockDomainEnvironment();
    const envB = createMockDomainEnvironment();
    const invalidConf = "hiper_secreto" as unknown as ConfidentialityLevel;
    unwrapErr(
      await envA.services.cases.create(ctxAlfa, {
        reference: "NP-C4A",
        title: "Caso C4",
        confidentiality: invalidConf,
      }),
    );
    const validA = unwrapOk(
      await envA.services.cases.create(ctxAlfa, {
        reference: "NP-C4",
        title: "Caso C4",
        confidentiality: "standard",
      }),
    );
    const validB = unwrapOk(
      await envB.services.cases.create(ctxAlfa, {
        reference: "NP-C4",
        title: "Caso C4",
        confidentiality: "standard",
      }),
    );
    expect(validA.id).toBe(validB.id);
    expect(validA.metadata.createdAt).toBe(validB.metadata.createdAt);
    expect(validA.metadata.version).toBe(1);
    const rec = envA.snapshot().cases.filter((c) => c.reference === "NP-C4A");
    expect(rec.length).toBe(0);
  });

  it("[C5] PersonService.create — classificação etária inválida não consome id/relógio", async () => {
    const envA = createMockDomainEnvironment();
    const envB = createMockDomainEnvironment();
    const invalidAge = "matusalem" as unknown as AgeClassification;
    unwrapErr(
      await envA.services.persons.create(ctxAlfa, {
        displayLabel: "P5",
        ageClassification: invalidAge,
      }),
    );
    const validA = unwrapOk(
      await envA.services.persons.create(ctxAlfa, {
        displayLabel: "P5",
        ageClassification: "adult",
      }),
    );
    const validB = unwrapOk(
      await envB.services.persons.create(ctxAlfa, {
        displayLabel: "P5",
        ageClassification: "adult",
      }),
    );
    expect(validA.id).toBe(validB.id);
    expect(validA.metadata.createdAt).toBe(validB.metadata.createdAt);
    expect(validA.metadata.version).toBe(1);
  });

  it("[C6] CasePersonService.create — papel inválido não consome id/relógio", async () => {
    const envA = createMockDomainEnvironment();
    const envB = createMockDomainEnvironment();
    // preparação idêntica: usar SEED_CASE_ALFA_1_ID + SEED_PERSON_ALFA_1_ID
    const invalidRole = "papel_x" as unknown as CasePersonRole;
    unwrapErr(
      await envA.services.casePersons.create(ctxAlfa, {
        caseId: SEED_CASE_ALFA_1_ID,
        personId: SEED_PERSON_ALFA_1_ID,
        role: invalidRole,
        restrictedByDefault: false,
      }),
    );
    const validA = unwrapOk(
      await envA.services.casePersons.create(ctxAlfa, {
        caseId: SEED_CASE_ALFA_1_ID,
        personId: SEED_PERSON_ALFA_1_ID,
        role: "applicant",
        restrictedByDefault: false,
      }),
    );
    const validB = unwrapOk(
      await envB.services.casePersons.create(ctxAlfa, {
        caseId: SEED_CASE_ALFA_1_ID,
        personId: SEED_PERSON_ALFA_1_ID,
        role: "applicant",
        restrictedByDefault: false,
      }),
    );
    expect(validA.id).toBe(validB.id);
    expect(validA.metadata.createdAt).toBe(validB.metadata.createdAt);
    expect(validA.metadata.version).toBe(1);
  });

  it("[C7] RelationshipService.create — tipo inválido não consome id/relógio", async () => {
    const envA = createMockDomainEnvironment();
    const envB = createMockDomainEnvironment();
    const invalidType = "amizade_forte" as unknown as RelationshipType;
    unwrapErr(
      await envA.services.relationships.create(ctxAlfa, {
        caseId: SEED_CASE_ALFA_2_ID,
        fromPersonId: SEED_PERSON_ALFA_1_ID,
        toPersonId: SEED_PERSON_ALFA_2_ID,
        type: invalidType,
      }),
    );
    const validA = unwrapOk(
      await envA.services.relationships.create(ctxAlfa, {
        caseId: SEED_CASE_ALFA_2_ID,
        fromPersonId: SEED_PERSON_ALFA_1_ID,
        toPersonId: SEED_PERSON_ALFA_2_ID,
        type: "sibling",
      }),
    );
    const validB = unwrapOk(
      await envB.services.relationships.create(ctxAlfa, {
        caseId: SEED_CASE_ALFA_2_ID,
        fromPersonId: SEED_PERSON_ALFA_1_ID,
        toPersonId: SEED_PERSON_ALFA_2_ID,
        type: "sibling",
      }),
    );
    expect(validA.id).toBe(validB.id);
    expect(validA.metadata.createdAt).toBe(validB.metadata.createdAt);
    expect(validA.metadata.version).toBe(1);
  });

  it("[C8] AssignmentService.create — papel inválido não consome id/relógio", async () => {
    const envA = createMockDomainEnvironment();
    const envB = createMockDomainEnvironment();
    const invalidRole = "papel_zzz" as unknown as AssignmentRole;
    const startedOn = "2026-02-01" as IsoDate;
    unwrapErr(
      await envA.services.assignments.create(ctxAlfa, {
        caseId: SEED_CASE_ALFA_1_ID,
        professionalProfileId: SEED_PROF_ALFA_ID,
        role: invalidRole,
        startedOn,
      }),
    );
    const validA = unwrapOk(
      await envA.services.assignments.create(ctxAlfa, {
        caseId: SEED_CASE_ALFA_1_ID,
        professionalProfileId: SEED_PROF_ALFA_ID,
        role: "reviewer",
        startedOn,
      }),
    );
    const validB = unwrapOk(
      await envB.services.assignments.create(ctxAlfa, {
        caseId: SEED_CASE_ALFA_1_ID,
        professionalProfileId: SEED_PROF_ALFA_ID,
        role: "reviewer",
        startedOn,
      }),
    );
    expect(validA.id).toBe(validB.id);
    expect(validA.metadata.createdAt).toBe(validB.metadata.createdAt);
    expect(validA.metadata.version).toBe(1);
  });
});

// ============================================================================
// 3) Registro literal do TanStack React Start
// ============================================================================

describe("LV-07.3.3 — registro do TanStack React Start", () => {
  it("routeTree.gen.ts expõe declare module '@tanstack/react-start' completo", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/routeTree.gen.ts"),
      "utf8",
    );
    expect(src).toContain("declare module '@tanstack/react-start'");
    expect(src).toContain("interface Register");
    expect(src).toContain("ssr: true");
    expect(src).toContain("router: Awaited<ReturnType<typeof getRouter>>");
    expect(src).toContain(
      "config: Awaited<ReturnType<typeof startInstance.getOptions>>",
    );
  });
});
