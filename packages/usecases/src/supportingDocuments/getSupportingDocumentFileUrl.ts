import type { SupportingDocumentId, TenantId } from "@account-ledgers/domain";
import type { SupportingDocumentRepository } from "../ports/supportingDocumentRepository";

export function getSupportingDocumentFileUrlUseCase(deps: { supportingDocuments: SupportingDocumentRepository }) {
  /** A URL the browser can display the supporting document's file from. */
  return async function getSupportingDocumentFileUrl(input: {
    tenantId: TenantId;
    supportingDocumentId: SupportingDocumentId;
  }): Promise<string> {
    return deps.supportingDocuments.fileUrl(input.tenantId, input.supportingDocumentId);
  };
}
