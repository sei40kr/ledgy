import type {
  TenantId,
  AccountTitleId,
} from "@account-ledgers/domain";
import type { AccountTitleRepository } from "../ports/accountTitleRepository";
import { findAccountTitle } from "./shared";

/** An account title in use cannot be deleted, only deactivated. No delete API is exposed. */
export function setAccountTitleActiveUseCase(deps: {
  accountTitles: AccountTitleRepository;
}) {
  return async function setAccountTitleActive(input: {
    tenantId: TenantId;
    accountTitleId: AccountTitleId;
    isActive: boolean;
  }): Promise<void> {
    const existing = await deps.accountTitles.list(input.tenantId);
    const current = findAccountTitle(existing, input.accountTitleId);
    await deps.accountTitles.save(input.tenantId, {
      ...current,
      isActive: input.isActive,
    });
  };
}
