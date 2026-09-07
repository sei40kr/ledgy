import type { TenantId } from "@account-ledgers/domain";
import type { PartnerRepository } from "../ports/partnerRepository";

export function listPartnersUseCase(deps: { partners: PartnerRepository }) {
  return function listPartners(tenantId: TenantId) {
    return deps.partners.list(tenantId);
  };
}
