import type {
  TenantId,
  AccountTitleId,
  UserId,
} from "@account-ledgers/domain";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createFiscalYearUseCases,
} from "./composeUseCases";
import { signUpUseCase } from "@account-ledgers/usecases";
import { createFirebaseAuthAdapter } from "@account-ledgers/infrastructure/auth/firebaseAuthAdapter";
import { createFirestoreFiscalYearRepository } from "@account-ledgers/infrastructure/firestore/fiscalYearRepository";
import { createFirestoreTransactionRepository } from "@account-ledgers/infrastructure/firestore/transactionRepository";
import { createFirestoreTenantRepository } from "@account-ledgers/infrastructure/firestore/tenantRepository";
import { createTestFirebase, type TestFirebase, uniqueEmail } from "./helpers";

let firebase: TestFirebase;
let tenantId: TenantId;

beforeAll(async () => {
  firebase = createTestFirebase();
  const signUp = signUpUseCase({
    auth: createFirebaseAuthAdapter(firebase.auth),
    tenants: createFirestoreTenantRepository(firebase.db),
  });
  ({ tenantId } = await signUp({
    email: uniqueEmail("fiscal"),
    password: "password123",
  }));
});

afterAll(async () => {
  await firebase.cleanup();
});

describe("fiscalYears integration (real emulator, real Security Rules)", () => {
  it("creates a fiscal year, then saves and reads back its opening balances", async () => {
    const usecases = createFiscalYearUseCases({
      transactions: createFirestoreTransactionRepository(firebase.db),
      fiscalYears: createFirestoreFiscalYearRepository(firebase.db),
    });

    const yearId = await usecases.create({
      tenantId,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
    });

    await usecases.saveOpeningBalance({
      tenantId,
      yearId,
      createdBy: tenantId as string as UserId,
      balance: {
        ["acc-cash" as AccountTitleId]: { debit: 500000, credit: 0 },
        ["acc-capital" as AccountTitleId]: { debit: 0, credit: 500000 },
      },
    });

    const balance = await usecases.getOpeningBalance(tenantId, yearId);
    expect(balance).toEqual({
      ["acc-cash" as AccountTitleId]: { debit: 500000, credit: 0 },
      ["acc-capital" as AccountTitleId]: { debit: 0, credit: 500000 },
    });
  });

  it("has the Security Rules reject opening balances on a closed fiscal year", async () => {
    const usecases = createFiscalYearUseCases({
      transactions: createFirestoreTransactionRepository(firebase.db),
      fiscalYears: createFirestoreFiscalYearRepository(firebase.db),
    });

    const yearId = await usecases.create({
      tenantId,
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-12-31"),
    });
    await usecases.setStatus({ tenantId, yearId, status: "closed" });

    await expect(
      usecases.saveOpeningBalance({
        tenantId,
        yearId,
        createdBy: tenantId as string as UserId,
        balance: {
          ["acc-cash" as AccountTitleId]: { debit: 1000, credit: 0 },
          ["acc-capital" as AccountTitleId]: { debit: 0, credit: 1000 },
        },
      }),
    ).rejects.toThrow();
  });
});
