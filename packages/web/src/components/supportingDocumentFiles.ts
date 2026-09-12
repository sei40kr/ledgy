import {
  MAX_SUPPORTING_DOCUMENT_FILE_SIZE,
  type SupportingDocument,
  SUPPORTING_DOCUMENT_CONTENT_TYPES,
} from "@account-ledgers/domain";
import type { SupportingDocumentFile } from "@account-ledgers/usecases";

// Presentation-side helpers for supporting document files: the picker's accept list, the
// browser File → SupportingDocumentFile conversion, and display formatting.

/** The MIME types the file pickers accept; the domain validates again on upload. */
export const SUPPORTING_DOCUMENT_ACCEPT: string[] = [...SUPPORTING_DOCUMENT_CONTENT_TYPES];

export const SUPPORTING_DOCUMENT_MAX_FILES = 20;

export { MAX_SUPPORTING_DOCUMENT_FILE_SIZE };

/** Reads a browser File into the shape the upload usecase takes. */
export async function toSupportingDocumentFile(file: File): Promise<SupportingDocumentFile> {
  return {
    name: file.name,
    contentType: file.type,
    size: file.size,
    bytes: await file.arrayBuffer(),
  };
}

export function isImageSupportingDocument(supportingDocument: Pick<SupportingDocument, "contentType">): boolean {
  return supportingDocument.contentType.startsWith("image/");
}

/** "12.3 KB" style size, for lists. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
