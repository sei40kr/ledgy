import type {
  FiscalYearId,
  TenantId,
  Transaction,
  TransactionId,
} from "@account-ledgers/domain";
import type { TransactionRepository } from "../ports/transactionRepository";

/** Fetch a single transaction by ID, for the edit screen reached directly by URL. */
export function getTransactionUseCase(deps: {
  transactions: TransactionRepository;
}) {
  return function getTransaction(input: {
    tenantId: TenantId;
    yearId: FiscalYearId;
    transactionId: TransactionId;
  }): Promise<Transaction | null> {
    return deps.transactions.get(input);
  };
}
