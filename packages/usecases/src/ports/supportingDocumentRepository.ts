import type {
  SupportingDocument,
  SupportingDocumentId,
  TenantId,
  TransactionId,
} from "@account-ledgers/domain";

/** A file being uploaded as a supporting document: its metadata plus the bytes themselves. */
export interface SupportingDocumentFile {
  name: string;
  contentType: string;
  /** Bytes. */
  size: number;
  bytes: ArrayBuffer;
}

/**
 * Collection-like access to supporting documents: the record and the file behind it are
 * stored together. The attachment link is maintained by the transaction
 * repository, atomically with the transaction it points at.
 */
export interface SupportingDocumentRepository {
  /** The live (non-deleted) supporting documents attached to a transaction, newest upload first. */
  listByTransaction(
    tenantId: TenantId,
    transactionId: TransactionId,
  ): Promise<SupportingDocument[]>;
  /** The supporting document by ID, or null when it does not exist. */
  get(tenantId: TenantId, supportingDocumentId: SupportingDocumentId): Promise<SupportingDocument | null>;
  /** Stores the file and adds its record; returns the generated id. */
  add(
    tenantId: TenantId,
    supportingDocument: Omit<SupportingDocument, "id" | "uploadedAt">,
    bytes: ArrayBuffer,
  ): Promise<SupportingDocumentId>;
  /** Persists the full state of an existing supporting document. The file itself never changes. */
  save(tenantId: TenantId, supportingDocument: SupportingDocument): Promise<void>;
  /** A URL the browser can display the file from. */
  fileUrl(tenantId: TenantId, supportingDocumentId: SupportingDocumentId): Promise<string>;
}
