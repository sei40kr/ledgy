import {
  applyPostingsToMonthlyTransactionSummary,
  MonetaryAmount,
  type Posting,
  type MonthlyTransactionSummary,
  monthKeyOf,
  TaxCategory,
  type TransactionRevision,
  validatePostings,
} from "@account-ledgers/domain";
import {
  collection,
  doc,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type FirestoreDataConverter,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  runTransaction,
  serverTimestamp,
  type SnapshotOptions,
  startAfter,
  type Transaction as FirestoreTransaction,
  where,
} from "firebase/firestore";
import type {
  PartnerId,
  SystemTransactionKind,
  TagId,
  Transaction,
  TransactionId,
  UserId,
} from "@account-ledgers/domain";
import {
  OPENING_BALANCE_DESCRIPTION,
  OPENING_BALANCE_TRANSACTION_ID,
  openingBalanceToPostings,
  postingsToOpeningBalance,
  TransactionDeletedError,
  TransactionNotFoundError,
  type TransactionRepository,
} from "@account-ledgers/usecases";
import type {
  TransactionDocument,
  TransactionRevisionDocument,
} from "./documents";
import {
  transactionRevisionsPath,
  transactionsPath,
  monthlyTransactionSummariesPath,
} from "./paths";

/** Collects the distinct account title IDs across the postings, for array-contains search by account title. */
function extractAccountTitleIds(postings: Posting[]): string[] {
  return [...new Set(postings.map((posting) => posting.accountTitleId))];
}

/**
 * The transaction header carries its current content directly, alongside the
 * creation/update metadata and the denormalized totals the Security Rules check.
 * The revisions subcollection remains the tamper-proof source of truth for the
 * full history, but ordinary reads never touch it.
 *
 * This converter serves the read path (get/search/listAllActive). The header
 * writes stay bespoke because they run inside runTransaction and add the
 * denormalized totals (accountTitleIds/debitTotal/creditTotal); toFirestore maps
 * only the content the model itself owns.
 */
const transactionConverter: FirestoreDataConverter<Transaction> = {
  toFirestore(transaction: Transaction): DocumentData {
    return {
      createdBy: transaction.createdBy,
      updatedBy: transaction.updatedBy,
      date: transaction.date,
      description: transaction.description,
      partners: transaction.partners,
      tags: transaction.tags,
      system: transaction.system,
      postings: normalizePostings(transaction.postings),
      deleted: transaction.deleted,
      updatedAt: serverTimestamp(),
    };
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options?: SnapshotOptions,
  ): Transaction {
    const d = snapshot.data(options) as TransactionDocument;
    return {
      id: snapshot.id as TransactionId,
      createdBy: d.createdBy as UserId,
      createdAt: d.createdAt?.toDate() ?? null,
      updatedBy: d.updatedBy as UserId,
      updatedAt: d.updatedAt?.toDate() ?? null,
      date: d.date.toDate(),
      description: d.description,
      partners: (d.partners ?? []) as PartnerId[],
      tags: (d.tags ?? []) as TagId[],
      system: (d.system ?? null) as SystemTransactionKind | null,
      postings: toPostings(d.postings),
      deleted: d.deleted,
    };
  },
};

/** Read/write mapping for one version in the revisions subcollection. */
const transactionRevisionConverter: FirestoreDataConverter<TransactionRevision> = {
  toFirestore(revision: TransactionRevision): DocumentData {
    return {
      createdBy: revision.createdBy,
      date: revision.date,
      description: revision.description,
      partners: revision.partners,
      tags: revision.tags,
      system: revision.system,
      postings: normalizePostings(revision.postings),
      deleted: revision.deleted,
      createdAt: serverTimestamp(),
    };
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options?: SnapshotOptions,
  ): TransactionRevision {
    const d = snapshot.data(options) as TransactionRevisionDocument;
    return {
      id: snapshot.id,
      createdBy: d.createdBy as UserId,
      createdAt: d.createdAt?.toDate() ?? null,
      date: d.date.toDate(),
      description: d.description,
      partners: (d.partners ?? []) as PartnerId[],
      tags: (d.tags ?? []) as TagId[],
      system: (d.system ?? null) as SystemTransactionKind | null,
      postings: toPostings(d.postings),
      deleted: d.deleted,
    };
  },
};

/**
 * Firestore cannot store undefined or value objects, so normalize the postings by
 * filling in nulls and flattening the amount and the tax category to the integer
 * and code string they are stored as.
 */
function normalizePostings(postings: Posting[]): DocumentData[] {
  return postings.map((posting) => ({
    side: posting.side,
    accountTitleId: posting.accountTitleId,
    subAccountTitleId: posting.subAccountTitleId ?? null,
    amount: posting.amount.value,
    taxCategory: posting.taxCategory?.code ?? null,
    memo: posting.memo ?? "",
  }));
}

/** Rebuilds postings read from Firestore, restoring the amount and tax category value objects. */
function toPostings(raw: DocumentData[]): Posting[] {
  return raw.map((posting) => ({
    side: posting.side,
    accountTitleId: posting.accountTitleId,
    subAccountTitleId: posting.subAccountTitleId ?? null,
    amount: new MonetaryAmount(posting.amount),
    taxCategory: posting.taxCategory ? new TaxCategory(posting.taxCategory) : null,
    memo: posting.memo ?? "",
  }));
}

async function readSummary(
  tx: FirestoreTransaction,
  ref: DocumentReference,
): Promise<MonthlyTransactionSummary> {
  const snapshot = await tx.get(ref);
  return (snapshot.data()?.totals ?? {}) as MonthlyTransactionSummary;
}

function writeSummary(
  tx: FirestoreTransaction,
  ref: DocumentReference,
  totals: MonthlyTransactionSummary,
): void {
  tx.set(ref, { totals, updatedAt: serverTimestamp() });
}

/**
 * Repository implementation that creates, updates, and soft-deletes transactions
 * atomically via runTransaction. Firestore requires every read to precede every
 * write, so the counter, the existing transaction, and the summaries are all read
 * before anything is written.
 */
export function createFirestoreTransactionRepository(
  db: Firestore,
): TransactionRepository {
  return {
    async create({ tenantId, yearId, draft, createdBy }) {
      return runTransaction(db, async (tx) => {
        // The domain layer checks that the transaction balances.
        const { debitTotal, creditTotal } = validatePostings(draft.postings);

        // --- reads ---
        const monthKey = monthKeyOf(draft.date);
        const summaryRef = doc(
          db,
          monthlyTransactionSummariesPath(tenantId, yearId),
          monthKey,
        );
        const summary = await readSummary(tx, summaryRef);

        // --- writes ---
        const content = {
          date: draft.date,
          description: draft.description,
          partners: draft.partners,
          tags: draft.tags,
          system: null,
          postings: normalizePostings(draft.postings),
          deleted: false,
        };
        // The first version of the transaction's history holds the content.
        const transactionRef = doc(collection(db, transactionsPath(tenantId, yearId)));
        const currentRevision = writeRevision(tx, db, tenantId, yearId, transactionRef.id, {
          createdBy,
          ...content,
        });
        // The header carries the current content directly, plus the link to the
        // revision it mirrors and the denormalized totals the Security Rules
        // check. updatedBy/updatedAt start equal to the creation metadata.
        tx.set(transactionRef, {
          createdBy,
          createdAt: serverTimestamp(),
          updatedBy: createdBy,
          updatedAt: serverTimestamp(),
          ...content,
          currentRevision,
          accountTitleIds: extractAccountTitleIds(draft.postings),
          debitTotal,
          creditTotal,
        });
        // Apply the delta to that month's monthlyTransactionSummaries.
        writeSummary(tx, summaryRef, applyPostingsToMonthlyTransactionSummary(summary, draft.postings, 1));

        return { transactionId: transactionRef.id as TransactionId };
      });
    },

    async update({ tenantId, yearId, transactionId, draft, updatedBy }) {
      await runTransaction(db, async (tx) => {
        const { debitTotal, creditTotal } = validatePostings(draft.postings);

        // --- reads ---
        const transactionRef = doc(db, transactionsPath(tenantId, yearId), transactionId);
        const transactionSnapshot = await tx.get(transactionRef);
        if (!transactionSnapshot.exists()) {
          throw new TransactionNotFoundError();
        }
        const current = transactionSnapshot.data();
        if (current.deleted) {
          throw new TransactionDeletedError();
        }

        const oldMonthKey = monthKeyOf(current.date.toDate());
        const newMonthKey = monthKeyOf(draft.date);
        const summariesPath = monthlyTransactionSummariesPath(tenantId, yearId);
        const oldSummaryRef = doc(db, summariesPath, oldMonthKey);
        const oldPostings = toPostings(current.postings);

        // The date may move the transaction to another month, so read every summary we
        // could need before writing any of them.
        const oldSummary = await readSummary(tx, oldSummaryRef);
        const newSummaryRef =
          oldMonthKey === newMonthKey
            ? null
            : doc(db, summariesPath, newMonthKey);
        const newSummary = newSummaryRef
          ? await readSummary(tx, newSummaryRef)
          : null;

        // --- writes ---
        const content = {
          date: draft.date,
          description: draft.description,
          partners: draft.partners,
          tags: draft.tags,
          system: null,
          postings: normalizePostings(draft.postings),
          deleted: false,
        };
        // The new version's full content goes into the history.
        const currentRevision = writeRevision(tx, db, tenantId, yearId, transactionId, {
          createdBy: updatedBy,
          ...content,
        });

        if (newSummaryRef === null || newSummary === null) {
          // Still the same month: subtract the old postings, then add the new ones.
          writeSummary(
            tx,
            oldSummaryRef,
            applyPostingsToMonthlyTransactionSummary(
              applyPostingsToMonthlyTransactionSummary(oldSummary, oldPostings, -1),
              draft.postings,
              1,
            ),
          );
        } else {
          writeSummary(
            tx,
            oldSummaryRef,
            applyPostingsToMonthlyTransactionSummary(oldSummary, oldPostings, -1),
          );
          writeSummary(
            tx,
            newSummaryRef,
            applyPostingsToMonthlyTransactionSummary(newSummary, draft.postings, 1),
          );
        }

        tx.update(transactionRef, {
          ...content,
          currentRevision,
          accountTitleIds: extractAccountTitleIds(draft.postings),
          debitTotal,
          creditTotal,
          updatedBy,
          updatedAt: serverTimestamp(),
        });
      });
    },

    async softDelete({ tenantId, yearId, transactionId, updatedBy }) {
      await runTransaction(db, async (tx) => {
        // --- reads ---
        const transactionRef = doc(db, transactionsPath(tenantId, yearId), transactionId);
        const transactionSnapshot = await tx.get(transactionRef);
        if (!transactionSnapshot.exists()) {
          throw new TransactionNotFoundError();
        }
        const current = transactionSnapshot.data();
        if (current.deleted) {
          throw new TransactionDeletedError();
        }

        const summaryRef = doc(
          db,
          monthlyTransactionSummariesPath(tenantId, yearId),
          monthKeyOf(current.date.toDate()),
        );
        const summary = await readSummary(tx, summaryRef);

        // --- writes ---
        // The deleted version is itself a revision: same content, deleted flipped.
        const currentRevision = writeRevision(tx, db, tenantId, yearId, transactionId, {
          createdBy: updatedBy,
          ...deletedVersionOf(current),
        });
        writeSummary(
          tx,
          summaryRef,
          applyPostingsToMonthlyTransactionSummary(summary, toPostings(current.postings), -1),
        );
        tx.update(transactionRef, {
          deleted: true,
          updatedBy,
          updatedAt: serverTimestamp(),
          currentRevision,
        });
      });
    },

    async get({ tenantId, yearId, transactionId }) {
      const snapshot = await getDoc(
        doc(db, transactionsPath(tenantId, yearId), transactionId).withConverter(
          transactionConverter,
        ),
      );
      return snapshot.data() ?? null;
    },

    async listRevisions({ tenantId, yearId, transactionId }) {
      const snapshot = await getDocs(
        query(
          collection(
            db,
            transactionRevisionsPath(tenantId, yearId, transactionId),
          ).withConverter(transactionRevisionConverter),
          orderBy("createdAt", "asc"),
        ),
      );
      return snapshot.docs.map((revisionDoc) => revisionDoc.data());
    },

    async listAllActive(tenantId, yearId) {
      const all: Transaction[] = [];
      let cursor: unknown;
      for (;;) {
        const page = await this.search({
          tenantId,
          yearId,
          limit: 300,
          cursor,
        });
        all.push(...page.transactions);
        if (!page.nextCursor) return all;
        cursor = page.nextCursor;
      }
    },

    async search(params) {
      const constraints: QueryConstraint[] = [];
      if (!params.includeDeleted) {
        constraints.push(where("deleted", "==", false));
      }
      if (params.accountTitleId) {
        constraints.push(where("accountTitleIds", "array-contains", params.accountTitleId));
      }
      if (params.dateFrom) {
        constraints.push(where("date", ">=", params.dateFrom));
      }
      if (params.dateTo) {
        constraints.push(where("date", "<=", params.dateTo));
      }
      constraints.push(orderBy("date", "desc"), orderBy("createdAt", "desc"));
      if (params.cursor) {
        constraints.push(
          startAfter(params.cursor as QueryDocumentSnapshot<DocumentData>),
        );
      }
      constraints.push(limit(params.limit));

      const snapshot = await getDocs(
        query(
          collection(
            db,
            transactionsPath(params.tenantId, params.yearId),
          ).withConverter(transactionConverter),
          ...constraints,
        ),
      );
      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      return {
        // System-generated transactions (the opening balance) never appear in the
        // journal; the page/cursor is still keyed off the raw query.
        transactions: snapshot.docs
          .map((d) => d.data())
          .filter((t) => t.system === null),
        nextCursor:
          snapshot.docs.length === params.limit && lastDoc ? lastDoc : null,
      };
    },

    async getOpeningBalance({ tenantId, yearId }) {
      const snapshot = await getDoc(
        doc(
          db,
          transactionsPath(tenantId, yearId),
          OPENING_BALANCE_TRANSACTION_ID,
        ).withConverter(transactionConverter),
      );
      const transaction = snapshot.data();
      if (!transaction || transaction.deleted) return {};
      return postingsToOpeningBalance(transaction.postings);
    },

    async saveOpeningBalance({ tenantId, yearId, balance, date, userId }) {
      await runTransaction(db, async (tx) => {
        const ref = doc(
          db,
          transactionsPath(tenantId, yearId),
          OPENING_BALANCE_TRANSACTION_ID,
        );
        const existing = (await tx.get(ref)).data();
        const postings = openingBalanceToPostings(balance);

        if (postings.length === 0) {
          // No opening balance: soft-delete the transaction if it exists, keeping
          // its last postings so the header stays a valid (balanced) document.
          if (existing && !existing.deleted) {
            const currentRevision = writeRevision(tx, db, tenantId, yearId, ref.id, {
              createdBy: userId,
              ...deletedVersionOf(existing),
            });
            tx.update(ref, {
              deleted: true,
              updatedBy: userId,
              updatedAt: serverTimestamp(),
              currentRevision,
            });
          }
          return;
        }

        const debitTotal = postings
          .filter((p) => p.side === "debit")
          .reduce((sum, p) => sum + p.amount.value, 0);
        const creditTotal = postings
          .filter((p) => p.side === "credit")
          .reduce((sum, p) => sum + p.amount.value, 0);

        const content = {
          date,
          description: OPENING_BALANCE_DESCRIPTION,
          partners: [] as PartnerId[],
          tags: [] as TagId[],
          system: "openingBalance" as const,
          postings: normalizePostings(postings),
          deleted: false,
        };
        // Versioned like every other write. On update, the createdBy/createdAt of
        // the first save are preserved (the Security Rules pin them).
        const currentRevision = writeRevision(tx, db, tenantId, yearId, ref.id, {
          createdBy: userId,
          ...content,
        });
        tx.set(ref, {
          createdBy: existing?.createdBy ?? userId,
          createdAt: existing?.createdAt ?? serverTimestamp(),
          updatedBy: userId,
          updatedAt: serverTimestamp(),
          ...content,
          currentRevision,
          accountTitleIds: extractAccountTitleIds(postings),
          debitTotal,
          creditTotal,
        });
      });
    },
  };
}

/** The stored header's content as the soft-deleted version: same content, deleted flipped. */
function deletedVersionOf(
  current: DocumentData,
): Omit<TransactionRevision, "id" | "createdAt" | "createdBy" | "postings"> & {
  postings: DocumentData[];
} {
  return {
    date: current.date.toDate(),
    description: current.description,
    partners: (current.partners ?? []) as PartnerId[],
    tags: (current.tags ?? []) as TagId[],
    system: (current.system ?? null) as SystemTransactionKind | null,
    postings: current.postings as DocumentData[],
    deleted: true,
  };
}

/**
 * Appends one version to the transaction's revisions subcollection under a fresh
 * auto-generated ID and returns that ID, for the header's currentRevision link.
 * Versions are ordered by createdAt. The Security Rules only allow `create` on
 * revisions, so a version, once written, can never be overwritten or erased.
 */
function writeRevision(
  tx: FirestoreTransaction,
  db: Firestore,
  tenantId: string,
  yearId: string,
  transactionId: string,
  revision: Omit<TransactionRevision, "id" | "createdAt" | "postings"> & {
    postings: DocumentData[];
  },
): string {
  const revisionRef = doc(
    collection(db, transactionRevisionsPath(tenantId, yearId, transactionId)),
  );
  tx.set(revisionRef, {
    ...revision,
    createdAt: serverTimestamp(),
  });
  return revisionRef.id;
}
