import {
  type PartnerId,
  type TenantId,
} from "@account-ledgers/domain";
import { PartnerNameRequiredError } from "./errors";
import type { PartnerRepository } from "../ports/partnerRepository";

export function createPartnerUseCase(deps: { partners: PartnerRepository }) {
  return async function createPartner(input: {
    tenantId: TenantId;
    name: string;
    searchWords: string[];
  }): Promise<PartnerId> {
    const name = input.name.trim();
    if (!name) throw new PartnerNameRequiredError();
    return deps.partners.add(input.tenantId, {
      name,
      searchWords: input.searchWords,
    });
  };
}
