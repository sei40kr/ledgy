import {
  type TaxCategory,
  type TenantId,
  type AccountTitleId,
} from "@account-ledgers/domain";
import type { AccountTitleRepository } from "../ports/accountTitleRepository";
import { assertNameUnique, findAccountTitle, validateName } from "./shared";

export function updateAccountTitleUseCase(deps: {
  accountTitles: AccountTitleRepository;
}) {
  return async function updateAccountTitle(input: {
    tenantId: TenantId;
    accountTitleId: AccountTitleId;
    name: string;
    defaultTaxCategory: TaxCategory | null;
    searchWords: string[];
  }): Promise<void> {
    const name = validateName(input.name);
    const existing = await deps.accountTitles.list(input.tenantId);
    assertNameUnique(existing, name, input.accountTitleId);
    const current = findAccountTitle(existing, input.accountTitleId);
    await deps.accountTitles.save(input.tenantId, {
      ...current,
      name,
      defaultTaxCategory: input.defaultTaxCategory,
      searchWords: input.searchWords,
    });
  };
}
