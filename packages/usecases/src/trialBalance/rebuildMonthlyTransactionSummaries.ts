import {
  applyPostingsToMonthlyTransactionSummary,
  type MonthlyTransactionSummary,
  monthKeyOf,
  type TenantId,
  type FiscalYearId,
} from "@account-ledgers/domain";
import type { MonthlyTransactionSummaryRepository } from "../ports/monthlyTransactionSummaryRepository";
import type { TransactionRepository } from "../ports/transactionRepository";

/**
 * Self-healing rebuild of the monthly transaction summaries: re-reads every active
 * transaction in the fiscal year and regenerates monthlyTransactionSummaries from scratch.
 * This is the remedy when client-side aggregation has drifted.
 */
export function rebuildMonthlyTransactionSummariesUseCase(deps: {
  monthlyTransactionSummaries: MonthlyTransactionSummaryRepository;
  transactions: TransactionRepository;
}) {
  return async function rebuildMonthlyTransactionSummaries(input: {
    tenantId: TenantId;
    yearId: FiscalYearId;
  }): Promise<{ transactionCount: number; monthCount: number }> {
    const transactions = await deps.transactions.listAllActive(
      input.tenantId,
      input.yearId,
    );
    const summaries: Record<string, MonthlyTransactionSummary> = {};
    for (const transaction of transactions) {
      const monthKey = monthKeyOf(transaction.date);
      summaries[monthKey] = applyPostingsToMonthlyTransactionSummary(
        summaries[monthKey] ?? {},
        transaction.postings,
        1,
      );
    }
    await deps.monthlyTransactionSummaries.replaceAll(
      input.tenantId,
      input.yearId,
      summaries,
    );
    return {
      transactionCount: transactions.length,
      monthCount: Object.keys(summaries).length,
    };
  };
}
