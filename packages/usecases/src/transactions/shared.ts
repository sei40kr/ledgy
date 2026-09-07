import {
  type FiscalYear,
  validatePostings,
  type TenantId,
  type FiscalYearId,
} from "@account-ledgers/domain";
import {
  DateOutsideFiscalYearError,
  FiscalYearClosedError,
  FiscalYearNotFoundError,
} from "../fiscalYears/errors";
import type { FiscalYearRepository } from "../ports/fiscalYearRepository";
import type { TransactionDraft } from "../ports/transactionRepository";

/** Loads the fiscal year and refuses to touch transactions of a closed one. */
export async function getOpenFiscalYear(
  fiscalYears: FiscalYearRepository,
  tenantId: TenantId,
  yearId: FiscalYearId,
): Promise<FiscalYear> {
  const year = await fiscalYears.get(tenantId, yearId);
  if (!year) {
    throw new FiscalYearNotFoundError();
  }
  if (year.status !== "open") {
    throw new FiscalYearClosedError();
  }
  return year;
}

export function validateDraft(
  draft: TransactionDraft,
  year: FiscalYear,
): void {
  if (!year.contains(draft.date)) {
    throw new DateOutsideFiscalYearError();
  }
  // Check that the transaction balances. The repository re-checks inside its transaction.
  validatePostings(draft.postings);
}
