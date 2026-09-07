import {
  type AccountTitleCategory,
  type TaxCategory,
  type TenantId,
  type AccountTitleId,
} from "@account-ledgers/domain";
import type { AccountTitleRepository } from "../ports/accountTitleRepository";
import { assertNameUnique, validateName } from "./shared";

export function createAccountTitleUseCase(deps: {
  accountTitles: AccountTitleRepository;
}) {
  return async function createAccountTitle(input: {
    tenantId: TenantId;
    name: string;
    category: AccountTitleCategory;
    defaultTaxCategory: TaxCategory | null;
    searchWords: string[];
  }): Promise<AccountTitleId> {
    const name = validateName(input.name);
    const existing = await deps.accountTitles.list(input.tenantId);
    assertNameUnique(existing, name);
    const sortOrder = Math.max(0, ...existing.map((a) => a.sortOrder)) + 10;
    return deps.accountTitles.add(input.tenantId, {
      name,
      category: input.category,
      isActive: true,
      defaultTaxCategory: input.defaultTaxCategory,
      searchWords: input.searchWords,
      sortOrder,
    });
  };
}
