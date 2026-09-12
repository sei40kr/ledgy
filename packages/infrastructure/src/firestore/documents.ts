// Stored (DTO) shapes of the Firestore documents, kept separate from the domain
// models. Each converter maps between one of these and its model. The doc id is
// never part of the DTO: on read it comes from the snapshot, on write from the ref.
// Value objects are flattened to their stored primitives (e.g. a tax category to
// its code string), and metadata timestamps are Firestore Timestamps.
import type { Timestamp } from "firebase/firestore";

export interface AccountTitleDocument {
  name: string;
  category: string;
  isActive: boolean;
  defaultTaxCategory: string | null;
  searchWords: string[];
  sortOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SubAccountTitleDocument {
  name: string;
  isActive: boolean;
  searchWords: string[];
  sortOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PartnerDocument {
  name: string;
  searchWords: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TagDocument {
  name: string;
  searchWords: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * A supporting document's record. The file itself is the Cloud Storage object at
 * `tenants/{tenantId}/supportingDocuments/{supportingDocumentId}`. transactionId / fiscalYearId are the
 * attachment link, both null while unattached; transactionId is what the
 * "supporting documents of this transaction" query filters on.
 */
export interface SupportingDocumentDocument {
  fileName: string;
  contentType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Timestamp;
  transactionId: string | null;
  fiscalYearId: string | null;
  deleted: boolean;
  updatedAt: Timestamp;
}

export interface FiscalYearDocument {
  startDate: Timestamp;
  endDate: Timestamp;
  status: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PostingDocument {
  side: string;
  accountTitleId: string;
  subAccountTitleId: string | null;
  amount: number;
  taxCategory: string | null;
  memo: string;
}

/**
 * The transaction header: its current content plus the denormalized totals the
 * Security Rules check. The full history lives in the revisions subcollection,
 * and currentRevision names the entry the header mirrors.
 */
export interface TransactionDocument {
  createdBy: string;
  createdAt: Timestamp;
  updatedBy: string;
  updatedAt: Timestamp;
  currentRevision: string;
  date: Timestamp;
  description: string;
  partners: string[];
  tags: string[];
  postings: PostingDocument[];
  supportingDocumentIds: string[];
  deleted: boolean;
  system: string | null;
  accountTitleIds: string[];
  debitTotal: number;
  creditTotal: number;
}

export interface TransactionRevisionDocument {
  createdBy: string;
  createdAt: Timestamp;
  date: Timestamp;
  description: string;
  partners: string[];
  tags: string[];
  postings: PostingDocument[];
  supportingDocumentIds: string[];
  deleted: boolean;
  system: string | null;
}
