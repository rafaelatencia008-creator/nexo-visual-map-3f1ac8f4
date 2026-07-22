/**
 * LV-08.2 — provas de compilação do formulário de novo processo.
 * Somente verificações estáticas.
 */

import type { Case, CaseStatus, ConfidentialityLevel } from "../src/domain/core/case";
import type { CreateCaseInput } from "../src/domain/services/inputs";
import type { ServiceResult } from "../src/domain/services/result";
import type { CaseService } from "../src/domain/services/case-service";
import {
  buildCreateCaseInput,
  decideProcessCreateExit,
  type ProcessCreateExitDecision,
  type ProcessCreateFormValues,
} from "../src/features/processos/process-create-model";

declare const values: ProcessCreateFormValues;

// 1) O construtor retorna CreateCaseInput.
const input: CreateCaseInput = buildCreateCaseInput(values);
void input;

// 2) confidentiality aceita somente ConfidentialityLevel.
const _okConf: ProcessCreateFormValues = {
  reference: "R",
  title: "T",
  confidentiality: "standard",
};
void _okConf;
const _badConf: ProcessCreateFormValues = {
  reference: "R",
  title: "T",
  // @ts-expect-error nível desconhecido não é ConfidentialityLevel
  confidentiality: "sigiloso",
};
void _badConf;

// 3) CreateCaseInput contém somente reference, title, confidentiality.
type _Keys = keyof CreateCaseInput;
const _keys: _Keys[] = ["reference", "title", "confidentiality"];
void _keys;

// 4) Campos proibidos não podem ser enviados.
// @ts-expect-error id não é permitido em CreateCaseInput
const _withId: CreateCaseInput = { ...input, id: "case_x" };
void _withId;
// @ts-expect-error organizationId não é permitido em CreateCaseInput
const _withOrg: CreateCaseInput = { ...input, organizationId: "org_x" };
void _withOrg;
// @ts-expect-error status não é permitido em CreateCaseInput
const _withStatus: CreateCaseInput = { ...input, status: "draft" };
void _withStatus;
// @ts-expect-error metadata não é permitida em CreateCaseInput
const _withMeta: CreateCaseInput = { ...input, metadata: {} };
void _withMeta;
// @ts-expect-error clienteId (legado) não é permitido
const _withCliente: CreateCaseInput = { ...input, clienteId: "x" };
void _withCliente;
// @ts-expect-error vara (legado) não é permitida
const _withVara: CreateCaseInput = { ...input, vara: "x" };
void _withVara;
// @ts-expect-error comarca (legado) não é permitida
const _withComarca: CreateCaseInput = { ...input, comarca: "x" };
void _withComarca;

// 5) cases.create devolve ServiceResult<Case>.
declare const svc: CaseService;
declare const ctx: import("../src/domain/services/context").ServiceContext;
type _CreateReturn = Awaited<ReturnType<typeof svc.create>>;
const _createReturn: _CreateReturn = null as unknown as ServiceResult<Case>;
void _createReturn;
void svc.create(ctx, input);

// 6) O processo criado tem CaseStatus, não `StatusProcesso` legado.
declare const created: Case;
const _s: CaseStatus = created.status;
void _s;
// @ts-expect-error `StatusProcesso` não existe como tipo do domínio oficial
type _Legacy = StatusProcesso;

export {};
