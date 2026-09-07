import type {
  TenantId,
  UserId,
  FiscalYearId,
  TransactionId,
} from "@account-ledgers/domain";
import type { FiscalYearRepository } from "../ports/fiscalYearRepository";
import type {
  TransactionDraft,
  TransactionRepository,
} from "../ports/transactionRepository";
import { getOpenFiscalYear, validateDraft } from "./shared";

export function createTransactionUseCase(deps: {
  transactions: TransactionRepository;
  fiscalYears: FiscalYearRepository;
}) {
  return async function createTransaction(input: {
    tenantId: TenantId;
    yearId: FiscalYearId;
    draft: TransactionDraft;
    createdBy: UserId;
  }): Promise<{ transactionId: TransactionId }> {
    const year = await getOpenFiscalYear(
      deps.fiscalYears,
      input.tenantId,
      input.yearId,
    );
    validateDraft(input.draft, year);
    return deps.transactions.create(input);
  };
}
