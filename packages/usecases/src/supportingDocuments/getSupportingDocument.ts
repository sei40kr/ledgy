import type { SupportingDocument, SupportingDocumentId, TenantId } from "@account-ledgers/domain";
import type { SupportingDocumentRepository } from "../ports/supportingDocumentRepository";

export function getSupportingDocumentUseCase(deps: { supportingDocuments: SupportingDocumentRepository }) {
  /** The supporting document by ID; null when it does not exist or was deleted. */
  return async function getSupportingDocument(input: {
    tenantId: TenantId;
    supportingDocumentId: SupportingDocumentId;
  }): Promise<SupportingDocument | null> {
    const supportingDocument = await deps.supportingDocuments.get(input.tenantId, input.supportingDocumentId);
    return supportingDocument && !supportingDocument.deleted ? supportingDocument : null;
  };
}
