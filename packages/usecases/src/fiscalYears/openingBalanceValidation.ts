import { type AccountTitleId, MonetaryAmount } from "@account-ledgers/domain";
import {
  OpeningBalanceNegativeError,
  OpeningBalanceUnbalancedError,
} from "./errors";
import type { OpeningBalance } from "./openingBalance";

/**
 * Validates opening balances: every account title amount must be non-negative
 * integer yen, and the debit and credit totals must match overall.
 */
export function validateOpeningBalance(balance: OpeningBalance): {
  debitTotal: number;
  creditTotal: number;
} {
  let debit = 0;
  let credit = 0;
  for (const [accountTitleId, amounts] of Object.entries(balance)) {
    for (const side of ["debit", "credit"] as const) {
      if (new MonetaryAmount(amounts[side]).value < 0) {
        throw new OpeningBalanceNegativeError(
          accountTitleId as AccountTitleId,
          side,
        );
      }
    }
    debit += amounts.debit;
    credit += amounts.credit;
  }

  if (debit !== credit) {
    throw new OpeningBalanceUnbalancedError(debit, credit);
  }
  return { debitTotal: debit, creditTotal: credit };
}
