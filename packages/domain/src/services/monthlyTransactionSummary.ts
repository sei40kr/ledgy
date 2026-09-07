import type { AccountTitleId } from "../models/ids";
import type { Posting } from "../models/transaction";

/** Debit and credit totals for one account title. */
export interface AccountTitleSideTotals {
  debitTotal: number;
  creditTotal: number;
}

/** Monthly summary — the body of monthlyTransactionSummaries/{yyyymm}: accountTitleId → {debitTotal, creditTotal}. */
export type MonthlyTransactionSummary = Record<AccountTitleId, AccountTitleSideTotals>;

/** "YYYYMM" month key used as a monthlyTransactionSummaries document ID. Dates are calendar dates at UTC midnight. */
export function monthKeyOf(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}${month}`;
}

/** Lists the month keys from the first to the last month of the fiscal year, ascending. */
export function fiscalYearMonthKeys(fiscalYear: {
  startDate: Date;
  endDate: Date;
}): string[] {
  const keys: string[] = [];
  const cursor = new Date(
    Date.UTC(
      fiscalYear.startDate.getUTCFullYear(),
      fiscalYear.startDate.getUTCMonth(),
      1,
    ),
  );
  const endKey = monthKeyOf(fiscalYear.endDate);
  while (monthKeyOf(cursor) <= endKey) {
    keys.push(monthKeyOf(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return keys;
}

/**
 * Returns a new summary with the postings added (sign = 1) or removed (sign = -1).
 * Creating a transaction applies +1, soft-deleting it applies -1, and updating one
 * applies -1 to the old postings followed by +1 to the new ones.
 */
export function applyPostingsToMonthlyTransactionSummary(
  summary: MonthlyTransactionSummary,
  postings: ReadonlyArray<Posting>,
  sign: 1 | -1,
): MonthlyTransactionSummary {
  const next: MonthlyTransactionSummary = { ...summary };
  for (const posting of postings) {
    const current = next[posting.accountTitleId] ?? { debitTotal: 0, creditTotal: 0 };
    const delta = sign === 1 ? posting.amount.value : -posting.amount.value;
    next[posting.accountTitleId] = {
      debitTotal:
        posting.side === "debit" ? current.debitTotal + delta : current.debitTotal,
      creditTotal:
        posting.side === "credit" ? current.creditTotal + delta : current.creditTotal,
    };
  }
  return next;
}

/** Merges several months of summaries into one, for cumulative views and the trial balance. */
export function mergeMonthlyTransactionSummaries(
  summaries: ReadonlyArray<MonthlyTransactionSummary>,
): MonthlyTransactionSummary {
  const merged: MonthlyTransactionSummary = {};
  for (const summary of summaries) {
    const entries = Object.entries(summary) as [
      AccountTitleId,
      AccountTitleSideTotals,
    ][];
    for (const [accountTitleId, totals] of entries) {
      const current = merged[accountTitleId] ?? { debitTotal: 0, creditTotal: 0 };
      merged[accountTitleId] = {
        debitTotal: current.debitTotal + totals.debitTotal,
        creditTotal: current.creditTotal + totals.creditTotal,
      };
    }
  }
  return merged;
}
