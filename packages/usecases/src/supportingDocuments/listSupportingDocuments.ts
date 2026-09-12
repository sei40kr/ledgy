import type {
  SupportingDocument,
  TenantId,
  TransactionId,
} from "@account-ledgers/domain";
import type { SupportingDocumentRepository } from "../ports/supportingDocumentRepository";

export function listSupportingDocumentsUseCase(deps: { supportingDocuments: SupportingDocumentRepository }) {
  /** The supporting documents attached to a transaction, newest first. */
  return async function listSupportingDocuments(input: {
    tenantId: TenantId;
    transactionId: TransactionId;
  }): Promise<SupportingDocument[]> {
    return deps.supportingDocuments.listByTransaction(input.tenantId, input.transactionId);
  };
}
