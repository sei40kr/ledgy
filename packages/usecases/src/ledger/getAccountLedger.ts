import {
  type AccountTitleCategory,
  fiscalYearMonthKeys,
  type TenantId,
  type FiscalYearId,
  type AccountTitleId,
} from "@account-ledgers/domain";
import {
  type AccountTitleLedger,
  buildAccountTitleLedger,
} from "./generalLedger";
import { FiscalYearNotFoundError } from "../fiscalYears/errors";
import type { FiscalYearRepository } from "../ports/fiscalYearRepository";
import type { MonthlyTransactionSummaryRepository } from "../ports/monthlyTransactionSummaryRepository";
import type { TransactionRepository } from "../ports/transactionRepository";

/**
 * General ledger: builds an account title's monthly balances from its opening
 * balance and the monthly transaction summaries. Individual postings come from the transaction
 * search narrowed to the month.
 */
export function getAccountLedgerUseCase(deps: {
  fiscalYears: FiscalYearRepository;
  transactions: TransactionRepository;
  monthlyTransactionSummaries: MonthlyTransactionSummaryRepository;
}) {
  return async function getAccountLedger(input: {
    tenantId: TenantId;
    yearId: FiscalYearId;
    accountTitleId: AccountTitleId;
    category: AccountTitleCategory;
  }): Promise<AccountTitleLedger> {
    const year = await deps.fiscalYears.get(input.tenantId, input.yearId);
    if (!year) {
      throw new FiscalYearNotFoundError();
    }
    const [opening, summaries] = await Promise.all([
      deps.transactions.getOpeningBalance({
        tenantId: input.tenantId,
        yearId: input.yearId,
      }),
      deps.monthlyTransactionSummaries.list(input.tenantId, input.yearId),
    ]);
    return buildAccountTitleLedger({
      accountTitleId: input.accountTitleId,
      category: input.category,
      opening: opening[input.accountTitleId],
      monthKeys: fiscalYearMonthKeys(year),
      summaries,
    });
  };
}
