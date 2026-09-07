import {
  fiscalYearMonthKeys,
  mergeMonthlyTransactionSummaries,
  type TenantId,
  type FiscalYearId,
} from "@account-ledgers/domain";
import {
  buildTrialBalance,
  rollForwardOpening,
  type TrialBalance,
} from "./trialBalance";
import {
  FiscalYearNotFoundError,
  MonthOutsideFiscalYearError,
} from "../fiscalYears/errors";
import type { FiscalYearRepository } from "../ports/fiscalYearRepository";
import type { MonthlyTransactionSummaryRepository } from "../ports/monthlyTransactionSummaryRepository";
import type { TransactionRepository } from "../ports/transactionRepository";

export type TrialBalanceMode = "monthly" | "cumulative";

/**
 * Trial balance.
 * - monthly: the target month's totals, over a brought-forward balance that
 *   folds in the opening balance plus every preceding month
 * - cumulative: the opening balance, over totals accumulated through the
 *   target month
 */
export function getTrialBalanceUseCase(deps: {
  fiscalYears: FiscalYearRepository;
  transactions: TransactionRepository;
  monthlyTransactionSummaries: MonthlyTransactionSummaryRepository;
}) {
  return async function getTrialBalance(input: {
    tenantId: TenantId;
    yearId: FiscalYearId;
    monthKey: string;
    mode: TrialBalanceMode;
  }): Promise<TrialBalance> {
    const year = await deps.fiscalYears.get(input.tenantId, input.yearId);
    if (!year) {
      throw new FiscalYearNotFoundError();
    }
    const monthKeys = fiscalYearMonthKeys(year);
    if (!monthKeys.includes(input.monthKey)) {
      throw new MonthOutsideFiscalYearError();
    }
    const [opening, summaries] = await Promise.all([
      deps.transactions.getOpeningBalance({
        tenantId: input.tenantId,
        yearId: input.yearId,
      }),
      deps.monthlyTransactionSummaries.list(input.tenantId, input.yearId),
    ]);

    if (input.mode === "cumulative") {
      const merged = mergeMonthlyTransactionSummaries(
        monthKeys
          .filter((key) => key <= input.monthKey)
          .map((key) => summaries[key] ?? {}),
      );
      return buildTrialBalance(opening, merged);
    }

    const prior = mergeMonthlyTransactionSummaries(
      monthKeys
        .filter((key) => key < input.monthKey)
        .map((key) => summaries[key] ?? {}),
    );
    return buildTrialBalance(
      rollForwardOpening(opening, prior),
      summaries[input.monthKey] ?? {},
    );
  };
}
