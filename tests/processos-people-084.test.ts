/**
 * LV-08.4 — testes funcionais da seção "Pessoas e Relações".
 *
 * Só toca funções puras (`process-people-model`) e a superfície pública
 * dos serviços do domínio oficial. Não renderiza React, não usa storage.
 */

import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createMockDomainEnvironment } from "../src/domain/mocks";
import {
  SEED_CASE_ALFA_1_ID,
  SEED_CASE_ALFA_2_ID,
  SEED_CASE_BETA_2_ID,
  SEED_CP_ALFA_1_ID,
  SEED_CP_ALFA_2_ID,
  SEED_MEM_ALFA_OWNER_ID,
  SEED_MEM_ALFA_SUSPENDED_ID,
  SEED_MEM_BETA_OWNER_ID,
  SEED_ORG_ALFA_ID,
  SEED_ORG_BETA_ID,
  SEED_PERSON_ALFA_1_ID,
  SEED_PERSON_ALFA_2_ID,
  SEED_PERSON_BETA_1_ID,
  SEED_REL_ALFA_1_ID,
  SEED_USER_1_ID,
  SEED_USER_2_ID,
  SEED_USER_3_ID,
} from "../src/domain/mocks/seed";
import { AGE_CLASSIFICATIONS } from "../src/domain/core/person";
import {
  CASE_PERSON_ROLES,
  RELATIONSHIP_TYPES,
} from "../src/domain/core/assignment";
import type { ServiceContext } from "../src/domain/services/context";
import type { ServiceError, ServiceResult } from "../src/domain/services/result";
import {
  AGE_CLASSIFICATION_LABELS_PT,
  CASE_PERSON_ROLE_LABELS_PT,
  PEOPLE_WRITE_ACTIONS,
  RELATIONSHIP_TYPE_LABELS_PT,
  buildCasePersonUpdateInput,
  buildCreateCasePersonInput,
  buildCreatePersonInput,
  buildCreateRelationshipInput,
  buildLinkedCasePeopleView,
  buildPersonUpdateInput,
  buildRelationshipUpdateInput,
  buildRelationshipViews,
  collectDistinctLinkedPersonIds,
  emptyPeoplePermissions,
  filterPersonsByDisplayLabel,
  isMinorAge,
  mapPeopleError,
  normalizePersonLabel,
} from "../src/features/processos/process-people-model";
import type { CasePerson } from "../src/domain/core/assignment";
import type { Person } from "../src/domain/core/person";

const ALFA_CTX: ServiceContext = {
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_1_ID,
  membershipId: SEED_MEM_ALFA_OWNER_ID,
  role: "proprietario",
};
const ALFA_READ_CTX: ServiceContext = {
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_2_ID,
  membershipId: SEED_MEM_ALFA_SUSPENDED_ID,
  role: "leitura",
};
const BETA_CTX: ServiceContext = {
  organizationId: SEED_ORG_BETA_ID,
  userId: SEED_USER_2_ID,
  membershipId: SEED_MEM_BETA_OWNER_ID,
  role: "proprietario",
};

function unwrap<T>(r: ServiceResult<T>): T {
  if (!r.ok) throw new Error(`Erro inesperado: ${r.error.code}/${r.error.message}`);
  return r.data;
}
function unwrapErr<T>(r: ServiceResult<T>): ServiceError {
  if (r.ok) throw new Error("Esperava erro");
  return r.error;
}

// ---- Rótulos ---------------------------------------------------------------

describe("LV-08.4 · catálogos de rótulos", () => {
  it("cobre todas as classificações etárias", () => {
    for (const k of AGE_CLASSIFICATIONS) {
      expect(typeof AGE_CLASSIFICATION_LABELS_PT[k]).toBe("string");
      expect(AGE_CLASSIFICATION_LABELS_PT[k].length).toBeGreaterThan(0);
    }
  });
  it("cobre todos os papéis de vínculo", () => {
    for (const k of CASE_PERSON_ROLES) {
      expect(typeof CASE_PERSON_ROLE_LABELS_PT[k]).toBe("string");
      expect(CASE_PERSON_ROLE_LABELS_PT[k].length).toBeGreaterThan(0);
    }
  });
  it("cobre todos os tipos de relação", () => {
    for (const k of RELATIONSHIP_TYPES) {
      expect(typeof RELATIONSHIP_TYPE_LABELS_PT[k]).toBe("string");
      expect(RELATIONSHIP_TYPE_LABELS_PT[k].length).toBeGreaterThan(0);
    }
  });
  it("não expõe chaves além do enum de idade", () => {
    expect(Object.keys(AGE_CLASSIFICATION_LABELS_PT).sort()).toEqual(
      [...AGE_CLASSIFICATIONS].sort(),
    );
  });
  it("não expõe chaves além do enum de papéis", () => {
    expect(Object.keys(CASE_PERSON_ROLE_LABELS_PT).sort()).toEqual(
      [...CASE_PERSON_ROLES].sort(),
    );
  });
  it("não expõe chaves além do enum de relações", () => {
    expect(Object.keys(RELATIONSHIP_TYPE_LABELS_PT).sort()).toEqual(
      [...RELATIONSHIP_TYPES].sort(),
    );
  });
});

// ---- Helpers puros ---------------------------------------------------------

describe("LV-08.4 · helpers puros", () => {
  it("normalizePersonLabel remove espaços nas pontas", () => {
    expect(normalizePersonLabel("  João  ")).toBe("João");
  });
  it("isMinorAge é verdadeiro para child e adolescent", () => {
    expect(isMinorAge("child")).toBe(true);
    expect(isMinorAge("adolescent")).toBe(true);
    expect(isMinorAge("adult")).toBe(false);
    expect(isMinorAge("unknown")).toBe(false);
  });
  it("PEOPLE_WRITE_ACTIONS lista as 8 ações de escrita", () => {
    expect(PEOPLE_WRITE_ACTIONS.length).toBe(8);
    expect(PEOPLE_WRITE_ACTIONS).toContain("person.create");
    expect(PEOPLE_WRITE_ACTIONS).toContain("casePerson.remove");
    expect(PEOPLE_WRITE_ACTIONS).toContain("relationship.update");
  });
  it("emptyPeoplePermissions retorna todas as ações como falsas", () => {
    const p = emptyPeoplePermissions();
    for (const a of PEOPLE_WRITE_ACTIONS) expect(p[a]).toBe(false);
  });
});

// ---- Junções de views ------------------------------------------------------

describe("LV-08.4 · buildLinkedCasePeopleView", () => {
  it("ordena vínculos por displayLabel em pt-BR", async () => {
    const env = createMockDomainEnvironment();
    const cps = unwrap(
      await env.services.casePersons.listByCase(ALFA_CTX, SEED_CASE_ALFA_2_ID, {
        limit: 100,
      }),
    ).items;
    const persons = unwrap(
      await env.services.persons.list(ALFA_CTX, { page: { limit: 100 } }),
    ).items;
    const { views, unresolved } = buildLinkedCasePeopleView(cps, persons);
    expect(unresolved.length).toBe(0);
    expect(views.length).toBe(2);
    expect(views[0].person.displayLabel <= views[1].person.displayLabel).toBe(true);
  });

  it("reporta vínculos sem pessoa resolvida em unresolved", () => {
    const { views, unresolved } = buildLinkedCasePeopleView(
      [
        {
          id: SEED_CP_ALFA_1_ID,
          organizationId: SEED_ORG_ALFA_ID,
          caseId: SEED_CASE_ALFA_2_ID,
          personId: SEED_PERSON_ALFA_1_ID,
          role: "applicant",
          restrictedByDefault: false,
          metadata: {
            createdAt: "2025-01-01T00:00:00.000Z" as never,
            updatedAt: "2025-01-01T00:00:00.000Z" as never,
            version: 1,
          },
        },
      ],
      [],
    );
    expect(views.length).toBe(0);
    expect(unresolved.length).toBe(1);
    expect(unresolved[0].personId).toBe(SEED_PERSON_ALFA_1_ID);
  });
});

describe("LV-08.4 · buildRelationshipViews", () => {
  it("resolve pontas via lista de pessoas vinculadas", async () => {
    const env = createMockDomainEnvironment();
    const cps = unwrap(
      await env.services.casePersons.listByCase(ALFA_CTX, SEED_CASE_ALFA_2_ID, {
        limit: 100,
      }),
    ).items;
    const persons = unwrap(
      await env.services.persons.list(ALFA_CTX, { page: { limit: 100 } }),
    ).items;
    const rels = unwrap(
      await env.services.relationships.listByCase(ALFA_CTX, SEED_CASE_ALFA_2_ID, {
        limit: 100,
      }),
    ).items;
    const linked = buildLinkedCasePeopleView(cps, persons).views;
    const { views, unresolved } = buildRelationshipViews(rels, linked);
    expect(unresolved.length).toBe(0);
    expect(views.length).toBe(1);
    expect(views[0].fromPerson.id).toBe(SEED_PERSON_ALFA_1_ID);
    expect(views[0].toPerson.id).toBe(SEED_PERSON_ALFA_2_ID);
  });

  it("classifica lado ausente em unresolved", () => {
    const rel = {
      id: SEED_REL_ALFA_1_ID,
      organizationId: SEED_ORG_ALFA_ID,
      caseId: SEED_CASE_ALFA_2_ID,
      fromPersonId: SEED_PERSON_ALFA_1_ID,
      toPersonId: SEED_PERSON_ALFA_2_ID,
      type: "spouse" as const,
      metadata: {
        createdAt: "2025-01-01T00:00:00.000Z" as never,
        updatedAt: "2025-01-01T00:00:00.000Z" as never,
        version: 1,
      },
    };
    const { views, unresolved } = buildRelationshipViews([rel], []);
    expect(views.length).toBe(0);
    expect(unresolved[0].missing).toBe("both");
  });
});

// ---- Builders --------------------------------------------------------------

describe("LV-08.4 · builders de update", () => {
  const basePerson = {
    id: SEED_PERSON_ALFA_1_ID,
    organizationId: SEED_ORG_ALFA_ID,
    displayLabel: "Pessoa Alfa 1",
    ageClassification: "adult" as const,
    metadata: {
      createdAt: "2025-01-01T00:00:00.000Z" as never,
      updatedAt: "2025-01-01T00:00:00.000Z" as never,
      version: 3,
    },
  };
  it("buildPersonUpdateInput retorna null quando nada muda", () => {
    expect(
      buildPersonUpdateInput(basePerson, {
        displayLabel: "Pessoa Alfa 1",
        ageClassification: "adult",
      }),
    ).toBeNull();
  });
  it("buildPersonUpdateInput inclui expectedVersion e diff", () => {
    const out = buildPersonUpdateInput(basePerson, {
      displayLabel: "  Novo Nome  ",
      ageClassification: "adolescent",
    });
    expect(out).toEqual({
      displayLabel: "Novo Nome",
      ageClassification: "adolescent",
      expectedVersion: 3,
    });
  });
  it("buildPersonUpdateInput ignora rótulo vazio após trim", () => {
    const out = buildPersonUpdateInput(basePerson, {
      displayLabel: "   ",
      ageClassification: "child",
    });
    expect(out).toEqual({ ageClassification: "child", expectedVersion: 3 });
  });

  const baseLink = {
    id: SEED_CP_ALFA_1_ID,
    organizationId: SEED_ORG_ALFA_ID,
    caseId: SEED_CASE_ALFA_2_ID,
    personId: SEED_PERSON_ALFA_1_ID,
    role: "applicant" as const,
    restrictedByDefault: false,
    metadata: {
      createdAt: "2025-01-01T00:00:00.000Z" as never,
      updatedAt: "2025-01-01T00:00:00.000Z" as never,
      version: 2,
    },
  };
  it("buildCasePersonUpdateInput retorna null quando nada muda", () => {
    expect(
      buildCasePersonUpdateInput(baseLink, {
        role: "applicant",
        restrictedByDefault: false,
      }),
    ).toBeNull();
  });
  it("buildCasePersonUpdateInput inclui casePersonId e expectedVersion", () => {
    const out = buildCasePersonUpdateInput(baseLink, {
      role: "witness",
      restrictedByDefault: true,
    });
    expect(out).toEqual({
      casePersonId: SEED_CP_ALFA_1_ID,
      role: "witness",
      restrictedByDefault: true,
      expectedVersion: 2,
    });
  });
  it("buildRelationshipUpdateInput retorna null quando tipo não muda", () => {
    const rel = {
      id: SEED_REL_ALFA_1_ID,
      organizationId: SEED_ORG_ALFA_ID,
      caseId: SEED_CASE_ALFA_2_ID,
      fromPersonId: SEED_PERSON_ALFA_1_ID,
      toPersonId: SEED_PERSON_ALFA_2_ID,
      type: "spouse" as const,
      metadata: {
        createdAt: "2025-01-01T00:00:00.000Z" as never,
        updatedAt: "2025-01-01T00:00:00.000Z" as never,
        version: 1,
      },
    };
    expect(buildRelationshipUpdateInput(rel, "spouse")).toBeNull();
    expect(buildRelationshipUpdateInput(rel, "former_spouse")).toEqual({
      relationshipId: SEED_REL_ALFA_1_ID,
      type: "former_spouse",
      expectedVersion: 1,
    });
  });
});

describe("LV-08.4 · builders de create", () => {
  it("buildCreatePersonInput normaliza rótulo", () => {
    expect(
      buildCreatePersonInput({
        displayLabel: "  Ana  ",
        ageClassification: "adult",
        role: "applicant",
        restrictedByDefault: false,
      }),
    ).toEqual({ displayLabel: "Ana", ageClassification: "adult" });
  });
  it("buildCreateCasePersonInput força restritivo em menor", () => {
    const out = buildCreateCasePersonInput(
      SEED_CASE_ALFA_2_ID,
      SEED_PERSON_ALFA_2_ID,
      "child_or_adolescent",
      false,
      "child",
    );
    expect(out.restrictedByDefault).toBe(true);
  });
  it("buildCreateCasePersonInput respeita adulto", () => {
    const out = buildCreateCasePersonInput(
      SEED_CASE_ALFA_2_ID,
      SEED_PERSON_ALFA_1_ID,
      "witness",
      false,
      "adult",
    );
    expect(out.restrictedByDefault).toBe(false);
  });
  it("buildCreateRelationshipInput compõe caseId, pontas e tipo", () => {
    const out = buildCreateRelationshipInput(SEED_CASE_ALFA_2_ID, {
      fromPersonId: SEED_PERSON_ALFA_1_ID,
      toPersonId: SEED_PERSON_ALFA_2_ID,
      type: "spouse",
    });
    expect(out.caseId).toBe(SEED_CASE_ALFA_2_ID);
    expect(out.fromPersonId).toBe(SEED_PERSON_ALFA_1_ID);
    expect(out.toPersonId).toBe(SEED_PERSON_ALFA_2_ID);
    expect(out.type).toBe("spouse");
  });
});

// ---- Mapeamento de erros ---------------------------------------------------

describe("LV-08.4 · mapPeopleError", () => {
  it("distingue duplicidade de vínculo", () => {
    expect(
      mapPeopleError({ code: "conflict", message: "duplicate_case_person" }).kind,
    ).toBe("conflict");
  });
  it("descreve remoção bloqueada por relação em uso", () => {
    const e = mapPeopleError({ code: "conflict", message: "case_person_in_use" });
    expect(e.kind).toBe("conflict");
    expect(e.message).toContain("relações");
  });
  it("descreve conflito de versão em português leigo", () => {
    const e = mapPeopleError({
      code: "conflict",
      message: "case_person_version_conflict",
    });
    expect(e.kind).toBe("conflict");
    expect(e.message).toContain("Recarregue");
  });
  it("descreve relação consigo mesmo", () => {
    const e = mapPeopleError({
      code: "validation_error",
      message: "self_relationship",
    });
    expect(e.kind).toBe("validation");
  });
  it("descreve pessoa não vinculada ao processo", () => {
    const e = mapPeopleError({
      code: "validation_error",
      message: "person_not_linked_to_case",
    });
    expect(e.kind).toBe("validation");
  });
  it("descreve bloqueio ao classificar como menor", () => {
    const e = mapPeopleError({
      code: "validation_error",
      message: "case_person_links_unprotected",
    });
    expect(e.kind).toBe("validation");
    expect(e.message).toContain("menor");
  });
  it("mapeia forbidden como sem permissão", () => {
    expect(mapPeopleError({ code: "forbidden", message: "x" }).kind).toBe(
      "forbidden",
    );
  });
  it("mapeia offline, unavailable, unauthorized e not_found", () => {
    expect(mapPeopleError({ code: "offline", message: "x" }).kind).toBe("offline");
    expect(mapPeopleError({ code: "unavailable", message: "x" }).kind).toBe(
      "unavailable",
    );
    expect(mapPeopleError({ code: "unauthorized", message: "x" }).kind).toBe(
      "unauthorized",
    );
    expect(mapPeopleError({ code: "not_found", message: "x" }).kind).toBe(
      "not_found",
    );
  });
  it("mapeia internal_error como genérico", () => {
    expect(mapPeopleError({ code: "internal_error", message: "x" }).kind).toBe(
      "generic",
    );
  });
});

// ---- Integração com serviços mock -----------------------------------------

describe("LV-08.4 · integração cases/persons/relationships", () => {
  it("proprietário Alfa consegue vincular pessoa nova ao Caso Alfa 1", async () => {
    const env = createMockDomainEnvironment();
    const newPerson = unwrap(
      await env.services.persons.create(
        ALFA_CTX,
        buildCreatePersonInput({
          displayLabel: "Nova Pessoa",
          ageClassification: "adult",
          role: "applicant",
          restrictedByDefault: false,
        }),
      ),
    );
    const link = unwrap(
      await env.services.casePersons.create(
        ALFA_CTX,
        buildCreateCasePersonInput(
          SEED_CASE_ALFA_1_ID,
          newPerson.id,
          "witness",
          false,
          "adult",
        ),
      ),
    );
    expect(link.caseId).toBe(SEED_CASE_ALFA_1_ID);
    expect(link.role).toBe("witness");
    expect(link.restrictedByDefault).toBe(false);
  });

  it("vínculo de criança é forçado a restrito", async () => {
    const env = createMockDomainEnvironment();
    const p = unwrap(
      await env.services.persons.create(
        ALFA_CTX,
        buildCreatePersonInput({
          displayLabel: "Criança",
          ageClassification: "child",
          role: "child_or_adolescent",
          restrictedByDefault: false,
        }),
      ),
    );
    const link = unwrap(
      await env.services.casePersons.create(
        ALFA_CTX,
        buildCreateCasePersonInput(
          SEED_CASE_ALFA_1_ID,
          p.id,
          "child_or_adolescent",
          false,
          "child",
        ),
      ),
    );
    expect(link.restrictedByDefault).toBe(true);
  });

  it("vincular a mesma pessoa duas vezes gera duplicate_case_person", async () => {
    const env = createMockDomainEnvironment();
    const p = unwrap(
      await env.services.persons.create(
        ALFA_CTX,
        buildCreatePersonInput({
          displayLabel: "Repetida",
          ageClassification: "adult",
          role: "applicant",
          restrictedByDefault: false,
        }),
      ),
    );
    unwrap(
      await env.services.casePersons.create(
        ALFA_CTX,
        buildCreateCasePersonInput(
          SEED_CASE_ALFA_1_ID,
          p.id,
          "applicant",
          false,
          "adult",
        ),
      ),
    );
    const err = unwrapErr(
      await env.services.casePersons.create(
        ALFA_CTX,
        buildCreateCasePersonInput(
          SEED_CASE_ALFA_1_ID,
          p.id,
          "witness",
          false,
          "adult",
        ),
      ),
    );
    expect(err.code).toBe("conflict");
    expect(err.message).toBe("duplicate_case_person");
  });

  it("remoção de vínculo com relação ativa é bloqueada", async () => {
    const env = createMockDomainEnvironment();
    const link = unwrap(
      await env.services.casePersons.getById(
        ALFA_CTX,
        SEED_CASE_ALFA_2_ID,
        SEED_CP_ALFA_1_ID,
      ),
    );
    const err = unwrapErr(
      await env.services.casePersons.remove(
        ALFA_CTX,
        SEED_CASE_ALFA_2_ID,
        SEED_CP_ALFA_1_ID,
        link.metadata.version,
      ),
    );
    expect(err.code).toBe("conflict");
    expect(err.message).toBe("case_person_in_use");
  });

  it("relação entre pessoa não vinculada e vinculada gera validation_error", async () => {
    const env = createMockDomainEnvironment();
    const p = unwrap(
      await env.services.persons.create(
        ALFA_CTX,
        buildCreatePersonInput({
          displayLabel: "Solta",
          ageClassification: "adult",
          role: "applicant",
          restrictedByDefault: false,
        }),
      ),
    );
    const err = unwrapErr(
      await env.services.relationships.create(
        ALFA_CTX,
        buildCreateRelationshipInput(SEED_CASE_ALFA_2_ID, {
          fromPersonId: SEED_PERSON_ALFA_1_ID,
          toPersonId: p.id,
          type: "spouse",
        }),
      ),
    );
    expect(err.code).toBe("validation_error");
    expect(err.message).toBe("person_not_linked_to_case");
  });

  it("relação consigo mesmo é rejeitada", async () => {
    const env = createMockDomainEnvironment();
    const err = unwrapErr(
      await env.services.relationships.create(
        ALFA_CTX,
        buildCreateRelationshipInput(SEED_CASE_ALFA_2_ID, {
          fromPersonId: SEED_PERSON_ALFA_1_ID,
          toPersonId: SEED_PERSON_ALFA_1_ID,
          type: "spouse",
        }),
      ),
    );
    expect(err.code).toBe("validation_error");
    expect(err.message).toBe("self_relationship");
  });

  it("duplicate_relationship ao criar a mesma relação duas vezes", async () => {
    const env = createMockDomainEnvironment();
    const err = unwrapErr(
      await env.services.relationships.create(
        ALFA_CTX,
        buildCreateRelationshipInput(SEED_CASE_ALFA_2_ID, {
          fromPersonId: SEED_PERSON_ALFA_1_ID,
          toPersonId: SEED_PERSON_ALFA_2_ID,
          type: "parent_child",
        }),
      ),
    );
    expect(err.code).toBe("conflict");
    expect(err.message).toBe("duplicate_relationship");
  });

  it("papel leitura recebe forbidden ao criar pessoa", async () => {
    const env = createMockDomainEnvironment();
    const err = unwrapErr(
      await env.services.persons.create(
        ALFA_READ_CTX,
        buildCreatePersonInput({
          displayLabel: "X",
          ageClassification: "adult",
          role: "witness",
          restrictedByDefault: false,
        }),
      ),
    );
    expect(err.code).toBe("forbidden");
  });

  it("proprietário Alfa lista vínculos existentes do Caso Alfa 2", async () => {
    const env = createMockDomainEnvironment();
    const list = unwrap(
      await env.services.casePersons.listByCase(
        ALFA_CTX,
        SEED_CASE_ALFA_2_ID,
        { limit: 100 },
      ),
    );
    expect(list.items.length).toBe(2);
  });

  it("contexto Beta não enxerga vínculos de Alfa (not_found)", async () => {
    const env = createMockDomainEnvironment();
    const err = unwrapErr(
      await env.services.casePersons.getById(
        BETA_CTX,
        SEED_CASE_ALFA_2_ID,
        SEED_CP_ALFA_1_ID,
      ),
    );
    expect(err.code).toBe("not_found");
  });

  it("classificar adulto como menor sem proteger vínculos gera case_person_links_unprotected", async () => {
    const env = createMockDomainEnvironment();
    const person = unwrap(
      await env.services.persons.getById(ALFA_CTX, SEED_PERSON_ALFA_1_ID),
    );
    const err = unwrapErr(
      await env.services.persons.update(ALFA_CTX, person.id, {
        ageClassification: "child",
        expectedVersion: person.metadata.version,
      }),
    );
    expect(err.code).toBe("validation_error");
    expect(err.message).toBe("case_person_links_unprotected");
  });

  it("editar tipo de relação com versão atual funciona", async () => {
    const env = createMockDomainEnvironment();
    const rel = unwrap(
      await env.services.relationships.getById(
        ALFA_CTX,
        SEED_CASE_ALFA_2_ID,
        SEED_REL_ALFA_1_ID,
      ),
    );
    const patch = buildRelationshipUpdateInput(rel, "guardian");
    expect(patch).not.toBeNull();
    const updated = unwrap(
      await env.services.relationships.update(
        ALFA_CTX,
        SEED_CASE_ALFA_2_ID,
        patch!,
      ),
    );
    expect(updated.type).toBe("guardian");
    expect(updated.metadata.version).toBe(rel.metadata.version + 1);
  });

  it("versão desatualizada dispara relationship_version_conflict", async () => {
    const env = createMockDomainEnvironment();
    const rel = unwrap(
      await env.services.relationships.getById(
        ALFA_CTX,
        SEED_CASE_ALFA_2_ID,
        SEED_REL_ALFA_1_ID,
      ),
    );
    const err = unwrapErr(
      await env.services.relationships.update(ALFA_CTX, SEED_CASE_ALFA_2_ID, {
        relationshipId: rel.id,
        type: "spouse",
        expectedVersion: rel.metadata.version + 5,
      }),
    );
    expect(err.code).toBe("conflict");
    expect(err.message).toBe("relationship_version_conflict");
  });
});

// ---- Auditoria de arquivos versionados -------------------------------------

describe("LV-08.4 · auditoria de fontes", () => {
  const modelSrc = readFileSync(
    resolve("src/features/processos/process-people-model.ts"),
    "utf8",
  );
  const routeSrc = readFileSync(
    resolve("src/routes/app.processos.$id.index.tsx"),
    "utf8",
  );
  const compSrc = readFileSync(
    resolve("src/features/processos/ProcessPeopleRelations.tsx"),
    "utf8",
  );
  it("modelo não importa React, roteador ou storage", () => {
    expect(modelSrc).not.toMatch(/from ["']react["']/);
    expect(modelSrc).not.toMatch(/@tanstack\/react-router/);
    expect(modelSrc).not.toMatch(/localStorage|sessionStorage|window\./);
  });
  it("modelo não referencia serviços do domínio diretamente (só tipos)", () => {
    expect(modelSrc).not.toMatch(/from ["']@\/domain\/mocks/);
  });
  it("rota monta a seção Pessoas e Relações abaixo do checklist", () => {
    expect(routeSrc).toContain("ProcessPeopleRelations");
    expect(routeSrc).toContain("ProcessReadinessChecklist");
    const idxChecklist = routeSrc.lastIndexOf("<ProcessReadinessChecklist");
    const idxPeople = routeSrc.lastIndexOf("<ProcessPeopleRelations");
    expect(idxPeople).toBeGreaterThan(idxChecklist);
  });
  it("componente principal não usa storage nem window", () => {
    expect(compSrc).not.toMatch(/localStorage|sessionStorage|window\./);
  });
  it("componente principal consome useMockDomain (fonte de contexto)", () => {
    expect(compSrc).toContain("useMockDomain");
  });
  it("componente principal usa Promise.all para carga inicial paralela", () => {
    expect(compSrc).toMatch(/Promise\.all/);
  });
  it("PWA-01 não é alterada por esta etapa", () => {
    const pwaSrc = readFileSync(resolve("src/pwa/pwa-config.ts"), "utf8");
    expect(pwaSrc).toContain("globPatterns");
    expect(pwaSrc).not.toMatch(/["']html["']/);
  });
});

// ---- LV-08.4.2.1 — pesquisa, IDs vinculados e permissão de leitura -------

describe("LV-08.4.2.1 · collectDistinctLinkedPersonIds", () => {
  const p1 = SEED_PERSON_ALFA_1_ID;
  const p2 = SEED_PERSON_ALFA_2_ID;
  const cp = (personId: typeof p1, id = SEED_CP_ALFA_1_ID): CasePerson => ({
    id,
    organizationId: SEED_ORG_ALFA_ID,
    caseId: SEED_CASE_ALFA_1_ID,
    personId,
    role: "applicant",
    restrictedByDefault: false,
    metadata: {
      createdAt: "2025-01-01T00:00:00.000Z" as never,
      updatedAt: "2025-01-01T00:00:00.000Z" as never,
      version: 1,
    },
  });
  it("lista vazia retorna vazio", () => {
    expect(collectDistinctLinkedPersonIds([])).toEqual([]);
  });
  it("remove duplicatas de personId preservando ordem", () => {
    const out = collectDistinctLinkedPersonIds([cp(p1), cp(p2, SEED_CP_ALFA_2_ID), cp(p1)]);
    expect(out).toEqual([p1, p2]);
  });
  it("mantém ordem da primeira ocorrência para IDs distintos", () => {
    const out = collectDistinctLinkedPersonIds([cp(p2, SEED_CP_ALFA_2_ID), cp(p1)]);
    expect(out).toEqual([p2, p1]);
  });
});

describe("LV-08.4.2.1 · filterPersonsByDisplayLabel", () => {
  const mk = (id: typeof SEED_PERSON_ALFA_1_ID, label: string): Person => ({
    id,
    organizationId: SEED_ORG_ALFA_ID,
    displayLabel: label,
    ageClassification: "adult",
    metadata: {
      createdAt: "2025-01-01T00:00:00.000Z" as never,
      updatedAt: "2025-01-01T00:00:00.000Z" as never,
      version: 1,
    },
  });
  const list: readonly Person[] = [
    mk(SEED_PERSON_ALFA_1_ID, "Requerente A"),
    mk(SEED_PERSON_ALFA_2_ID, "Testemunha B"),
  ];
  it("query vazia retorna todas as pessoas", () => {
    expect(filterPersonsByDisplayLabel(list, "")).toEqual(list);
  });
  it("query só com espaços retorna todas as pessoas", () => {
    expect(filterPersonsByDisplayLabel(list, "   ")).toEqual(list);
  });
  it("comparação é case-insensitive", () => {
    const out = filterPersonsByDisplayLabel(list, "requerente");
    expect(out.map((p) => p.displayLabel)).toEqual(["Requerente A"]);
  });
  it("subcadeia é suficiente", () => {
    const out = filterPersonsByDisplayLabel(list, "TEM");
    expect(out.map((p) => p.displayLabel)).toEqual(["Testemunha B"]);
  });
  it("consulta sem correspondência retorna lista vazia", () => {
    expect(filterPersonsByDisplayLabel(list, "zzz")).toEqual([]);
  });
  it("nunca modifica a lista original", () => {
    const copy = list.slice();
    filterPersonsByDisplayLabel(list, "a");
    expect(list).toEqual(copy);
  });
  it("preserva a ordem recebida", () => {
    const out = filterPersonsByDisplayLabel(list, "e");
    expect(out.map((p) => p.id)).toEqual([SEED_PERSON_ALFA_1_ID, SEED_PERSON_ALFA_2_ID]);
  });
});

describe("LV-08.4.2.1 · permissão de leitura criada por memberships.create", () => {
  it("proprietário Alfa cria membership 'leitura' para User 3 e o novo contexto consegue ler pessoas mas não criar", async () => {
    const env = createMockDomainEnvironment();
    const created = await env.services.memberships.create(ALFA_CTX, {
      userId: SEED_USER_3_ID,
      role: "leitura",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const readerCtx: ServiceContext = {
      organizationId: SEED_ORG_ALFA_ID,
      userId: SEED_USER_3_ID,
      membershipId: created.data.id,
      role: "leitura",
    };
    const list = await env.services.persons.list(readerCtx, { page: { limit: 5 } });
    expect(list.ok).toBe(true);
    const attempt = await env.services.persons.create(
      readerCtx,
      buildCreatePersonInput({
        displayLabel: "Sem permissão",
        ageClassification: "adult",
        role: "applicant",
        restrictedByDefault: false,
      }),
    );
    expect(attempt.ok).toBe(false);
    if (attempt.ok) return;
    const err = attempt.error as ServiceError;
    expect(err.code).toBe("forbidden");
  });
});

// ---- LV-08.4.2.1 — auditorias do diálogo de pesquisa e do retry ---------

describe("LV-08.4.2.1 · auditoria do ProcessPersonDialog", () => {
  const dlgSrc = readFileSync(
    resolve("src/features/processos/ProcessPersonDialog.tsx"),
    "utf8",
  );
  it("expõe Label visível 'Buscar pessoa' associado ao campo", () => {
    expect(dlgSrc).toMatch(/htmlFor="personSearch"[^>]*>Buscar pessoa</);
  });
  it("usa filterPersonsByDisplayLabel para reduzir a lista visível", () => {
    expect(dlgSrc).toContain("filterPersonsByDisplayLabel");
  });
  it("invalida personId quando a seleção sai do resultado filtrado", () => {
    expect(dlgSrc).toMatch(/filteredPersons\.some\([\s\S]*?p\.id === personId/);
    expect(dlgSrc).toMatch(/setPersonId\(""\)/);
  });
  it("resolve o vínculo somente dentro do resultado visível", () => {
    expect(dlgSrc).toMatch(/filteredPersons\.find\([\s\S]*?p\.id === personId/);
  });
  it("rótulo do botão do fluxo retry-created-link é 'Tentar vincular novamente'", () => {
    expect(dlgSrc).toContain("Tentar vincular novamente");
  });
  it("catálogo global não é consumido pela pesquisa (usa mode.availablePersons)", () => {
    expect(dlgSrc).toMatch(/mode\.kind === "link-existing" \? mode\.availablePersons : \[\]/);
  });
});
