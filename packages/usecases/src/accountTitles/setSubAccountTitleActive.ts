import type {
  TenantId,
  AccountTitleId,
  SubAccountTitleId,
} from "@account-ledgers/domain";
import type { AccountTitleRepository } from "../ports/accountTitleRepository";
import { findSubAccountTitle } from "./shared";

export function setSubAccountTitleActiveUseCase(deps: {
  accountTitles: AccountTitleRepository;
}) {
  return async function setSubAccountTitleActive(input: {
    tenantId: TenantId;
    accountTitleId: AccountTitleId;
    subAccountTitleId: SubAccountTitleId;
    isActive: boolean;
  }): Promise<void> {
    const existing = await deps.accountTitles.listSubAccountTitles(
      input.tenantId,
      input.accountTitleId,
    );
    const current = findSubAccountTitle(existing, input.subAccountTitleId);
    await deps.accountTitles.saveSubAccountTitle(
      input.tenantId,
      input.accountTitleId,
      { ...current, isActive: input.isActive },
    );
  };
}
