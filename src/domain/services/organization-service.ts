import type { Organization } from "../core/organization";
import type { User } from "../core/access";
import type { ServiceContext } from "./context";
import type { ServiceResult } from "./result";
import type { UpdateOrganizationInput } from "./inputs";

export interface OrganizationService {
  getCurrent(context: ServiceContext): Promise<ServiceResult<Organization>>;
  update(
    context: ServiceContext,
    input: UpdateOrganizationInput,
  ): Promise<ServiceResult<Organization>>;
}

export interface CurrentUserService {
  getCurrent(context: ServiceContext): Promise<ServiceResult<User>>;
}
