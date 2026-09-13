import {
  MonetaryAmount,
  type Posting,
  type PostingSide,
  type TenantId,
  type FiscalYearId,
  type AccountTitleId,
  type UserId,
} from "@account-ledgers/domain";
import { doc, setDoc } from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createFiscalYearUseCases,
  createTransactionUseCases,
  createTrialBalanceUseCases,
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
  const monthlyTransactionSummaries =
    createFirestoreMonthlyTransactionSummaryRepository(firebase.db);
  return {
    fiscalYears: createFiscalYearUseCases({ fiscalYears, transactions }),
    transactions: createTransactionUseCases({ transactions, fiscalYears }),
    trialBalance: createTrialBalanceUseCases({
      fiscalYears,
      monthlyTransactionSummaries,
      transactions,
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
    email: uniqueEmail("trial"),
    password: "password123",
  }));
  const u = usecases();
  yearId = await u.fiscalYears.create({
    tenantId,
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-12-31"),
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
  // January: 30000 of sales. February: 10000 of expenses.
  await u.transactions.create({
    tenantId,
    yearId,
    createdBy: tenantId as string as UserId,
    draft: {
      date: new Date("2026-01-15"),
      partners: [],
      tags: [],
      postings: [posting("debit", "cash", 30000), posting("credit", "sales", 30000)],
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
      postings: [posting("debit", "expense", 10000), posting("credit", "cash", 10000)],
    },
  });
});

afterAll(async () => {
  await firebase.cleanup();
});

describe("trial balance integration", () => {
  it("cumulative mode: opening balances plus cumulative totals keep debits equal to credits", async () => {
    const tb = await usecases().trialBalance.get({
      tenantId,
      yearId,
      monthKey: "202602",
      mode: "cumulative",
    });
    expect(tb.isBalanced).toBe(true);

    const cash = tb.rows.find((r) => r.accountTitleId === "cash");
    expect(cash?.openingDebit).toBe(100000);
    expect(cash?.debitTotal).toBe(30000);
    expect(cash?.creditTotal).toBe(10000);
    expect(cash?.closingDebit).toBe(120000);

    expect(tb.totals.closingDebit).toBe(tb.totals.closingCredit);
  });

  it("monthly mode: folds the preceding months into the brought-forward balance", async () => {
    const tb = await usecases().trialBalance.get({
      tenantId,
      yearId,
      monthKey: "202602",
      mode: "monthly",
    });
    expect(tb.isBalanced).toBe(true);

    const cash = tb.rows.find((r) => r.accountTitleId === "cash");
    // brought forward = opening 100000 + January 30000
    expect(cash?.openingDebit).toBe(130000);
    // February totals only
    expect(cash?.debitTotal).toBe(0);
    expect(cash?.creditTotal).toBe(10000);
    expect(cash?.closingDebit).toBe(120000);
  });

  it("rebuildMonthlyTransactionSummaries: repairs a deliberately corrupted summary by rebuilding from every transaction", async () => {
    const u = usecases();

    // Corrupt the summary on purpose. The Rules permit this as an ordinary member write.
    await setDoc(
      doc(
        firebase.db,
        `tenants/${tenantId}/fiscalYears/${yearId}/monthlyTransactionSummaries/202601`,
      ),
      { totals: { ["cash" as AccountTitleId]: { debitTotal: 999999, creditTotal: 0 } } },
    );
    // Add a junk month too, to confirm the rebuild empties it.
    await setDoc(
      doc(
        firebase.db,
        `tenants/${tenantId}/fiscalYears/${yearId}/monthlyTransactionSummaries/209912`,
      ),
      { totals: { garbage: { debitTotal: 1, creditTotal: 0 } } },
    );

    const broken = await u.trialBalance.get({
      tenantId,
      yearId,
      monthKey: "202601",
      mode: "cumulative",
    });
    expect(broken.isBalanced).toBe(false);

    const result = await u.trialBalance.rebuildMonthlyTransactionSummaries({ tenantId, yearId });
    expect(result.transactionCount).toBe(2);
    expect(result.monthCount).toBe(2);

    const fixed = await u.trialBalance.get({
      tenantId,
      yearId,
      monthKey: "202612",
      mode: "cumulative",
    });
    expect(fixed.isBalanced).toBe(true);
    const cash = fixed.rows.find((r) => r.accountTitleId === "cash");
    expect(cash?.debitTotal).toBe(30000);
    expect(fixed.rows.find((r) => r.accountTitleId === "garbage")).toBeUndefined();
  });
});
