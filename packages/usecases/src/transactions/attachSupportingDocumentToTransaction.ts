import type {
  FiscalYearId,
  SupportingDocumentId,
  TenantId,
  TransactionId,
  UserId,
} from "@account-ledgers/domain";
import type { FiscalYearRepository } from "../ports/fiscalYearRepository";
import type { TransactionRepository } from "../ports/transactionRepository";
import { getOpenFiscalYear } from "./shared";

export function attachSupportingDocumentToTransactionUseCase(deps: {
  transactions: TransactionRepository;
  fiscalYears: FiscalYearRepository;
}) {
  return async function attachSupportingDocumentToTransaction(input: {
    tenantId: TenantId;
    yearId: FiscalYearId;
    transactionId: TransactionId;
    supportingDocumentId: SupportingDocumentId;
    updatedBy: UserId;
  }): Promise<void> {
    await getOpenFiscalYear(deps.fiscalYears, input.tenantId, input.yearId);
    await deps.transactions.attachSupportingDocument(input);
  };
}
