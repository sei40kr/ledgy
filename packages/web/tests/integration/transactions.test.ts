import {
  type AccountTitleId,
  TransactionUnbalancedError,
  type FiscalYearId,
  MonetaryAmount,
  type MonthlyTransactionSummary,
  type Posting,
  type PostingSide,
  type TenantId,
  type UserId,
} from "@account-ledgers/domain";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createFiscalYearUseCases,
  createTransactionUseCases,
} from "./composeUseCases";
import {
  DateOutsideFiscalYearError,
  signUpUseCase,
  TransactionDeletedError,
} from "@account-ledgers/usecases";
import { createFirebaseAuthAdapter } from "@account-ledgers/infrastructure/auth/firebaseAuthAdapter";
import { createFirestoreFiscalYearRepository } from "@account-ledgers/infrastructure/firestore/fiscalYearRepository";
import { createFirestoreTransactionRepository } from "@account-ledgers/infrastructure/firestore/transactionRepository";
import { createFirestoreTenantRepository } from "@account-ledgers/infrastructure/firestore/tenantRepository";
import { createTestFirebase, type TestFirebase, uniqueEmail } from "./helpers";

let firebase: TestFirebase;
let tenantId: TenantId;
let yearId: FiscalYearId;
let uid: UserId;

function posting(
  side: PostingSide,
  accountTitleId: string,
  amount: number,
  memo = "",
): Posting {
  return {
    side,
    accountTitleId: accountTitleId as AccountTitleId,
    subAccountTitleId: null,
    amount: new MonetaryAmount(amount),
    taxCategory: null,
    memo,
  };
}

function usecases() {
  const fiscalYears = createFirestoreFiscalYearRepository(firebase.db);
  const transactions = createFirestoreTransactionRepository(firebase.db);
  return {
    fiscalYears: createFiscalYearUseCases({ fiscalYears, transactions }),
    transactions: createTransactionUseCases({ transactions, fiscalYears }),
  };
}

async function getSummary(monthKey: string): Promise<MonthlyTransactionSummary> {
  const snapshot = await getDoc(
    doc(
      firebase.db,
      `tenants/${tenantId}/fiscalYears/${yearId}/monthlyTransactionSummaries/${monthKey}`,
    ),
  );
  return (snapshot.data()?.totals ?? {}) as MonthlyTransactionSummary;
}

async function getTransaction(transactionId: string) {
  const snapshot = await getDoc(
    doc(
      firebase.db,
      `tenants/${tenantId}/fiscalYears/${yearId}/transactions/${transactionId}`,
    ),
  );
  return snapshot.data();
}

async function listRevisions(transactionId: string) {
  const snapshot = await getDocs(
    query(
      collection(
        firebase.db,
        `tenants/${tenantId}/fiscalYears/${yearId}/transactions/${transactionId}/revisions`,
      ),
      orderBy("createdAt", "asc"),
    ),
  );
  return snapshot.docs.map((d) => d.data());
}

beforeAll(async () => {
  firebase = createTestFirebase();
  const signUp = signUpUseCase({
    auth: createFirebaseAuthAdapter(firebase.auth),
    tenants: createFirestoreTenantRepository(firebase.db),
  });
  ({ tenantId } = await signUp({
    email: uniqueEmail("transactions"),
    password: "password123",
  }));
  uid = tenantId as string as UserId;
  yearId = await usecases().fiscalYears.create({
    tenantId,
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-12-31"),
  });
});

afterAll(async () => {
  await firebase.cleanup();
});

describe("transactions integration (real emulator, real Security Rules)", () => {
  it("create: writes the current content, header totals, and summary atomically", async () => {
    const { transactions } = usecases();

    const first = await transactions.create({
      tenantId,
      yearId,
      createdBy: uid,
      draft: {
        date: new Date("2026-01-10"),
        partners: [],
        tags: [],
        postings: [posting("debit", "cash", 10000, "売上入金"), posting("credit", "sales", 10000)],
      },
    });
    const second = await transactions.create({
      tenantId,
      yearId,
      createdBy: uid,
      draft: {
        date: new Date("2026-01-20"),
        partners: [],
        tags: [],
        postings: [
          posting("debit", "supplies", 3000, "消耗品購入"),
          posting("credit", "cash", 3000),
        ],
      },
    });

    expect(first.transactionId).toBeTruthy();
    expect(second.transactionId).toBeTruthy();

    const transaction = await getTransaction(first.transactionId);
    expect(transaction?.debitTotal).toBe(10000);
    expect(transaction?.creditTotal).toBe(10000);
    expect(transaction?.deleted).toBe(false);
    expect(transaction?.createdBy).toBe(uid);
    expect(transaction?.updatedBy).toBe(uid);

    const summary = await getSummary("202601");
    expect(summary["cash" as AccountTitleId]).toEqual({ debitTotal: 10000, creditTotal: 3000 });
    expect(summary["sales" as AccountTitleId]).toEqual({ debitTotal: 0, creditTotal: 10000 });
    expect(summary["supplies" as AccountTitleId]).toEqual({ debitTotal: 3000, creditTotal: 0 });
  });

  it("create: the domain layer rejects an unbalanced transaction and nothing is written", async () => {
    const { transactions } = usecases();
    const before = await getSummary("202602");

    await expect(
      transactions.create({
        tenantId,
        yearId,
        createdBy: uid,
        draft: {
          date: new Date("2026-02-01"),
          partners: [],
          tags: [],
          postings: [posting("debit", "cash", 1000, "不一致"), posting("credit", "sales", 999)],
        },
      }),
    ).rejects.toThrow(TransactionUnbalancedError);

    expect(await getSummary("202602")).toEqual(before);
  });

  it("create: rejects a date outside the fiscal year", async () => {
    const { transactions } = usecases();
    await expect(
      transactions.create({
        tenantId,
        yearId,
        createdBy: uid,
        draft: {
          date: new Date("2027-01-01"),
          partners: [],
          tags: [],
          postings: [posting("debit", "cash", 100, "期間外"), posting("credit", "sales", 100)],
        },
      }),
    ).rejects.toThrow(DateOutsideFiscalYearError);
  });

  it("update across months: subtracts from the old month, adds to the new, and records every version", async () => {
    const { transactions } = usecases();
    const { transactionId } = await transactions.create({
      tenantId,
      yearId,
      createdBy: uid,
      draft: {
        date: new Date("2026-03-05"),
        partners: [],
        tags: [],
        postings: [posting("debit", "travel", 5000, "旅費"), posting("credit", "cash", 5000)],
      },
    });

    await transactions.update({
      tenantId,
      yearId,
      transactionId,
      updatedBy: uid,
      draft: {
        date: new Date("2026-04-05"), // moves the transaction into another month
        partners: [],
        tags: [],
        postings: [posting("debit", "travel", 7000, "旅費(修正)"), posting("credit", "cash", 7000)],
      },
    });

    const march = await getSummary("202603");
    expect(march["travel" as AccountTitleId]).toEqual({ debitTotal: 0, creditTotal: 0 });
    const april = await getSummary("202604");
    expect(april["travel" as AccountTitleId]).toEqual({ debitTotal: 7000, creditTotal: 0 });

    const transaction = await getTransaction(transactionId);
    expect(transaction?.updatedBy).toBe(uid);
    expect(transaction?.postings[0]?.memo).toBe("旅費(修正)");

    const revisions = await listRevisions(transactionId);
    expect(revisions).toHaveLength(2);
    // each revision holds that version's full content, not a diff; ordered by createdAt
    expect(revisions[0]?.postings[0]?.memo).toBe("旅費");
    expect(revisions[0]?.postings[0]?.amount).toBe(5000);
    expect(revisions[1]?.postings[0]?.memo).toBe("旅費(修正)");
    expect(revisions[1]?.postings[0]?.amount).toBe(7000);
  });

  it("soft delete: flips deleted to true and subtracts from the summary, without hard-deleting", async () => {
    const { transactions } = usecases();
    const { transactionId } = await transactions.create({
      tenantId,
      yearId,
      createdBy: uid,
      draft: {
        date: new Date("2026-05-01"),
        partners: [],
        tags: [],
        postings: [posting("debit", "misc", 2000), posting("credit", "cash", 2000)],
      },
    });

    await transactions.softDelete({ tenantId, yearId, transactionId, updatedBy: uid });

    const transaction = await getTransaction(transactionId);
    expect(transaction).toBeDefined(); // the document itself survives
    expect(transaction?.deleted).toBe(true);

    const summary = await getSummary("202605");
    expect(summary["misc" as AccountTitleId]).toEqual({ debitTotal: 0, creditTotal: 0 });

    const revisions = await listRevisions(transactionId);
    expect(revisions.map((r) => r.deleted)).toEqual([false, true]);
    expect(revisions[1]?.postings[0]?.amount).toBe(2000);

    // a deleted transaction cannot be edited again
    await expect(
      transactions.update({
        tenantId,
        yearId,
        transactionId,
        updatedBy: uid,
        draft: {
          date: new Date("2026-05-01"),
          partners: [],
          tags: [],
          postings: [posting("debit", "misc", 1, "復活"), posting("credit", "cash", 1)],
        },
      }),
    ).rejects.toThrow(TransactionDeletedError);
  });

  it("atomicity: creating in a closed year fails, and a later create still succeeds", async () => {
    const { transactions, fiscalYears } = usecases();

    const draft = {
      date: new Date("2026-06-01"),
      partners: [],
      tags: [],
      postings: [posting("debit", "cash", 100, "原子性検証"), posting("credit", "sales", 100)],
    };

    const before = await transactions.create({
      tenantId,
      yearId,
      createdBy: uid,
      draft,
    });

    await fiscalYears.setStatus({ tenantId, yearId, status: "closed" });
    await expect(
      transactions.create({ tenantId, yearId, createdBy: uid, draft }),
    ).rejects.toThrow();
    await fiscalYears.setStatus({ tenantId, yearId, status: "open" });

    const after = await transactions.create({
      tenantId,
      yearId,
      createdBy: uid,
      draft,
    });
    // the failed create left the year writable; a distinct transaction is created
    expect(after.transactionId).toBeTruthy();
    expect(after.transactionId).not.toBe(before.transactionId);
  });
});
