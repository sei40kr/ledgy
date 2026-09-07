import type {
  TenantId,
  UserId,
  FiscalYearId,
  TransactionId,
} from "@account-ledgers/domain";
import type { FiscalYearRepository } from "../ports/fiscalYearRepository";
import type { TransactionRepository } from "../ports/transactionRepository";
import { getOpenFiscalYear } from "./shared";

export function softDeleteTransactionUseCase(deps: {
  transactions: TransactionRepository;
  fiscalYears: FiscalYearRepository;
}) {
  return async function softDeleteTransaction(input: {
    tenantId: TenantId;
    yearId: FiscalYearId;
    transactionId: TransactionId;
    updatedBy: UserId;
  }): Promise<void> {
    await getOpenFiscalYear(deps.fiscalYears, input.tenantId, input.yearId);
    await deps.transactions.softDelete(input);
  };
}
