import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { createRulesTestEnv } from "./helpers";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await createRulesTestEnv("tenant");
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

/** Seeds test data directly, with the rules disabled. */
async function seedTenant(tenantId: string, members: Record<string, string>) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, `tenants/${tenantId}`), { createdAt: new Date() });
    for (const [uid, role] of Object.entries(members)) {
      await setDoc(doc(db, `tenants/${tenantId}/members/${uid}`), { role });
    }
    await setDoc(doc(db, `tenants/${tenantId}/accountTitles/acc-1`), {
      name: "現金",
      category: "asset",
      isActive: true,
      defaultTaxCategory: null,
      searchWords: [],
      sortOrder: 10,
    });
  });
}

describe("sign-up bootstrap", () => {
  it("creates the tenant, member, and account titles in one go, keyed by the caller's own uid", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, "tenants/alice"), { createdAt: new Date() });
    batch.set(doc(db, "tenants/alice/members/alice"), { role: "admin" });
    batch.set(doc(db, "tenants/alice/accountTitles/acc-1"), {
      name: "現金",
      category: "asset",
      isActive: true,
      defaultTaxCategory: null,
      searchWords: [],
      sortOrder: 10,
    });
    await assertSucceeds(batch.commit());
  });

  it("blocks creating a tenant keyed by someone else's uid", async () => {
    const db = testEnv.authenticatedContext("mallory").firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, "tenants/alice"), { createdAt: new Date() });
    batch.set(doc(db, "tenants/alice/members/mallory"), { role: "admin" });
    await assertFails(batch.commit());
  });

  it("blocks creating a tenant while unauthenticated", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(doc(db, "tenants/alice"), { createdAt: new Date() }),
    );
  });

  it("blocks enrolling yourself as an admin of another tenant by forging a role", async () => {
    await seedTenant("alice", { alice: "admin" });
    const db = testEnv.authenticatedContext("mallory").firestore();
    await assertFails(
      setDoc(doc(db, "tenants/alice/members/mallory"), { role: "admin" }),
    );
  });
});

describe("tenant isolation", () => {
  it("blocks a non-member from reading another tenant's documents", async () => {
    await seedTenant("alice", { alice: "admin" });
    const db = testEnv.authenticatedContext("bob").firestore();
    await assertFails(getDoc(doc(db, "tenants/alice")));
    await assertFails(getDoc(doc(db, "tenants/alice/accountTitles/acc-1")));
    await assertFails(getDocs(collection(db, "tenants/alice/accountTitles")));
  });

  it("blocks all reads while unauthenticated", async () => {
    await seedTenant("alice", { alice: "admin" });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "tenants/alice/accountTitles/acc-1")));
  });

  it("lets a member read their own tenant's documents", async () => {
    await seedTenant("alice", { alice: "admin", bob: "viewer" });
    const db = testEnv.authenticatedContext("bob").firestore();
    await assertSucceeds(getDoc(doc(db, "tenants/alice/accountTitles/acc-1")));
    await assertSucceeds(getDocs(collection(db, "tenants/alice/accountTitles")));
  });
});

describe("write restrictions by role", () => {
  const accountTitle = {
    name: "テスト科目",
    category: "expense",
    isActive: true,
    defaultTaxCategory: null,
    searchWords: [],
    sortOrder: 990,
  };

  it("blocks a viewer from creating an account title", async () => {
    await seedTenant("alice", { alice: "admin", bob: "viewer" });
    const db = testEnv.authenticatedContext("bob").firestore();
    await assertFails(
      setDoc(doc(db, "tenants/alice/accountTitles/acc-new"), accountTitle),
    );
  });

  it("lets an editor create an account title", async () => {
    await seedTenant("alice", { alice: "admin", carol: "editor" });
    const db = testEnv.authenticatedContext("carol").firestore();
    await assertSucceeds(
      setDoc(doc(db, "tenants/alice/accountTitles/acc-new"), accountTitle),
    );
  });

  it("blocks even an owner from creating an account title with an invalid category", async () => {
    await seedTenant("alice", { alice: "admin" });
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      setDoc(doc(db, "tenants/alice/accountTitles/acc-new"), {
        ...accountTitle,
        category: "invalid",
      }),
    );
  });

  it("blocks creating an account title whose searchWords is not a list", async () => {
    await seedTenant("alice", { alice: "admin" });
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      setDoc(doc(db, "tenants/alice/accountTitles/acc-new"), {
        ...accountTitle,
        searchWords: "cash",
      }),
    );
  });

  it("validates a sub account title's searchWords as a list", async () => {
    await seedTenant("alice", { alice: "admin" });
    const db = testEnv.authenticatedContext("alice").firestore();
    const subPath =
      "tenants/alice/accountTitles/acc-1/subAccountTitles/sub-1";
    await assertSucceeds(
      setDoc(doc(db, subPath), {
        name: "レジ",
        isActive: true,
        searchWords: [],
        sortOrder: 10,
      }),
    );
    await assertFails(
      setDoc(doc(db, subPath), {
        name: "レジ",
        isActive: true,
        searchWords: "x",
        sortOrder: 10,
      }),
    );
  });
});

describe("partners", () => {
  const partner = { name: "取引先A", searchWords: [] };

  it("lets an editor create a partner, validating name and searchWords", async () => {
    await seedTenant("alice", { alice: "admin", carol: "editor" });
    const db = testEnv.authenticatedContext("carol").firestore();
    await assertSucceeds(
      setDoc(doc(db, "tenants/alice/partners/p-1"), partner),
    );
    await assertFails(
      setDoc(doc(db, "tenants/alice/partners/p-2"), { ...partner, name: "" }),
    );
    await assertFails(
      setDoc(doc(db, "tenants/alice/partners/p-3"), {
        ...partner,
        searchWords: "x",
      }),
    );
  });

  it("blocks a viewer from creating a partner, and blocks hard deletes", async () => {
    await seedTenant("alice", { alice: "admin", bob: "viewer" });
    const viewer = testEnv.authenticatedContext("bob").firestore();
    await assertFails(
      setDoc(doc(viewer, "tenants/alice/partners/p-1"), partner),
    );
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "tenants/alice/partners/p-keep"), partner);
    });
    const owner = testEnv.authenticatedContext("alice").firestore();
    await assertFails(deleteDoc(doc(owner, "tenants/alice/partners/p-keep")));
  });
});

describe("tags", () => {
  const tag = { name: "経費", searchWords: [] };

  it("lets an editor create a tag, validating name and searchWords", async () => {
    await seedTenant("alice", { alice: "admin", carol: "editor" });
    const db = testEnv.authenticatedContext("carol").firestore();
    await assertSucceeds(setDoc(doc(db, "tenants/alice/tags/t-1"), tag));
    await assertFails(
      setDoc(doc(db, "tenants/alice/tags/t-2"), { ...tag, name: "" }),
    );
    await assertFails(
      setDoc(doc(db, "tenants/alice/tags/t-3"), { ...tag, searchWords: "x" }),
    );
  });

  it("blocks a viewer from creating a tag, and blocks hard deletes", async () => {
    await seedTenant("alice", { alice: "admin", bob: "viewer" });
    const viewer = testEnv.authenticatedContext("bob").firestore();
    await assertFails(setDoc(doc(viewer, "tenants/alice/tags/t-1"), tag));
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "tenants/alice/tags/t-keep"), tag);
    });
    const owner = testEnv.authenticatedContext("alice").firestore();
    await assertFails(deleteDoc(doc(owner, "tenants/alice/tags/t-keep")));
  });
});

describe("hard deletes are forbidden", () => {
  it("blocks even an owner from hard-deleting a document", async () => {
    await seedTenant("alice", { alice: "admin" });
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(deleteDoc(doc(db, "tenants/alice/accountTitles/acc-1")));
    await assertFails(deleteDoc(doc(db, "tenants/alice/members/alice")));
    await assertFails(deleteDoc(doc(db, "tenants/alice")));
  });
});

describe("revoking a member", () => {
  it("lets the owner revoke a member, who then can read nothing", async () => {
    await seedTenant("alice", { alice: "admin", bob: "editor" });
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      setDoc(doc(alice, "tenants/alice/members/bob"), { role: "revoked" }),
    );

    const bob = testEnv.authenticatedContext("bob").firestore();
    await assertFails(getDoc(doc(bob, "tenants/alice")));
    await assertFails(getDoc(doc(bob, "tenants/alice/accountTitles/acc-1")));
    await assertFails(getDocs(collection(bob, "tenants/alice/accountTitles")));
    await assertFails(
      setDoc(doc(bob, "tenants/alice/partners/p1"), { name: "取引先", searchWords: [] }),
    );
  });

  it("rejects a role outside the known set", async () => {
    await seedTenant("alice", { alice: "admin" });
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      setDoc(doc(db, "tenants/alice/members/bob"), { role: "superuser" }),
    );
  });
});
