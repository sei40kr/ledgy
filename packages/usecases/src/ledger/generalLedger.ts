import {
  type AccountTitleCategory,
  type AccountTitleId,
  type MonthlyTransactionSummary,
  normalBalanceSide,
} from "@account-ledgers/domain";
import type { OpeningBalanceAmounts } from "../fiscalYears/openingBalance";

/** A monthly row of the general ledger. `balance` is signed integer yen, positive on the normal balance side. */
export interface LedgerMonthRow {
  monthKey: string;
  debitTotal: number;
  creditTotal: number;
  balance: number;
}

export interface AccountTitleLedger {
  /** Opening balance, signed with the normal balance side as positive. */
  openingBalance: number;
  months: LedgerMonthRow[];
  closingBalance: number;
}

/**
 * Builds the general ledger for a single account title: monthly debit totals, credit
 * totals, and running balance. The balance accumulates the monthly transaction summaries on
 * top of the opening balance.
 */
export function buildAccountTitleLedger(params: {
  accountTitleId: AccountTitleId;
  category: AccountTitleCategory;
  opening: OpeningBalanceAmounts | undefined;
  /** Month keys within the fiscal year, ascending. Obtained from fiscalYearMonthKeys(). */
  monthKeys: string[];
  /** monthKey → monthly summary. */
  summaries: Record<string, MonthlyTransactionSummary>;
}): AccountTitleLedger {
  const { accountTitleId, category, opening, monthKeys, summaries } = params;
  const side = normalBalanceSide(category);

  const openingNet =
    side === "debit"
      ? (opening?.debit ?? 0) - (opening?.credit ?? 0)
      : (opening?.credit ?? 0) - (opening?.debit ?? 0);

  let balance = openingNet;
  const months: LedgerMonthRow[] = [];
  for (const monthKey of monthKeys) {
    const totals = summaries[monthKey]?.[accountTitleId] ?? {
      debitTotal: 0,
      creditTotal: 0,
    };
    balance +=
      side === "debit"
        ? totals.debitTotal - totals.creditTotal
        : totals.creditTotal - totals.debitTotal;
    months.push({
      monthKey,
      debitTotal: totals.debitTotal,
      creditTotal: totals.creditTotal,
      balance,
    });
  }

  return {
    openingBalance: openingNet,
    months,
    closingBalance: balance,
  };
}
