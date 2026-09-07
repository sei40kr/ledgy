import { STANDARD_ACCOUNT_TITLE_PRESETS } from "@account-ledgers/domain";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EmailAlreadyInUseError, signUpUseCase } from "@account-ledgers/usecases";
import { createFirebaseAuthAdapter } from "@account-ledgers/infrastructure/auth/firebaseAuthAdapter";
import { createFirestoreTenantRepository } from "@account-ledgers/infrastructure/firestore/tenantRepository";
import { createTestFirebase, type TestFirebase, uniqueEmail } from "./helpers";

let firebase: TestFirebase;

beforeAll(() => {
  firebase = createTestFirebase();
});

afterAll(async () => {
  await firebase.cleanup();
});

describe("signUp integration (real emulator, real Security Rules)", () => {
  it("creates the tenant, the member, and the standard account titles in one go", async () => {
    const signUp = signUpUseCase({
      auth: createFirebaseAuthAdapter(firebase.auth),
      tenants: createFirestoreTenantRepository(firebase.db),
    });

    const { tenantId } = await signUp({
      email: uniqueEmail("signup"),
      password: "password123",
    });

    expect(tenantId).toBe(firebase.auth.currentUser?.uid);

    const member = await getDoc(
      doc(firebase.db, `tenants/${tenantId}/members/${tenantId}`),
    );
    expect(member.exists()).toBe(true);
    expect(member.data()?.role).toBe("admin");

    const accountTitles = await getDocs(
      collection(firebase.db, `tenants/${tenantId}/accountTitles`),
    );
    expect(accountTitles.size).toBe(STANDARD_ACCOUNT_TITLE_PRESETS.length);

    const names = accountTitles.docs.map((d) => d.data().name).sort();
    expect(new Set(names).size).toBe(STANDARD_ACCOUNT_TITLE_PRESETS.length);
  });

  it("refuses an already-registered email address", async () => {
    const signUp = signUpUseCase({
      auth: createFirebaseAuthAdapter(firebase.auth),
      tenants: createFirestoreTenantRepository(firebase.db),
    });
    const email = uniqueEmail("dup");
    await signUp({ email, password: "password123" });
    await expect(
      signUp({ email, password: "password123" }),
    ).rejects.toThrow(EmailAlreadyInUseError);
  });
});
