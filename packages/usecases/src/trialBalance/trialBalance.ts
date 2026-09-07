import type {
  AccountTitleId,
  MonthlyTransactionSummary,
} from "@account-ledgers/domain";
import type { OpeningBalance } from "../fiscalYears/openingBalance";

/**
 * Folds the cumulative summary of the preceding months into the opening
 * balances and returns the brought-forward balance for the target month in the
 * same shape as an opening balance (accountTitleId → {debit, credit}).
 * Used by the monthly mode of the trial balance.
 */
export function rollForwardOpening(
  opening: OpeningBalance,
  priorSummary: MonthlyTransactionSummary,
): OpeningBalance {
  const accountTitleIds = new Set([
    ...Object.keys(opening),
    ...Object.keys(priorSummary),
  ] as AccountTitleId[]);
  const result: OpeningBalance = {};
  for (const accountTitleId of accountTitleIds) {
    const openingAmounts = opening[accountTitleId] ?? { debit: 0, credit: 0 };
    const totals = priorSummary[accountTitleId] ?? { debitTotal: 0, creditTotal: 0 };
    const net =
      openingAmounts.debit +
      totals.debitTotal -
      openingAmounts.credit -
      totals.creditTotal;
    result[accountTitleId] =
      net < 0 ? { debit: 0, credit: -net } : { debit: net, credit: 0 };
  }
  return result;
}

/** One row of the trial balance. Every amount is integer yen. */
export interface TrialBalanceRow {
  accountTitleId: AccountTitleId;
  openingDebit: number;
  openingCredit: number;
  debitTotal: number;
  creditTotal: number;
  /** Closing balance: a debit balance lands in closingDebit, a credit balance in closingCredit. */
  closingDebit: number;
  closingCredit: number;
}

export interface TrialBalanceTotals {
  openingDebit: number;
  openingCredit: number;
  debitTotal: number;
  creditTotal: number;
  closingDebit: number;
  closingCredit: number;
}

export interface TrialBalance {
  rows: TrialBalanceRow[];
  totals: TrialBalanceTotals;
  /** Whether grand total debits equal grand total credits — the double-entry consistency check. */
  isBalanced: boolean;
}

/**
 * Builds a trial balance from the opening balances and a period summary (a
 * single month or a cumulative one). `rows` covers every account title appearing in
 * either input; the caller is responsible for sorting them by the account title
 * master's sortOrder.
 */
export function buildTrialBalance(
  opening: OpeningBalance,
  summary: MonthlyTransactionSummary,
): TrialBalance {
  const accountTitleIds = new Set([
    ...Object.keys(opening),
    ...Object.keys(summary),
  ] as AccountTitleId[]);

  const rows: TrialBalanceRow[] = [];
  for (const accountTitleId of accountTitleIds) {
    const openingAmounts = opening[accountTitleId] ?? { debit: 0, credit: 0 };
    const totals = summary[accountTitleId] ?? { debitTotal: 0, creditTotal: 0 };
    // closing = (opening debit + debit total) - (opening credit + credit total)
    const net =
      openingAmounts.debit +
      totals.debitTotal -
      openingAmounts.credit -
      totals.creditTotal;
    rows.push({
      accountTitleId,
      openingDebit: openingAmounts.debit,
      openingCredit: openingAmounts.credit,
      debitTotal: totals.debitTotal,
      creditTotal: totals.creditTotal,
      closingDebit: net < 0 ? 0 : net,
      closingCredit: net < 0 ? -net : 0,
    });
  }

  const totals: TrialBalanceTotals = {
    openingDebit: 0,
    openingCredit: 0,
    debitTotal: 0,
    creditTotal: 0,
    closingDebit: 0,
    closingCredit: 0,
  };
  for (const row of rows) {
    totals.openingDebit += row.openingDebit;
    totals.openingCredit += row.openingCredit;
    totals.debitTotal += row.debitTotal;
    totals.creditTotal += row.creditTotal;
    totals.closingDebit += row.closingDebit;
    totals.closingCredit += row.closingCredit;
  }

  const isBalanced =
    totals.openingDebit + totals.debitTotal ===
      totals.openingCredit + totals.creditTotal &&
    totals.closingDebit === totals.closingCredit;

  return { rows, totals, isBalanced };
}
