import type { SubAccountTitle,
  TenantId,
  AccountTitleId,
} from "@account-ledgers/domain";
import type { AccountTitleRepository } from "../ports/accountTitleRepository";

export function listSubAccountTitlesUseCase(deps: {
  accountTitles: AccountTitleRepository;
}) {
  return function listSubAccountTitles(
    tenantId: TenantId,
    accountTitleId: AccountTitleId,
  ): Promise<SubAccountTitle[]> {
    return deps.accountTitles.listSubAccountTitles(tenantId, accountTitleId);
  };
}
