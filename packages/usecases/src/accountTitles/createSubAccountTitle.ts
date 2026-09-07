import {
  type TenantId,
  type AccountTitleId,
  type SubAccountTitleId,
} from "@account-ledgers/domain";
import type { AccountTitleRepository } from "../ports/accountTitleRepository";
import { validateName } from "./shared";

export function createSubAccountTitleUseCase(deps: {
  accountTitles: AccountTitleRepository;
}) {
  return async function createSubAccountTitle(input: {
    tenantId: TenantId;
    accountTitleId: AccountTitleId;
    name: string;
    searchWords: string[];
  }): Promise<SubAccountTitleId> {
    const name = validateName(input.name);
    const existing = await deps.accountTitles.listSubAccountTitles(
      input.tenantId,
      input.accountTitleId,
    );
    const sortOrder = Math.max(0, ...existing.map((s) => s.sortOrder)) + 10;
    return deps.accountTitles.addSubAccountTitle(
      input.tenantId,
      input.accountTitleId,
      {
        name,
        isActive: true,
        searchWords: input.searchWords,
        sortOrder,
      },
    );
  };
}
