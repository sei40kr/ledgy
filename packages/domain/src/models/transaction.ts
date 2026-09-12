import type {
  AccountTitleId,
  PartnerId,
  SupportingDocumentId,
  SubAccountTitleId,
  TagId,
  TransactionId,
  UserId,
} from "./ids";
import type { MonetaryAmount } from "./monetaryAmount";
import type { PostingSide } from "./postingSide";
import type { TaxCategory } from "./taxCategory";

/** Maximum number of postings per transaction. Keep in sync with the Security Rules. */
export const MAX_TRANSACTION_POSTINGS = 50;

/**
 * Kind of a system-generated transaction. A user-entered transaction has `system:
 * null`; a system-generated one names why it exists. Extensible: the opening
 * balance today, closing (決算) entries later. System-generated transactions are
 * versioned like any other, but are excluded from the monthly summaries and the journal.
 */
export type SystemTransactionKind = "openingBalance";

export interface Posting {
  side: PostingSide;
  accountTitleId: AccountTitleId;
  subAccountTitleId: SubAccountTitleId | null;
  /** Positive values only. */
  amount: MonetaryAmount;
  /** Consumption tax category. The MVP never computes it, but the schema carries it from the start. */
  taxCategory: TaxCategory | null;
  /** Free-text note; empty string when absent. */
  memo: string;
}

/**
 * One historical version of a transaction. Every write (create, update, soft
 * delete) appends a revision holding the full content as of that version — not a
 * diff — so the complete history is the revisions alone. The first revision is the
 * creation, and a version with deleted: true records the soft delete. Revisions
 * are ordered by createdAt and are loaded only when the history is viewed; the
 * current content is carried on the transaction itself.
 */
export interface TransactionRevision {
  /** Opaque identifier of this version; ordering is by createdAt, not by id. */
  id: string;
  createdBy: UserId;
  /** Recorded server-side; null only until the server timestamp resolves. */
  createdAt: Date | null;
  /** Calendar date normalized to UTC midnight. */
  date: Date;
  description: string;
  partners: PartnerId[];
  tags: TagId[];
  postings: Posting[];
  /** Supporting documents attached as of this version. Attaching and detaching are versioned like any other change. */
  supportingDocumentIds: SupportingDocumentId[];
  deleted: boolean;
  /** Non-null when this version was system-generated rather than user-entered. */
  system: SystemTransactionKind | null;
}

/**
 * A transaction carries its current content directly, so ordinary reads (get and
 * search) never touch the revisions subcollection — that history is loaded only on
 * demand. createdBy/createdAt record the original creation; updatedBy/updatedAt
 * record the latest change (equal to the creation metadata until first edited).
 */
export interface Transaction {
  id: TransactionId;
  createdBy: UserId;
  /** Recorded server-side; null only until the server timestamp resolves. */
  createdAt: Date | null;
  updatedBy: UserId;
  /** Recorded server-side; null only until the server timestamp resolves. */
  updatedAt: Date | null;
  /** Calendar date normalized to UTC midnight. */
  date: Date;
  description: string;
  partners: PartnerId[];
  tags: TagId[];
  postings: Posting[];
  /** Supporting documents attached to the transaction (never to a posting). Each supporting document is attached to at most one live transaction. */
  supportingDocumentIds: SupportingDocumentId[];
  deleted: boolean;
  /** Non-null when the transaction was system-generated rather than user-entered. */
  system: SystemTransactionKind | null;
}
