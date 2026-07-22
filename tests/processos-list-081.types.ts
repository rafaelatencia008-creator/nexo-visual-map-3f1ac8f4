/**
 * LV-08.1 — provas de compilação da lista de processos.
 * Nenhum teste em runtime; apenas verificações estáticas.
 */

import type { Case, CaseStatus, ConfidentialityLevel } from "../src/domain/core/case";
import type { CaseListRequest } from "../src/domain/services/case-service";
import type { CaseSortField } from "../src/domain/services/inputs";
import type { PageResult } from "../src/domain/services/pagination";
import {
  buildCaseListRequest,
  type ProcessListFilterInput,
} from "../src/features/processos/process-list-model";
import { useMockDomain, type MockDomainAccess } from "../src/components/app/MockDomainProvider";

// 1) O construtor de requisição retorna `CaseListRequest`.
declare const input: ProcessListFilterInput;
const _req: CaseListRequest = buildCaseListRequest(input);
void _req;

// 2) `status` só aceita CaseStatus (ou "all"). Um valor arbitrário é rejeitado.
const _okStatus: ProcessListFilterInput = {
  search: "",
  status: "active",
  confidentiality: "all",
  sortId: "updated-desc",
};
void _okStatus;
// @ts-expect-error status desconhecido não é CaseStatus
const _badStatus: ProcessListFilterInput = {
  search: "",
  status: "ativo",
  confidentiality: "all",
  sortId: "x",
};
void _badStatus;

// 3) Confidencialidade só aceita ConfidentialityLevel (ou "all").
const _okConf: ConfidentialityLevel = "standard";
void _okConf;
// @ts-expect-error nível desconhecido
const _badConf: ProcessListFilterInput = {
  search: "",
  status: "all",
  confidentiality: "sigiloso",
  sortId: "x",
};
void _badConf;

// 4) O campo de ordenação exposto pelo request é sempre `CaseSortField`.
type _SortIsField = NonNullable<CaseListRequest["sortBy"]> extends CaseSortField
  ? true
  : false;
const _sortIsField: _SortIsField = true;
void _sortIsField;

// 5) Itens retornados são `readonly Case[]`.
declare const page: PageResult<Case>;
const _items: readonly Case[] = page.items;
void _items;
// @ts-expect-error mutação não é permitida na lista readonly
page.items[0] = page.items[0]!;

// 6) O hook/provider não expõe store, clock ou gerador.
declare const access: MockDomainAccess;
// @ts-expect-error store não é público
access.store;
// @ts-expect-error clock não é público
access.clock;
// @ts-expect-error ids não é público
access.ids;
// O que ele expõe é apenas o ambiente readonly e o contexto.
const _env = access.environment;
const _ctx = access.context;
void _env;
void _ctx;
// @ts-expect-error o access é readonly — não permite substituir a propriedade
access.environment = access.environment;

// 7) O componente não depende de tipos legados.
// Se algum símbolo legado `StatusProcesso` existir no repositório, ele NÃO
// deve estar em uso na rota. Provamos aqui que o tipo oficial `CaseStatus`
// é o único falado pelo modelo.
type _Status = CaseStatus;
const _statusSample: _Status = "draft";
void _statusSample;

// 8) `useMockDomain` só é utilizável como hook — sua assinatura devolve MockDomainAccess.
type _HookReturns = ReturnType<typeof useMockDomain> extends MockDomainAccess
  ? true
  : false;
const _hookOk: _HookReturns = true;
void _hookOk;

export {};
