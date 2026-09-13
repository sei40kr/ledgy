import type {
  Transaction,
  Posting,
  PartnerId,
  SupportingDocumentId,
  TagId,
  TransactionRevision,
  TenantId,
  UserId,
  FiscalYearId,
  AccountTitleId,
  TransactionId,
} from "@account-ledgers/domain";
import type { OpeningBalance } from "../fiscalYears/openingBalance";

/**
 * Input for a transaction: the content the user enters. The repository owns the
 * header totals and the revision history; the attached supporting documents are managed by
 * attachSupportingDocument / detachSupportingDocument (and given once, on create).
 */
export interface TransactionDraft {
  /** Calendar date normalized to UTC midnight. */
  date: Date;
  partners: PartnerId[];
  tags: TagId[];
  postings: Posting[];
}

export interface TransactionSearchParams {
  tenantId: TenantId;
  yearId: FiscalYearId;
  dateFrom?: Date;
  dateTo?: Date;
  /** When set, limits results to transactions touching this account title, via array-contains on the denormalized accountTitleIds. */
  accountTitleId?: AccountTitleId;
  includeDeleted?: boolean;
  limit: number;
  /** The previous page's nextCursor: an opaque value whose shape is up to the repository implementation. */
  cursor?: unknown;
}

export interface TransactionsPage {
  transactions: Transaction[];
  /** Non-null only when a next page exists. */
  nextCursor: unknown | null;
}

export interface TransactionRepository {
  /**
   * Creates a transaction, doing all of the following atomically in a runTransaction:
   * validate that it balances (domain) → write the transaction with its current content
   * and header totals denormalized → record the first version in its revisions
   * subcollection → apply the delta to that month's monthlyTransactionSummaries →
   * mark each of `supportingDocumentIds` (which must be unattached) as attached to it.
   */
  create(input: {
    tenantId: TenantId;
    yearId: FiscalYearId;
    draft: TransactionDraft;
    supportingDocumentIds: SupportingDocumentId[];
    createdBy: UserId;
  }): Promise<{ transactionId: TransactionId }>;

  /**
   * Updates a transaction's content, keeping its attached supporting documents as they are.
   * Atomically records the new version's full content in the revisions
   * subcollection, subtracts the old postings from the summaries, and adds the
   * new ones, handling a transaction that moves across months. Rejects a
   * missing transaction (TransactionNotFoundError) and a soft-deleted one
   * (TransactionDeletedError).
   */
  update(input: {
    tenantId: TenantId;
    yearId: FiscalYearId;
    transactionId: TransactionId;
    draft: TransactionDraft;
    updatedBy: UserId;
  }): Promise<void>;

  /**
   * Soft-deletes a transaction by setting deleted: true; there is no hard delete.
   * Records the deleted version as a revision, subtracts from the summaries, and
   * releases its supporting documents (they stay listed in the deleted version's history but
   * become unattached again), all atomically. Rejects a missing transaction
   * (TransactionNotFoundError) and one that is already deleted
   * (TransactionDeletedError).
   */
  softDelete(input: {
    tenantId: TenantId;
    yearId: FiscalYearId;
    transactionId: TransactionId;
    updatedBy: UserId;
  }): Promise<void>;

  /**
   * Attaches an unattached supporting document to a live transaction: appends a revision
   * whose content differs only in supportingDocumentIds, updates the header, and marks the
   * supporting document as attached, atomically.
   */
  attachSupportingDocument(input: {
    tenantId: TenantId;
    yearId: FiscalYearId;
    transactionId: TransactionId;
    supportingDocumentId: SupportingDocumentId;
    updatedBy: UserId;
  }): Promise<void>;

  /**
   * The reverse of attachSupportingDocument, run by deleteSupportingDocument before the soft delete:
   * the supporting document becomes unattached again, and the change is versioned.
   */
  detachSupportingDocument(input: {
    tenantId: TenantId;
    yearId: FiscalYearId;
    transactionId: TransactionId;
    supportingDocumentId: SupportingDocumentId;
    updatedBy: UserId;
  }): Promise<void>;

  /** The transaction by ID, or null when it does not exist. */
  get(input: {
    tenantId: TenantId;
    yearId: FiscalYearId;
    transactionId: TransactionId;
  }): Promise<Transaction | null>;

  /** Every version of the transaction, oldest first (by createdAt), from its revisions subcollection. */
  listRevisions(input: {
    tenantId: TenantId;
    yearId: FiscalYearId;
    transactionId: TransactionId;
  }): Promise<TransactionRevision[]>;

  /** Cursor-paginated search ordered by date descending, then by creation time descending within a day. */
  search(params: TransactionSearchParams): Promise<TransactionsPage>;

  /**
   * Every active, user-entered transaction in the fiscal year, for
   * rebuildMonthlyTransactionSummaries. System-generated transactions (e.g. the
   * opening balance) are excluded. Pages internally until all are read.
   */
  listAllActive(tenantId: TenantId, yearId: FiscalYearId): Promise<Transaction[]>;

  /**
   * The fiscal year's opening balance, derived from its system-generated opening
   * transaction, or an empty map when none is set.
   */
  getOpeningBalance(input: {
    tenantId: TenantId;
    yearId: FiscalYearId;
  }): Promise<OpeningBalance>;

  /**
   * Creates or replaces the fiscal year's opening balance, stored as a single
   * system-generated 元入金 transaction dated at the year start. Every save appends
   * a revision like any other write; it is excluded from the monthly summaries and
   * the journal.
   */
  saveOpeningBalance(input: {
    tenantId: TenantId;
    yearId: FiscalYearId;
    balance: OpeningBalance;
    date: Date;
    userId: UserId;
  }): Promise<void>;
}
