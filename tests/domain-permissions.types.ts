/**
 * LV-07.4 (+ LV-07.4.1) — provas de tipo.
 * Não roda testes; apenas força o compilador a verificar contratos.
 * Nenhum `any`, nenhum cast tautológico.
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
import type { PermissionMatrix } from "../src/domain/mocks/permission-mock";

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

// 5) O ambiente não expõe store, clock, gerador de IDs, nem a matriz.
// @ts-expect-error store não é público
env.store;
// @ts-expect-error clock não é público
env.clock;
// @ts-expect-error ids não é público
env.ids;
// @ts-expect-error o ambiente não expõe a matriz
env.permissionMatrix;
// @ts-expect-error services não expõe a matriz
env.services.permissionMatrix;
// @ts-expect-error services não expõe o objeto interno da matriz
env.services.permissions.matrix;

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

// 8) A propriedade `permissions` no `services` é readonly.
// @ts-expect-error services é Readonly — não permite substituição de propriedade
env.services.permissions = env.services.permissions;

// 9) `PERMISSION_ACTIONS` mantém tipagem forte quando indexado.
import { PERMISSION_ACTIONS } from "../src/domain/services/permissions";
const _actionSample: PermissionAction = PERMISSION_ACTIONS[0]!;
void _actionSample;

// 10) `PermissionMatrix` — provas de tipo do formato público da matriz.
declare const matrix: PermissionMatrix;

const _caseReadRoles: readonly Role[] = matrix["case.read"];
void _caseReadRoles;

// @ts-expect-error ação desconhecida não pertence à matriz
matrix["unknown.action"];

// @ts-expect-error arrays da matriz são readonly
matrix["case.read"].push("leitura");

// O valor da matriz continua privado ao módulo — não há export runtime.
import * as PermissionMockModule from "../src/domain/mocks/permission-mock";
type _Exports = keyof typeof PermissionMockModule;
// A união de exports pode conter apenas nomes de funções/tipos permitidos.
type _Allowed = "isActionAllowedForRole" | "createPermissionPolicyMock";
// Nenhum export chamado `PERMISSION_MATRIX` pode existir:
type _NoMatrixExport = Extract<_Exports, "PERMISSION_MATRIX"> extends never
  ? true
  : false;
const _noMatrix: _NoMatrixExport = true;
void _noMatrix;
// A união concreta deve estar contida no conjunto permitido:
type _OnlyAllowed = _Exports extends _Allowed ? true : false;
const _onlyAllowed: _OnlyAllowed = true;
void _onlyAllowed;

export {};
