import {
  type SupportingDocumentId,
  type TenantId,
  type UserId,
  validateSupportingDocumentFile,
} from "@account-ledgers/domain";
import { SupportingDocumentFileNameRequiredError } from "./errors";
import type {
  SupportingDocumentFile,
  SupportingDocumentRepository,
} from "../ports/supportingDocumentRepository";

export function uploadSupportingDocumentUseCase(deps: { supportingDocuments: SupportingDocumentRepository }) {
  return async function uploadSupportingDocument(input: {
    tenantId: TenantId;
    file: SupportingDocumentFile;
    uploadedBy: UserId;
  }): Promise<SupportingDocumentId> {
    const fileName = input.file.name.trim();
    if (!fileName) throw new SupportingDocumentFileNameRequiredError();
    const contentType = validateSupportingDocumentFile(input.file);
    return deps.supportingDocuments.add(
      input.tenantId,
      {
        fileName,
        contentType,
        size: input.file.size,
        uploadedBy: input.uploadedBy,
        attachedTo: null,
        deleted: false,
      },
      input.file.bytes,
    );
  };
}
