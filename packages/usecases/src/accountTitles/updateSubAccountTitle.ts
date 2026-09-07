import {
  type TenantId,
  type AccountTitleId,
  type SubAccountTitleId,
} from "@account-ledgers/domain";
import type { AccountTitleRepository } from "../ports/accountTitleRepository";
import { findSubAccountTitle, validateName } from "./shared";

export function updateSubAccountTitleUseCase(deps: {
  accountTitles: AccountTitleRepository;
}) {
  return async function updateSubAccountTitle(input: {
    tenantId: TenantId;
    accountTitleId: AccountTitleId;
    subAccountTitleId: SubAccountTitleId;
    name: string;
    searchWords: string[];
  }): Promise<void> {
    const name = validateName(input.name);
    const existing = await deps.accountTitles.listSubAccountTitles(
      input.tenantId,
      input.accountTitleId,
    );
    const current = findSubAccountTitle(existing, input.subAccountTitleId);
    await deps.accountTitles.saveSubAccountTitle(
      input.tenantId,
      input.accountTitleId,
      { ...current, name, searchWords: input.searchWords },
    );
  };
}
