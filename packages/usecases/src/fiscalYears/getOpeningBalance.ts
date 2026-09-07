import type { TenantId, FiscalYearId } from "@account-ledgers/domain";
import type { OpeningBalance } from "./openingBalance";
import type { TransactionRepository } from "../ports/transactionRepository";

export function getOpeningBalanceUseCase(deps: {
  transactions: TransactionRepository;
}) {
  return function getOpeningBalance(
    tenantId: TenantId,
    yearId: FiscalYearId,
  ): Promise<OpeningBalance> {
    return deps.transactions.getOpeningBalance({ tenantId, yearId });
  };
}
