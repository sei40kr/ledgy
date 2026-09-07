import type {
  TenantId,
} from "@account-ledgers/domain";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAccountUseCases,
} from "./composeUseCases";
import {
  AccountTitleNameTakenError,
  signUpUseCase,
} from "@account-ledgers/usecases";
import { createFirebaseAuthAdapter } from "@account-ledgers/infrastructure/auth/firebaseAuthAdapter";
import { createFirestoreAccountTitleRepository } from "@account-ledgers/infrastructure/firestore/accountTitleRepository";
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
    email: uniqueEmail("accountTitles"),
    password: "password123",
  }));
});

afterAll(async () => {
  await firebase.cleanup();
});

describe("account titles integration (real emulator, real Security Rules)", () => {
  it("persists creating, editing, and deactivating an account title", async () => {
    const usecases = createAccountUseCases({
      accountTitles: createFirestoreAccountTitleRepository(firebase.db),
    });

    const accountTitleId = await usecases.create({
      tenantId,
      name: "研修費",
      category: "expense",
      defaultTaxCategory: null,
      searchWords: ["けんしゅう", "研修"],
    });

    let list = await usecases.list(tenantId);
    const created = list.find((a) => a.id === accountTitleId);
    expect(created?.name).toBe("研修費");
    // search words survive the converter round-trip
    expect(created?.searchWords).toEqual(["けんしゅう", "研修"]);
    // numbered after the last standard account title
    expect(created?.sortOrder).toBeGreaterThan(500);

    await usecases.update({
      tenantId,
      accountTitleId,
      name: "研修費(改)",
      defaultTaxCategory: null,
      searchWords: [],
    });
    await usecases.setActive({ tenantId, accountTitleId, isActive: false });

    list = await usecases.list(tenantId);
    const updated = list.find((a) => a.id === accountTitleId);
    expect(updated?.name).toBe("研修費(改)");
    expect(updated?.isActive).toBe(false);
  });

  it("rejects a name that collides with a standard account title", async () => {
    const usecases = createAccountUseCases({
      accountTitles: createFirestoreAccountTitleRepository(firebase.db),
    });
    await expect(
      usecases.create({
        tenantId,
        name: "現金", // collides with the standard cash account title
        category: "asset",
        defaultTaxCategory: null,
        searchWords: [],
      }),
    ).rejects.toThrow(AccountTitleNameTakenError);
  });

  it("creates and deactivates a sub account title", async () => {
    const usecases = createAccountUseCases({
      accountTitles: createFirestoreAccountTitleRepository(firebase.db),
    });
    const accountTitles = await usecases.list(tenantId);
    const bank = accountTitles.find((a) => a.name === "普通預金");
    expect(bank).toBeDefined();
    if (!bank) return;

    const subId = await usecases.createSubAccount({
      tenantId,
      accountTitleId: bank.id,
      name: "○○銀行 本店",
      searchWords: [],
    });
    await usecases.setSubAccountActive({
      tenantId,
      accountTitleId: bank.id,
      subAccountTitleId: subId,
      isActive: false,
    });
    const subs = await usecases.listSubAccounts(tenantId, bank.id);
    expect(subs).toHaveLength(1);
    expect(subs[0]?.isActive).toBe(false);
  });
});
