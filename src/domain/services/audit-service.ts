/**
 * Contrato do serviço de Auditoria — LV-08.6A.
 *
 * Somente leitura. Eventos são registrados internamente pelas escritas
 * bem-sucedidas dos demais serviços mock; não há create público, update
 * ou remove.
 */

import type { AuditEvent, AuditAction, AuditTargetType } from "../core/case-audit";
import type { CaseId } from "../core/ids";
import type { IsoDateTime } from "../core/common";
import type { ServiceContext } from "./context";
import type { ServiceResult } from "./result";
import type { PageRequest, PageResult } from "./pagination";

export type AuditEventListOptions = Readonly<{
  page?: PageRequest;
  actions?: readonly AuditAction[];
  targetTypes?: readonly AuditTargetType[];
  occurredFrom?: IsoDateTime;
  occurredTo?: IsoDateTime;
}>;

export interface AuditEventService {
  listByCase(
    context: ServiceContext,
    caseId: CaseId,
    options?: AuditEventListOptions,
  ): Promise<ServiceResult<PageResult<AuditEvent>>>;
}
