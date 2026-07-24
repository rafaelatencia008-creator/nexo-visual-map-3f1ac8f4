/**
 * LV-09.1B.6.3A / .3A.1 — Fundação das rotas canônicas da Agenda.
 *
 * Testes comportamentais do resolvedor puro de `appointmentId` e testes
 * estruturais mínimos das rotas file-based e do DEC-AGE-001.
 * Sem dependência de Git, filesystem externo ou snapshot visual.
 */

import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

import { createMockDomainEnvironment } from "@/domain/mocks";
import {
  SEED_ORG_ALFA_ID,
  SEED_USER_1_ID,
  SEED_MEM_ALFA_OWNER_ID,
  SEED_CASE_ALFA_1_ID,
} from "@/domain/mocks/seed";
import type { ServiceContext } from "@/domain/services/context";
import type { ServiceResult } from "@/domain/services/result";
import { isIsoDateTime, type IsoDateTime } from "@/domain/core/common";
import type { Appointment } from "@/domain/core/agenda";
import type {
  AppointmentService,
  AppointmentListOptions,
} from "@/domain/services/appointment-service";
import type { PageResult } from "@/domain/services/pagination";
import { isAppointmentId } from "@/domain/core/ids";
import type { AppointmentId } from "@/domain/core/ids";

import { resolveAppointmentRoute } from "@/features/agenda/resolve-appointment-route";

// ---- Helpers -------------------------------------------------------------

function dt(v: string): IsoDateTime {
  if (!isIsoDateTime(v)) throw new Error(`ISO inválido: ${v}`);
  return v;
}
function ok<T>(r: ServiceResult<T>): T {
  if (!r.ok) throw new Error("service failed: " + JSON.stringify(r.error));
  return r.data;
}

const OWNER_ALFA: ServiceContext = {
  organizationId: SEED_ORG_ALFA_ID,
  userId: SEED_USER_1_ID,
  membershipId: SEED_MEM_ALFA_OWNER_ID,
  role: "proprietario",
};

async function makeAppointment(env: ReturnType<typeof createMockDomainEnvironment>) {
  const r = await env.services.appointments.create(OWNER_ALFA, {
    caseId: SEED_CASE_ALFA_1_ID,
    kind: "hearing",
    title: "Audiência inicial",
    startsAt: dt("2026-08-14T13:00:00.000Z"),
    endsAt: dt("2026-08-14T14:00:00.000Z"),
    mode: "in_person",
  });
  return ok(r);
}

function baseAppointmentService(): AppointmentService {
  return {
    async create() {
      throw new Error("nope");
    },
    async getById() {
      throw new Error("nope");
    },
    async list(
      _ctx,
      _opts?: AppointmentListOptions,
    ): Promise<ServiceResult<PageResult<Appointment>>> {
      throw new Error("nope");
    },
    async update() {
      throw new Error("nope");
    },
    async changeStatus() {
      throw new Error("nope");
    },
    async remove() {
      throw new Error("nope");
    },
  };
}

function fakeApt(id: string): Appointment {
  return {
    id: id as AppointmentId,
  } as unknown as Appointment;
}

const VALID_ID_A = "appt_route_test_a";
const VALID_ID_B = "appt_route_test_b";
const VALID_ID_MISSING = "appt_route_missing_xyz";

// ---- Resolvedor de rota --------------------------------------------------

describe("LV-09.1B.6.3A.1 · resolveAppointmentRoute", () => {
  it("1. ID válido encontrado retorna 'found'", async () => {
    const env = createMockDomainEnvironment();
    const created = await makeAppointment(env);
    expect(isAppointmentId(String(created.id))).toBe(true);
    const r = await resolveAppointmentRoute(
      env.services.appointments,
      OWNER_ALFA,
      String(created.id),
    );
    expect(r.kind).toBe("found");
    if (r.kind !== "found") throw new Error("unreachable");
    expect(String(r.appointment.id)).toBe(String(created.id));
  });

  it("2. ID válido ausente retorna 'not_found'", async () => {
    const env = createMockDomainEnvironment();
    await makeAppointment(env);
    const r = await resolveAppointmentRoute(
      env.services.appointments,
      OWNER_ALFA,
      VALID_ID_MISSING,
    );
    expect(r.kind).toBe("not_found");
  });

  it("3. ID sintaticamente inválido retorna 'not_found'", async () => {
    const env = createMockDomainEnvironment();
    for (const bad of ["", "apt_x", "case_1", "not-an-id", "123"]) {
      const r = await resolveAppointmentRoute(env.services.appointments, OWNER_ALFA, bad);
      expect(r.kind).toBe("not_found");
    }
  });

  it("4. ID inválido executa zero chamadas ao serviço", async () => {
    let calls = 0;
    const fake: AppointmentService = {
      ...baseAppointmentService(),
      async list() {
        calls++;
        return {
          ok: true,
          data: { items: [] as readonly Appointment[] },
        } as ServiceResult<PageResult<Appointment>>;
      },
    };
    const r = await resolveAppointmentRoute(fake, OWNER_ALFA, "invalid_id");
    expect(r.kind).toBe("not_found");
    expect(calls).toBe(0);
  });

  it("5. 'forbidden' explícito do serviço permanece 'error'", async () => {
    const fake: AppointmentService = {
      ...baseAppointmentService(),
      async list() {
        return { ok: false, error: { code: "forbidden", message: "sem acesso" } };
      },
    };
    const r = await resolveAppointmentRoute(fake, OWNER_ALFA, VALID_ID_A);
    expect(r.kind).toBe("error");
    if (r.kind !== "error") throw new Error("unreachable");
    expect(r.source).toBe("appointments");
    expect(r.code).toBe("forbidden");
  });

  it("6. página vazia retorna 'not_found' e não fabrica 'forbidden'", async () => {
    const fake: AppointmentService = {
      ...baseAppointmentService(),
      async list() {
        return {
          ok: true,
          data: { items: [] as readonly Appointment[] },
        } as ServiceResult<PageResult<Appointment>>;
      },
    };
    const r = await resolveAppointmentRoute(fake, OWNER_ALFA, VALID_ID_A);
    expect(r.kind).toBe("not_found");
  });

  it("7. múltiplas páginas encontram o item", async () => {
    let call = 0;
    const fake: AppointmentService = {
      ...baseAppointmentService(),
      async list() {
        call++;
        if (call === 1) {
          return {
            ok: true,
            data: {
              items: [fakeApt("appt_other_1")] as readonly Appointment[],
              nextCursor: "c1",
            },
          } as ServiceResult<PageResult<Appointment>>;
        }
        if (call === 2) {
          return {
            ok: true,
            data: {
              items: [fakeApt("appt_other_2")] as readonly Appointment[],
              nextCursor: "c2",
            },
          } as ServiceResult<PageResult<Appointment>>;
        }
        return {
          ok: true,
          data: {
            items: [fakeApt(VALID_ID_A)] as readonly Appointment[],
          },
        } as ServiceResult<PageResult<Appointment>>;
      },
    };
    const r = await resolveAppointmentRoute(fake, OWNER_ALFA, VALID_ID_A, {
      pageLimit: 1,
      maxPages: 10,
    });
    expect(r.kind).toBe("found");
    expect(call).toBe(3);
  });

  it("8. IDs repetidos em páginas diferentes são deduplicados", async () => {
    let call = 0;
    const fake: AppointmentService = {
      ...baseAppointmentService(),
      async list() {
        call++;
        if (call === 1) {
          return {
            ok: true,
            data: {
              items: [fakeApt(VALID_ID_B)] as readonly Appointment[],
              nextCursor: "c1",
            },
          } as ServiceResult<PageResult<Appointment>>;
        }
        if (call === 2) {
          // Repete o mesmo id, ainda sem o alvo.
          return {
            ok: true,
            data: {
              items: [fakeApt(VALID_ID_B)] as readonly Appointment[],
              nextCursor: "c2",
            },
          } as ServiceResult<PageResult<Appointment>>;
        }
        return {
          ok: true,
          data: {
            items: [fakeApt(VALID_ID_A)] as readonly Appointment[],
          },
        } as ServiceResult<PageResult<Appointment>>;
      },
    };
    const r = await resolveAppointmentRoute(fake, OWNER_ALFA, VALID_ID_A, {
      maxPages: 5,
    });
    expect(r.kind).toBe("found");
    // Deduplicação NÃO impediu que a 3ª página fosse consultada.
    expect(call).toBe(3);
  });

  it("9. término normal do cursor retorna 'not_found'", async () => {
    let call = 0;
    const fake: AppointmentService = {
      ...baseAppointmentService(),
      async list() {
        call++;
        if (call === 1) {
          return {
            ok: true,
            data: {
              items: [fakeApt("appt_x")] as readonly Appointment[],
              nextCursor: "c1",
            },
          } as ServiceResult<PageResult<Appointment>>;
        }
        return {
          ok: true,
          data: {
            items: [fakeApt("appt_y")] as readonly Appointment[],
          },
        } as ServiceResult<PageResult<Appointment>>;
      },
    };
    const r = await resolveAppointmentRoute(fake, OWNER_ALFA, VALID_ID_A);
    expect(r.kind).toBe("not_found");
    expect(call).toBe(2);
  });

  it("10. maxPages com nextCursor pendente retorna 'error/internal_error'", async () => {
    let call = 0;
    const fake: AppointmentService = {
      ...baseAppointmentService(),
      async list() {
        call++;
        return {
          ok: true,
          data: {
            items: [] as readonly Appointment[],
            nextCursor: `c${call}`,
          },
        } as ServiceResult<PageResult<Appointment>>;
      },
    };
    const r = await resolveAppointmentRoute(fake, OWNER_ALFA, VALID_ID_A, {
      maxPages: 3,
    });
    expect(r.kind).toBe("error");
    if (r.kind !== "error") throw new Error("unreachable");
    expect(r.code).toBe("internal_error");
    expect(r.message).toBe("appointment_route_pagination_exhausted");
    expect(call).toBe(3);
  });

  it("11. cursor repetido retorna 'error/internal_error' (anti-loop)", async () => {
    let call = 0;
    const fake: AppointmentService = {
      ...baseAppointmentService(),
      async list() {
        call++;
        return {
          ok: true,
          data: {
            items: [] as readonly Appointment[],
            nextCursor: "same",
          },
        } as ServiceResult<PageResult<Appointment>>;
      },
    };
    const r = await resolveAppointmentRoute(fake, OWNER_ALFA, VALID_ID_A, {
      maxPages: 50,
    });
    expect(r.kind).toBe("error");
    if (r.kind !== "error") throw new Error("unreachable");
    expect(r.code).toBe("internal_error");
    expect(r.message).toBe("appointment_route_pagination_cycle");
    // Só a 2ª chamada expôs a repetição de cursor.
    expect(call).toBe(2);
  });

  it("12. pageLimit inválido usa default seguro", async () => {
    for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      let receivedLimit: number | undefined;
      const fake: AppointmentService = {
        ...baseAppointmentService(),
        async list(_ctx, opts) {
          receivedLimit = opts?.page?.limit;
          return {
            ok: true,
            data: { items: [] as readonly Appointment[] },
          } as ServiceResult<PageResult<Appointment>>;
        },
      };
      const r = await resolveAppointmentRoute(fake, OWNER_ALFA, VALID_ID_A, {
        pageLimit: bad,
      });
      expect(r.kind).toBe("not_found");
      expect(receivedLimit).toBe(100);
    }
  });

  it("13. maxPages inválido usa default seguro", async () => {
    for (const bad of [0, -5, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      let calls = 0;
      const fake: AppointmentService = {
        ...baseAppointmentService(),
        async list() {
          calls++;
          if (calls > 100) {
            return {
              ok: true,
              data: { items: [] as readonly Appointment[] },
            } as ServiceResult<PageResult<Appointment>>;
          }
          return {
            ok: true,
            data: {
              items: [] as readonly Appointment[],
              nextCursor: `c${calls}`,
            },
          } as ServiceResult<PageResult<Appointment>>;
        },
      };
      const r = await resolveAppointmentRoute(fake, OWNER_ALFA, VALID_ID_A, {
        maxPages: bad,
      });
      // default 50: esgota antes de terminar; retorna 'error'.
      expect(r.kind).toBe("error");
      expect(calls).toBe(50);
    }
  });
});

// ---- Rota /novo · helper resolveAgendaNovoCaseId --------------------------

import { resolveAgendaNovoCaseId } from "@/features/agenda/route-params";
import { buildDomainId, isCaseId as _isCaseId } from "@/domain/core/ids";

describe("LV-09.1B.6.3A.2 · resolveAgendaNovoCaseId (helper puro)", () => {
  const validCaseId = buildDomainId("case", "alfa_1");

  it("14a. um CaseId oficial válido é retornado", () => {
    const r = resolveAgendaNovoCaseId(String(validCaseId));
    expect(r).toBe(validCaseId);
    expect(_isCaseId(r)).toBe(true);
  });

  it("14b. string vazia retorna undefined", () => {
    expect(resolveAgendaNovoCaseId("")).toBeUndefined();
  });

  it("14c. string com prefixo incorreto retorna undefined", () => {
    expect(resolveAgendaNovoCaseId("person_alfa_1")).toBeUndefined();
    expect(resolveAgendaNovoCaseId("appt_alfa_1")).toBeUndefined();
  });

  it("14d. string malformada retorna undefined", () => {
    expect(resolveAgendaNovoCaseId("case_")).toBeUndefined();
    expect(resolveAgendaNovoCaseId("case_ !!")).toBeUndefined();
    expect(resolveAgendaNovoCaseId("not-an-id")).toBeUndefined();
  });

  it("14e. null retorna undefined", () => {
    expect(resolveAgendaNovoCaseId(null)).toBeUndefined();
  });

  it("14f. undefined retorna undefined", () => {
    expect(resolveAgendaNovoCaseId(undefined)).toBeUndefined();
  });

  it("14g. número retorna undefined", () => {
    expect(resolveAgendaNovoCaseId(0)).toBeUndefined();
    expect(resolveAgendaNovoCaseId(42)).toBeUndefined();
    expect(resolveAgendaNovoCaseId(Number.NaN)).toBeUndefined();
  });

  it("14h. objeto retorna undefined", () => {
    expect(resolveAgendaNovoCaseId({})).toBeUndefined();
    expect(resolveAgendaNovoCaseId({ caseId: String(validCaseId) })).toBeUndefined();
  });

  it("14i. array retorna undefined", () => {
    expect(resolveAgendaNovoCaseId([])).toBeUndefined();
    expect(resolveAgendaNovoCaseId([String(validCaseId)])).toBeUndefined();
  });

  it("14j. chamadas repetidas são determinísticas", () => {
    const a = resolveAgendaNovoCaseId(String(validCaseId));
    const b = resolveAgendaNovoCaseId(String(validCaseId));
    expect(a).toBe(b);
    expect(resolveAgendaNovoCaseId("nope")).toBe(resolveAgendaNovoCaseId("nope"));
  });

  it("14k. a função não lança para nenhuma entrada", () => {
    const inputs: unknown[] = [
      null,
      undefined,
      "",
      "case_ok",
      123,
      {},
      [],
      Symbol("x"),
      () => 0,
      BigInt(1),
    ];
    for (const v of inputs) {
      expect(() => resolveAgendaNovoCaseId(v)).not.toThrow();
    }
  });
});

describe("LV-09.1B.6.3A.2 · integração com validateSearch em /app/agenda/novo", () => {
  it("15. app.agenda.novo.tsx usa resolveAgendaNovoCaseId dentro de validateSearch", () => {
    const src = readFileSync("src/routes/app.agenda.novo.tsx", "utf8");
    expect(src).toContain("resolveAgendaNovoCaseId");
    expect(src).toContain("validateSearch");
    // O helper é referenciado dentro de validateSearch, e nenhum cast bruto sobrevive.
    expect(src).toMatch(/validateSearch[\s\S]*resolveAgendaNovoCaseId\(search\.caseId\)/);
    expect(src).not.toMatch(/as\s+CaseId/);
    expect(src).not.toMatch(/as\s+unknown\s+as\s+CaseId/);
  });
});

// ---- Estrutura das rotas file-based --------------------------------------

describe("LV-09.1B.6.3A.1 · rotas canônicas file-based", () => {
  it("16. rota pai app.agenda.tsx é layout com Outlet e Provider", () => {
    const src = readFileSync("src/routes/app.agenda.tsx", "utf8");
    expect(src).toContain('createFileRoute("/app/agenda")');
    expect(src).toContain("AgendaRouteStateProvider");
    expect(src).toContain("<Outlet />");
  });

  it("17. rota índice existe e declara /app/agenda/", () => {
    const src = readFileSync("src/routes/app.agenda.index.tsx", "utf8");
    expect(src).toContain('createFileRoute("/app/agenda/")');
    expect(src).toContain("useAgendaRouteState");
  });

  it("18. rota canônica de criação existe", () => {
    const src = readFileSync("src/routes/app.agenda.novo.tsx", "utf8");
    expect(src).toContain('createFileRoute("/app/agenda/novo")');
    expect(src).toContain("AgendaCreateDialog");
  });

  it("19. rota canônica de detalhe de compromisso existe", () => {
    const src = readFileSync("src/routes/app.agenda.$appointmentId.tsx", "utf8");
    expect(src).toContain('createFileRoute("/app/agenda/$appointmentId")');
    expect(src).toContain("resolveAppointmentRoute");
    expect(src).toContain("AgendaItemDetailDialog");
  });

  it("20. routeTree.gen.ts reflete as três rotas canônicas", () => {
    const gen = readFileSync("src/routeTree.gen.ts", "utf8");
    expect(gen.includes("/app/agenda/novo")).toBe(true);
    expect(gen.includes("/app/agenda/$appointmentId")).toBe(true);
    expect(gen.includes("/app/agenda/")).toBe(true);
  });

  it("21. rota pai não define botão Novo item nem monta diálogos", () => {
    const src = readFileSync("src/routes/app.agenda.tsx", "utf8");
    expect(src).not.toContain("Novo item");
    expect(src).not.toContain("AgendaCreateDialog");
    expect(src).not.toContain("AgendaItemDetailDialog");
  });

  it("22. rota /novo navega de volta ao /app/agenda ao fechar", () => {
    const src = readFileSync("src/routes/app.agenda.novo.tsx", "utf8");
    expect(src).toContain('to: "/app/agenda"');
  });

  it("23. rota /novo navega diretamente ao detalhe após criar compromisso", () => {
    const src = readFileSync("src/routes/app.agenda.novo.tsx", "utf8");
    expect(src).toContain('to: "/app/agenda/$appointmentId"');
  });

  it("24. rota /novo registra pendingCreated para prazo antes de navegar", () => {
    const src = readFileSync("src/routes/app.agenda.novo.tsx", "utf8");
    expect(src).toContain("setPendingCreated");
    expect(src).toContain("requiredGeneration");
  });

  it("25. rota de detalhe oferece caminho de volta em not_found/erro", () => {
    const src = readFileSync("src/routes/app.agenda.$appointmentId.tsx", "utf8");
    expect(src).toContain("Voltar para a agenda");
    expect(src).toContain('"not_found"');
    expect(src).toContain('"error"');
  });
});

// ---- Escopo: arquivos antecipados da LV-09.1B.7 foram removidos ---------

describe("LV-09.1B.6.3A.1 · escopo (LV-09.1B.7 não iniciada)", () => {
  it("26. src/features/agenda/availability.ts não existe", () => {
    expect(existsSync("src/features/agenda/availability.ts")).toBe(false);
  });
  it("27. src/features/agenda/check-appointment-availability.ts não existe", () => {
    expect(existsSync("src/features/agenda/check-appointment-availability.ts")).toBe(false);
  });
  it("28. tests/agenda-091b7.test.ts não existe", () => {
    expect(existsSync("tests/agenda-091b7.test.ts")).toBe(false);
  });
  it("29. não há rota /app/disponibilidade", () => {
    expect(existsSync("src/routes/app.disponibilidade.tsx")).toBe(false);
  });
});

// ---- DEC-AGE-001 reflete o estado real -----------------------------------

describe("LV-09.1B.6.3A.1 · DEC-AGE-001", () => {
  const dec = readFileSync("docs/decisions/DEC-AGE-001-rotas-canonicas.md", "utf8");
  it("30. DEC menciona a condição transitória (diálogos montados diretamente)", () => {
    expect(dec).toMatch(/transit[óo]ri/i);
    expect(dec).toContain("AgendaCreateDialog");
    expect(dec).toContain("AgendaItemDetailDialog");
  });
  it("31. DEC menciona a parcela B como pendente", () => {
    expect(dec).toContain("LV-09.1B.6.3B");
    expect(dec).toMatch(/pendente|n[ãa]o iniciad/i);
  });
  it("32. DEC não afirma que os componentes Content já existem", () => {
    // Devem aparecer apenas como pendência (linhas com 'não'/'ainda não').
    expect(dec).toMatch(
      /ainda\s+n[ãa]o[^.]*AgendaCreateContent|AgendaCreateContent[^.]*ainda\s+n[ãa]o|n[ãa]o[^.]*criad[oa]s[^.]*AgendaCreateContent/i,
    );
  });
  it("33. DEC informa que a LV-09.1B.7 não está iniciada", () => {
    expect(dec).toContain("LV-09.1B.7");
    expect(dec).toMatch(/n[ãa]o\s+(est[áa]|foi)\s+iniciad/i);
  });
});
