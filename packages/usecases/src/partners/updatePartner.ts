import {
  type PartnerId,
  type TenantId,
} from "@account-ledgers/domain";
import { PartnerNameRequiredError, PartnerNotFoundError } from "./errors";
import type { PartnerRepository } from "../ports/partnerRepository";

export function updatePartnerUseCase(deps: { partners: PartnerRepository }) {
  return async function updatePartner(input: {
    tenantId: TenantId;
    partnerId: PartnerId;
    name: string;
    searchWords: string[];
  }): Promise<void> {
    const name = input.name.trim();
    if (!name) throw new PartnerNameRequiredError();
    const existing = await deps.partners.list(input.tenantId);
    const current = existing.find((p) => p.id === input.partnerId);
    if (!current) throw new PartnerNotFoundError();
    await deps.partners.save(input.tenantId, {
      ...current,
      name,
      searchWords: input.searchWords,
    });
  };
}
