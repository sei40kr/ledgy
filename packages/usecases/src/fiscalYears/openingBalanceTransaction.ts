import {
  type AccountTitleId,
  MonetaryAmount,
  type Posting,
  type PostingSide,
} from "@account-ledgers/domain";
import type { OpeningBalance } from "./openingBalance";

/**
 * The opening balance is represented by a single system-generated 元入金 transaction
 * per fiscal year, stored under a deterministic document id so saving overwrites it.
 */
export const OPENING_BALANCE_TRANSACTION_ID = "opening-balance";
export const OPENING_BALANCE_DESCRIPTION = "期首残高";

/**
 * Converts opening balances to the postings of the opening transaction: each
 * account title contributes a debit and/or credit posting for its non-zero side(s).
 */
export function openingBalanceToPostings(balance: OpeningBalance): Posting[] {
  const postings: Posting[] = [];
  for (const [accountTitleId, amounts] of Object.entries(balance)) {
    if (amounts.debit > 0) {
      postings.push(posting("debit", accountTitleId as AccountTitleId, amounts.debit));
    }
    if (amounts.credit > 0) {
      postings.push(posting("credit", accountTitleId as AccountTitleId, amounts.credit));
    }
  }
  return postings;
}

/** Rebuilds opening balances from the opening transaction's postings. */
export function postingsToOpeningBalance(postings: Posting[]): OpeningBalance {
  const balance: OpeningBalance = {};
  for (const p of postings) {
    const current = balance[p.accountTitleId] ?? { debit: 0, credit: 0 };
    if (p.side === "debit") current.debit += p.amount.value;
    else current.credit += p.amount.value;
    balance[p.accountTitleId] = current;
  }
  return balance;
}

function posting(
  side: PostingSide,
  accountTitleId: AccountTitleId,
  amount: number,
): Posting {
  return {
    side,
    accountTitleId,
    subAccountTitleId: null,
    amount: new MonetaryAmount(amount),
    taxCategory: null,
    memo: "",
  };
}
