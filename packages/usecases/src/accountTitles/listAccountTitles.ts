import type { AccountTitle,
  TenantId,
} from "@account-ledgers/domain";
import type { AccountTitleRepository } from "../ports/accountTitleRepository";

export function listAccountTitlesUseCase(deps: {
  accountTitles: AccountTitleRepository;
}) {
  return function listAccountTitles(tenantId: TenantId): Promise<AccountTitle[]> {
    return deps.accountTitles.list(tenantId);
  };
}
