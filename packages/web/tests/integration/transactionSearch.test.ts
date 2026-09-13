import {
  MonetaryAmount,
  type Posting,
  type PostingSide,
  type TenantId,
  type FiscalYearId,
  type AccountTitleId,
  type UserId,
  type TransactionId,
} from "@account-ledgers/domain";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createFiscalYearUseCases,
  createTransactionUseCases,
} from "./composeUseCases";
import { signUpUseCase } from "@account-ledgers/usecases";
import { createFirebaseAuthAdapter } from "@account-ledgers/infrastructure/auth/firebaseAuthAdapter";
import { createFirestoreFiscalYearRepository } from "@account-ledgers/infrastructure/firestore/fiscalYearRepository";
import { createFirestoreTransactionRepository } from "@account-ledgers/infrastructure/firestore/transactionRepository";
import { createFirestoreTenantRepository } from "@account-ledgers/infrastructure/firestore/tenantRepository";
import { createTestFirebase, type TestFirebase, uniqueEmail } from "./helpers";

let firebase: TestFirebase;
let tenantId: TenantId;
let yearId: FiscalYearId;
let deletedTransactionId: TransactionId;

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

beforeAll(async () => {
  firebase = createTestFirebase();
  const signUp = signUpUseCase({
    auth: createFirebaseAuthAdapter(firebase.auth),
    tenants: createFirestoreTenantRepository(firebase.db),
  });
  ({ tenantId } = await signUp({
    email: uniqueEmail("search"),
    password: "password123",
  }));
  const u = usecases();
  yearId = await u.fiscalYears.create({
    tenantId,
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-12-31"),
  });

  // Search fixtures: two transactions in January (one of them cash), one in February,
  // and one soft-deleted.
  await u.transactions.create({
    tenantId,
    yearId,
    createdBy: tenantId as string as UserId,
    draft: {
      date: new Date("2026-01-05"),
      partners: [],
      tags: [],
      postings: [posting("debit", "cash", 1000, "現金売上"), posting("credit", "sales", 1000)],
    },
  });
  await u.transactions.create({
    tenantId,
    yearId,
    createdBy: tenantId as string as UserId,
    draft: {
      date: new Date("2026-01-20"),
      partners: [],
      tags: [],
      postings: [posting("debit", "receivable", 2000, "掛売上"), posting("credit", "sales", 2000)],
    },
  });
  await u.transactions.create({
    tenantId,
    yearId,
    createdBy: tenantId as string as UserId,
    draft: {
      date: new Date("2026-02-10"),
      partners: [],
      tags: [],
      postings: [posting("debit", "expense", 500, "経費支払"), posting("credit", "cash", 500)],
    },
  });
  const deleted = await u.transactions.create({
    tenantId,
    yearId,
    createdBy: tenantId as string as UserId,
    draft: {
      date: new Date("2026-02-15"),
      partners: [],
      tags: [],
      postings: [posting("debit", "expense", 100, "削除される仕訳"), posting("credit", "cash", 100)],
    },
  });
  deletedTransactionId = deleted.transactionId;
  await u.transactions.softDelete({
    tenantId,
    yearId,
    transactionId: deletedTransactionId,
    updatedBy: tenantId as string as UserId,
  });
});

afterAll(async () => {
  await firebase.cleanup();
});

describe("transaction search integration", () => {
  it("excludes deleted transactions by default and returns them newest first", async () => {
    const page = await usecases().transactions.search({
      tenantId,
      yearId,
      limit: 50,
    });
    expect(page.transactions.map((e) => e.postings[0]?.memo)).toEqual([
      "経費支払",
      "掛売上",
      "現金売上",
    ]);
    expect(page.nextCursor).toBeNull();
  });

  it("filters by date range", async () => {
    const page = await usecases().transactions.search({
      tenantId,
      yearId,
      dateFrom: new Date("2026-01-01"),
      dateTo: new Date("2026-01-31"),
      limit: 50,
    });
    expect(page.transactions).toHaveLength(2);
  });

  it("filters by account title, via array-contains on accountTitleIds", async () => {
    const page = await usecases().transactions.search({
      tenantId,
      yearId,
      accountTitleId: "cash" as AccountTitleId,
      limit: 50,
    });
    expect(page.transactions.map((e) => e.postings[0]?.memo).sort()).toEqual([
      "現金売上",
      "経費支払",
    ]);
  });

  it("filters by keyword over the posting memos", async () => {
    const page = await usecases().transactions.search({
      tenantId,
      yearId,
      keyword: "掛売上",
      limit: 50,
    });
    expect(page.transactions.map((e) => e.postings[0]?.memo)).toEqual(["掛売上"]);
  });

  it("includes deleted transactions when includeDeleted is set", async () => {
    const page = await usecases().transactions.search({
      tenantId,
      yearId,
      includeDeleted: true,
      limit: 50,
    });
    const deleted = page.transactions.find((e) => e.id === deletedTransactionId);
    expect(deleted?.deleted).toBe(true);
    expect(page.transactions).toHaveLength(4);
  });

  it("paginates with a cursor", async () => {
    const first = await usecases().transactions.search({
      tenantId,
      yearId,
      limit: 2,
    });
    expect(first.transactions).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();

    const second = await usecases().transactions.search({
      tenantId,
      yearId,
      limit: 2,
      cursor: first.nextCursor,
    });
    expect(second.transactions).toHaveLength(1);
    const ids = [...first.transactions, ...second.transactions].map((e) => e.id);
    expect(new Set(ids).size).toBe(3); // no duplicates across pages
  });
});
