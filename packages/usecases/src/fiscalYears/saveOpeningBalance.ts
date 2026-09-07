import {
  type FiscalYearId,
  type TenantId,
  type UserId,
} from "@account-ledgers/domain";
import { FiscalYearClosedError, FiscalYearNotFoundError } from "./errors";
import type { OpeningBalance } from "./openingBalance";
import { validateOpeningBalance } from "./openingBalanceValidation";
import type { FiscalYearRepository } from "../ports/fiscalYearRepository";
import type { TransactionRepository } from "../ports/transactionRepository";

/**
 * Saves opening balances as the fiscal year's system-generated opening transaction.
 * The domain layer checks that they balance; all-zero account titles are dropped.
 */
export function saveOpeningBalanceUseCase(deps: {
  transactions: TransactionRepository;
  fiscalYears: FiscalYearRepository;
}) {
  return async function saveOpeningBalance(input: {
    tenantId: TenantId;
    yearId: FiscalYearId;
    balance: OpeningBalance;
    createdBy: UserId;
  }): Promise<void> {
    const year = await deps.fiscalYears.get(input.tenantId, input.yearId);
    if (!year) throw new FiscalYearNotFoundError();
    if (year.status !== "open") {
      throw new FiscalYearClosedError();
    }

    const nonZero: OpeningBalance = Object.fromEntries(
      Object.entries(input.balance).filter(
        ([, amounts]) => amounts.debit !== 0 || amounts.credit !== 0,
      ),
    );
    validateOpeningBalance(nonZero);
    await deps.transactions.saveOpeningBalance({
      tenantId: input.tenantId,
      yearId: input.yearId,
      balance: nonZero,
      date: year.startDate,
      userId: input.createdBy,
    });
  };
}
