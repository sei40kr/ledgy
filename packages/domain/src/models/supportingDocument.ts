import { DomainError } from "../errors";
import type { FiscalYearId, SupportingDocumentId, TransactionId, UserId } from "./ids";

/**
 * File types a supporting document may be: a PDF, or an image a browser can display.
 * Keep in sync with the Security Rules (firestore.rules and storage.rules).
 */
export const SUPPORTING_DOCUMENT_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type SupportingDocumentContentType = (typeof SUPPORTING_DOCUMENT_CONTENT_TYPES)[number];

/** Largest supporting document file accepted, in bytes. Keep in sync with the Security Rules. */
export const MAX_SUPPORTING_DOCUMENT_FILE_SIZE = 20 * 1024 * 1024;

/** A file type other than the accepted PDF and image types. */
export class SupportingDocumentContentTypeUnsupportedError extends DomainError {}

export class SupportingDocumentFileEmptyError extends DomainError {}

export class SupportingDocumentFileTooLargeError extends DomainError {
  /** `maxSize` is the limit in bytes. */
  constructor(readonly maxSize: number) {
    super();
  }
}

/**
 * The transaction a supporting document is attached to. Transactions are scoped by fiscal
 * year, so both IDs are needed to find it.
 */
export interface SupportingDocumentAttachment {
  fiscalYearId: FiscalYearId;
  transactionId: TransactionId;
}

/**
 * A supporting document (証憑): one uploaded PDF or image kept as evidence of a
 * transaction. A supporting document exists on its own — it can be uploaded first and
 * attached when the transaction is entered — and is attached to at most one
 * live transaction at a time, to the transaction rather than to a posting. The
 * file itself is immutable: a corrected scan is a new supporting document. Removing a
 * supporting document is a soft delete.
 */
export interface SupportingDocument {
  id: SupportingDocumentId;
  /** The name the file was uploaded under. */
  fileName: string;
  contentType: SupportingDocumentContentType;
  /** File size in bytes. */
  size: number;
  uploadedBy: UserId;
  /** Recorded server-side; null only until the server timestamp resolves. */
  uploadedAt: Date | null;
  /** The live transaction the supporting document is attached to, or null while unattached. */
  attachedTo: SupportingDocumentAttachment | null;
  deleted: boolean;
}

function isSupportingDocumentContentType(value: string): value is SupportingDocumentContentType {
  return (SUPPORTING_DOCUMENT_CONTENT_TYPES as readonly string[]).includes(value);
}

/**
 * Guards every file entering the domain as a supporting document: only the accepted types,
 * non-empty, and within the size limit. Returns the narrowed content type.
 */
export function validateSupportingDocumentFile(file: {
  contentType: string;
  size: number;
}): SupportingDocumentContentType {
  if (!isSupportingDocumentContentType(file.contentType)) {
    throw new SupportingDocumentContentTypeUnsupportedError();
  }
  if (!Number.isSafeInteger(file.size) || file.size <= 0) {
    throw new SupportingDocumentFileEmptyError();
  }
  if (file.size > MAX_SUPPORTING_DOCUMENT_FILE_SIZE) {
    throw new SupportingDocumentFileTooLargeError(MAX_SUPPORTING_DOCUMENT_FILE_SIZE);
  }
  return file.contentType;
}
