import {
  MonetaryAmount,
  type Posting,
  type PostingSide,
  type TenantId,
  type FiscalYearId,
  type AccountTitleId,
  type UserId,
} from "@account-ledgers/domain";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createFiscalYearUseCases,
  createLedgerUseCases,
  createTransactionUseCases,
} from "./composeUseCases";
import { signUpUseCase } from "@account-ledgers/usecases";
import { createFirebaseAuthAdapter } from "@account-ledgers/infrastructure/auth/firebaseAuthAdapter";
import { createFirestoreFiscalYearRepository } from "@account-ledgers/infrastructure/firestore/fiscalYearRepository";
import { createFirestoreTransactionRepository } from "@account-ledgers/infrastructure/firestore/transactionRepository";
import { createFirestoreMonthlyTransactionSummaryRepository } from "@account-ledgers/infrastructure/firestore/monthlyTransactionSummaryRepository";
import { createFirestoreTenantRepository } from "@account-ledgers/infrastructure/firestore/tenantRepository";
import { createTestFirebase, type TestFirebase, uniqueEmail } from "./helpers";

let firebase: TestFirebase;
let tenantId: TenantId;
let yearId: FiscalYearId;

function posting(
  side: PostingSide,
  accountTitleId: string,
  amount: number,
): Posting {
  return {
    side,
    accountTitleId: accountTitleId as AccountTitleId,
    subAccountTitleId: null,
    amount: new MonetaryAmount(amount),
    taxCategory: null,
    memo: "",
  };
}

function usecases() {
  const fiscalYears = createFirestoreFiscalYearRepository(firebase.db);
  const transactions = createFirestoreTransactionRepository(firebase.db);
  return {
    fiscalYears: createFiscalYearUseCases({ fiscalYears, transactions }),
    transactions: createTransactionUseCases({ transactions, fiscalYears }),
    ledger: createLedgerUseCases({
      fiscalYears,
      transactions,
      monthlyTransactionSummaries: createFirestoreMonthlyTransactionSummaryRepository(firebase.db),
    }),
  };
}

beforeAll(async () => {
  firebase = createTestFirebase();
  const signUp = signUpUseCase({
    auth: createFirebaseAuthAdapter(firebase.auth),
    tenants: createFirestoreTenantRepository(firebase.db),
  });
  ({ tenantId } = await signUp({
    email: uniqueEmail("ledger"),
    password: "password123",
  }));
  const u = usecases();
  yearId = await u.fiscalYears.create({
    tenantId,
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-03-31"),
  });
  await u.fiscalYears.saveOpeningBalance({
    tenantId,
    yearId,
    createdBy: tenantId as string as UserId,
    balance: {
      ["cash" as AccountTitleId]: { debit: 100000, credit: 0 },
      ["capital" as AccountTitleId]: { debit: 0, credit: 100000 },
    },
  });
  // January: cash +50000 from sales. February: cash -20000 for an expense.
  await u.transactions.create({
    tenantId,
    yearId,
    createdBy: tenantId as string as UserId,
    draft: {
      date: new Date("2026-01-15"),
      partners: [],
      tags: [],
      postings: [posting("debit", "cash", 50000), posting("credit", "sales", 50000)],
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
      postings: [posting("debit", "expense", 20000), posting("credit", "cash", 20000)],
    },
  });
});

afterAll(async () => {
  await firebase.cleanup();
});

describe("general ledger integration", () => {
  it("computes monthly balances from the opening balance and monthly transaction summaries, for an asset account title", async () => {
    const ledger = await usecases().ledger.getAccountLedger({
      tenantId,
      yearId,
      accountTitleId: "cash" as AccountTitleId,
      category: "asset",
    });
    expect(ledger.openingBalance).toBe(100000);
    expect(ledger.months).toEqual([
      { monthKey: "202601", debitTotal: 50000, creditTotal: 0, balance: 150000 },
      { monthKey: "202602", debitTotal: 0, creditTotal: 20000, balance: 130000 },
      { monthKey: "202603", debitTotal: 0, creditTotal: 0, balance: 130000 },
    ]);
    expect(ledger.closingBalance).toBe(130000);
  });

  it("treats credit as the positive side for a revenue account title", async () => {
    const ledger = await usecases().ledger.getAccountLedger({
      tenantId,
      yearId,
      accountTitleId: "sales" as AccountTitleId,
      category: "revenue",
    });
    expect(ledger.openingBalance).toBe(0);
    expect(ledger.closingBalance).toBe(50000);
  });
});
