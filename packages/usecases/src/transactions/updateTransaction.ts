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

export function updateTransactionUseCase(deps: {
  transactions: TransactionRepository;
  fiscalYears: FiscalYearRepository;
}) {
  return async function updateTransaction(input: {
    tenantId: TenantId;
    yearId: FiscalYearId;
    transactionId: TransactionId;
    draft: TransactionDraft;
    updatedBy: UserId;
  }): Promise<void> {
    const year = await getOpenFiscalYear(
      deps.fiscalYears,
      input.tenantId,
      input.yearId,
    );
    validateDraft(input.draft, year);
    await deps.transactions.update(input);
  };
}
