/**
 * LV-07.4 — provas de tipo. Não roda testes; apenas força o compilador
 * a verificar contratos. Nenhum `any`, nenhum cast tautológico.
 */

import type {
  PermissionAction,
  PermissionDecision,
  PermissionPolicy,
  PermissionRequest,
} from "../src/domain/services/permissions";
import type { CaseId } from "../src/domain/core/ids";
import type { Role } from "../src/domain/shared/work-context";
import type {
  MockDomainEnvironment,
  MockDomainServices,
} from "../src/domain/mocks";

// 1) `services.permissions` satisfaz `PermissionPolicy`.
declare const env: MockDomainEnvironment;
const _policy: PermissionPolicy = env.services.permissions;
void _policy;

// 2) `PermissionDecision` é readonly: assignment ao campo `.allowed` deve falhar.
declare const decision: PermissionDecision;
// @ts-expect-error PermissionDecision.allowed é readonly
decision.allowed = false;
// @ts-expect-error PermissionDecision.reason é readonly
decision.reason = "x";

// 3) `PermissionRequest.action` rejeita string comum.
declare const req: PermissionRequest;
const _act: PermissionAction = req.action;
void _act;
// @ts-expect-error string arbitrária não é PermissionAction
const _badReq: PermissionRequest = { action: "not.an.action" };
void _badReq;

// 4) `PermissionRequest.caseId` exige `CaseId`.
// @ts-expect-error string comum não é CaseId
const _badCase: PermissionRequest = { action: "case.read", caseId: "case_x" };
void _badCase;
declare const cid: CaseId;
const _okReq: PermissionRequest = { action: "case.read", caseId: cid };
void _okReq;

// 5) O ambiente não expõe store, clock ou gerador de IDs.
// @ts-expect-error store não é público
env.store;
// @ts-expect-error clock não é público
env.clock;
// @ts-expect-error ids não é público
env.ids;

// 6) `MockDomainServices.permissions` é declarado como PermissionPolicy.
type _AssertHasPermissions = MockDomainServices["permissions"] extends PermissionPolicy
  ? true
  : false;
const _assert: _AssertHasPermissions = true;
void _assert;

// 7) `Role` é fechado.
const _r: Role = "proprietario";
void _r;
// @ts-expect-error papel desconhecido
const _badRole: Role = "hacker";
void _badRole;

// 8) A propriedade `permissions` no `services` é acessível apenas por leitura
//    (o objeto todo é `Readonly`).
// @ts-expect-error services é Readonly — não permite substituição de propriedade
env.services.permissions = env.services.permissions;

// 9) `PERMISSION_ACTIONS` mantém tipagem forte quando indexado.
import { PERMISSION_ACTIONS } from "../src/domain/services/permissions";
const _actionSample: PermissionAction = PERMISSION_ACTIONS[0]!;
void _actionSample;

export {};
