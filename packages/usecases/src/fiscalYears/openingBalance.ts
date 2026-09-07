import type { AccountTitleId } from "@account-ledgers/domain";

/** One account title's opening balance: non-negative integer yen on the debit or credit side. */
export interface OpeningBalanceAmounts {
  debit: number;
  credit: number;
}

/** Opening balances as an accountTitleId → {debit, credit} map (a single Firestore document). */
export type OpeningBalance = Record<AccountTitleId, OpeningBalanceAmounts>;
