import {
  type SupportingDocumentId,
  type TenantId,
  type UserId,
} from "@account-ledgers/domain";
import { SupportingDocumentNotFoundError } from "./errors";
import type { FiscalYearRepository } from "../ports/fiscalYearRepository";
import type { SupportingDocumentRepository } from "../ports/supportingDocumentRepository";
import type { TransactionRepository } from "../ports/transactionRepository";
import { getOpenFiscalYear } from "../transactions/shared";

export function deleteSupportingDocumentUseCase(deps: {
  supportingDocuments: SupportingDocumentRepository;
  transactions: TransactionRepository;
  fiscalYears: FiscalYearRepository;
}) {
  /**
   * Soft-deletes a supporting document. An attached one is first detached from its
   * transaction (a versioned change, so the year must be open); the file itself
   * is kept.
   */
  return async function deleteSupportingDocument(input: {
    tenantId: TenantId;
    supportingDocumentId: SupportingDocumentId;
    deletedBy: UserId;
  }): Promise<void> {
    const supportingDocument = await deps.supportingDocuments.get(input.tenantId, input.supportingDocumentId);
    if (!supportingDocument || supportingDocument.deleted) {
      throw new SupportingDocumentNotFoundError();
    }
    if (supportingDocument.attachedTo) {
      const { fiscalYearId, transactionId } = supportingDocument.attachedTo;
      await getOpenFiscalYear(deps.fiscalYears, input.tenantId, fiscalYearId);
      await deps.transactions.detachSupportingDocument({
        tenantId: input.tenantId,
        yearId: fiscalYearId,
        transactionId,
        supportingDocumentId: input.supportingDocumentId,
        updatedBy: input.deletedBy,
      });
    }
    await deps.supportingDocuments.save(input.tenantId, {
      ...supportingDocument,
      attachedTo: null,
      deleted: true,
    });
  };
}
