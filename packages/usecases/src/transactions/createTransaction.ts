import type {
  TenantId,
  UserId,
  FiscalYearId,
  SupportingDocumentId,
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
    /** Supporting documents uploaded ahead of the transaction, attached to it on creation. */
    supportingDocumentIds?: SupportingDocumentId[];
    createdBy: UserId;
  }): Promise<{ transactionId: TransactionId }> {
    const year = await getOpenFiscalYear(
      deps.fiscalYears,
      input.tenantId,
      input.yearId,
    );
    validateDraft(input.draft, year);
    return deps.transactions.create({
      ...input,
      supportingDocumentIds: [...new Set(input.supportingDocumentIds ?? [])],
    });
  };
}
