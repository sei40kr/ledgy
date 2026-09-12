import {
  assertFails,
  assertSucceeds,
  type RulesTestContext,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { createRulesTestEnv } from "./helpers";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await createRulesTestEnv("transaction");
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "tenants/alice"), { createdAt: new Date() });
    await setDoc(doc(db, "tenants/alice/members/alice"), { role: "admin" });
    await setDoc(doc(db, "tenants/alice/fiscalYears/open-year"), {
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      status: "open",
    });
    await setDoc(doc(db, "tenants/alice/fiscalYears/closed-year"), {
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-12-31"),
      status: "closed",
    });
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

type Fields = Record<string, unknown>;
type TestFirestore = ReturnType<RulesTestContext["firestore"]>;

/** The content one version carries, on the header and on its revision alike. */
function content(overrides: Fields = {}): Fields {
  return {
    date: new Date("2026-01-10"),
    description: "テスト仕訳",
    partners: [],
    tags: [],
    postings: [
      {
        side: "debit",
        accountTitleId: "cash",
        subAccountTitleId: null,
        amount: 1000,
        taxCategory: null,
        memo: "",
      },
      {
        side: "credit",
        accountTitleId: "sales",
        subAccountTitleId: null,
        amount: 1000,
        taxCategory: null,
        memo: "",
      },
    ],
    supportingDocumentIds: [],
    deleted: false,
    system: null,
    ...overrides,
  };
}

/** A header as the repository writes it on create, linked to `revisionId`. */
function header(revisionId: string, overrides: Fields = {}): Fields {
  return {
    ...content(),
    debitTotal: 1000,
    creditTotal: 1000,
    createdBy: "alice",
    createdAt: serverTimestamp(),
    updatedBy: "alice",
    updatedAt: serverTimestamp(),
    currentRevision: revisionId,
    ...overrides,
  };
}

/** A revision as the repository writes it. */
function revision(overrides: Fields = {}): Fields {
  return {
    ...content(),
    createdBy: "alice",
    createdAt: serverTimestamp(),
    ...overrides,
  };
}

const transactionDocPath = (id: string, yearId = "open-year") =>
  `tenants/alice/fiscalYears/${yearId}/transactions/${id}`;
const revisionDocPath = (transactionId: string, revisionId: string, yearId = "open-year") =>
  `${transactionDocPath(transactionId, yearId)}/revisions/${revisionId}`;

/**
 * Creates a transaction the way the repository does: the revision and the
 * header that links to it, in one atomic request.
 */
function createVersion(
  db: TestFirestore,
  options: {
    transactionId?: string;
    revisionId?: string;
    yearId?: string;
    header?: Fields;
    revision?: Fields;
  } = {},
) {
  const {
    transactionId = "e1",
    revisionId = "rev1",
    yearId = "open-year",
    header: headerOverrides = {},
    revision: revisionOverrides = {},
  } = options;
  const batch = writeBatch(db);
  batch.set(doc(db, revisionDocPath(transactionId, revisionId, yearId)), revision(revisionOverrides));
  batch.set(doc(db, transactionDocPath(transactionId, yearId)), header(revisionId, headerOverrides));
  return batch.commit();
}

/**
 * Updates a transaction the way the repository does: a new revision holding the
 * next version's content, and the header updated to mirror and link to it.
 */
function updateVersion(
  db: TestFirestore,
  options: {
    transactionId?: string;
    revisionId?: string;
    yearId?: string;
    content?: Fields;
    header?: Fields;
    revision?: Fields;
  } = {},
) {
  const {
    transactionId = "e1",
    revisionId = "rev2",
    yearId = "open-year",
    content: contentOverrides = {},
    header: headerOverrides = {},
    revision: revisionOverrides = {},
  } = options;
  const batch = writeBatch(db);
  batch.set(
    doc(db, revisionDocPath(transactionId, revisionId, yearId)),
    revision({ ...contentOverrides, ...revisionOverrides }),
  );
  batch.update(doc(db, transactionDocPath(transactionId, yearId)), {
    ...content(contentOverrides),
    updatedBy: "alice",
    updatedAt: serverTimestamp(),
    currentRevision: revisionId,
    ...headerOverrides,
  });
  return batch.commit();
}

/** Seeds an existing transaction (header + its first revision) with the rules disabled. */
async function seedTransaction(transactionId = "e1", yearId = "open-year") {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, revisionDocPath(transactionId, "rev1", yearId)), {
      ...content(),
      createdBy: "alice",
      createdAt: new Date("2026-01-10"),
    });
    await setDoc(doc(db, transactionDocPath(transactionId, yearId)), {
      ...content(),
      debitTotal: 1000,
      creditTotal: 1000,
      createdBy: "alice",
      createdAt: new Date("2026-01-10"),
      updatedBy: "alice",
      updatedAt: new Date("2026-01-10"),
      currentRevision: "rev1",
    });
  });
}

describe("Security Rules for creating transactions", () => {
  it("allows creating a well-formed, balanced transaction with its first revision", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(createVersion(db));
  });

  it("rejects a header where debitTotal != creditTotal", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(createVersion(db, { header: { creditTotal: 999 } }));
  });

  it("rejects a debitTotal of zero or less", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(createVersion(db, { header: { debitTotal: 0, creditTotal: 0 } }));
    await assertFails(createVersion(db, { header: { debitTotal: -100, creditTotal: -100 } }));
  });

  it("rejects non-integer totals, violating the is-int check", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      createVersion(db, { header: { debitTotal: 1000.5, creditTotal: 1000.5 } }),
    );
  });

  it("rejects postings that are empty, not a list, or longer than 50", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      createVersion(db, { header: { postings: [] }, revision: { postings: [] } }),
    );
    await assertFails(
      createVersion(db, {
        header: { postings: "not-a-list" },
        revision: { postings: "not-a-list" },
      }),
    );
    const tooMany = Array.from({ length: 51 }, (_, i) => ({
      side: i % 2 === 0 ? "debit" : "credit",
      accountTitleId: "cash",
      subAccountTitleId: null,
      amount: 100,
      taxCategory: null,
      memo: "",
    }));
    await assertFails(
      createVersion(db, { header: { postings: tooMany }, revision: { postings: tooMany } }),
    );
  });

  it("rejects a date outside the fiscal year", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const date = new Date("2027-01-10");
    await assertFails(createVersion(db, { header: { date }, revision: { date } }));
  });

  it("rejects a forged createdBy or updatedBy naming someone else's uid", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(createVersion(db, { header: { createdBy: "someone" } }));
    await assertFails(createVersion(db, { header: { updatedBy: "someone" } }));
  });

  it("rejects client-supplied createdAt or updatedAt instead of the server time", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(createVersion(db, { header: { createdAt: new Date("2020-01-01") } }));
    await assertFails(createVersion(db, { header: { updatedAt: new Date("2020-01-01") } }));
  });

  it("rejects creating as already deleted, and a non-boolean deleted flag", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      createVersion(db, { header: { deleted: true }, revision: { deleted: true } }),
    );
    await assertFails(
      createVersion(db, { header: { deleted: "archived" }, revision: { deleted: "archived" } }),
    );
  });

  it("rejects creating in a closed fiscal year", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    const date = new Date("2025-01-10");
    await assertFails(
      createVersion(db, { yearId: "closed-year", header: { date }, revision: { date } }),
    );
  });

  it("blocks a viewer from creating a transaction", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "tenants/alice/members/viewer-user"),
        { role: "viewer" },
      );
    });
    const db = testEnv.authenticatedContext("viewer-user").firestore();
    await assertFails(
      createVersion(db, {
        header: { createdBy: "viewer-user", updatedBy: "viewer-user" },
        revision: { createdBy: "viewer-user" },
      }),
    );
  });
});

describe("Security Rules tying the header to its revision", () => {
  it("rejects a header written without a revision", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, transactionDocPath("e1")), header("rev1")));
  });

  it("rejects a header whose content differs from the revision it links to", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(createVersion(db, { header: { description: "帳簿には別の文言" } }));
    const otherPostings = [
      { side: "debit", accountTitleId: "cash", subAccountTitleId: null, amount: 1000, taxCategory: null, memo: "" },
      { side: "credit", accountTitleId: "other", subAccountTitleId: null, amount: 1000, taxCategory: null, memo: "" },
    ];
    await assertFails(createVersion(db, { header: { postings: otherPostings } }));
    await assertFails(createVersion(db, { header: { date: new Date("2026-02-10") } }));
    await assertFails(createVersion(db, { header: { deleted: true } }));
    // Which supporting documents are attached is versioned content too.
    await assertFails(createVersion(db, { header: { supportingDocumentIds: ["r1"] } }));
  });

  it("rejects content without a supportingDocumentIds list", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      createVersion(db, { header: { supportingDocumentIds: "r1" }, revision: { supportingDocumentIds: "r1" } }),
    );
  });

  it("rejects a header that links to a revision other than the one written", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(createVersion(db, { header: { currentRevision: "rev-other" } }));
  });

  it("rejects an update that changes the header without appending a revision", async () => {
    await seedTransaction();
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      updateDoc(doc(db, transactionDocPath("e1")), {
        description: "改変",
        updatedBy: "alice",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("rejects re-pointing the header at a revision that already exists", async () => {
    await seedTransaction();
    const db = testEnv.authenticatedContext("alice").firestore();
    // rev1 already holds exactly this content; reusing it would let a header
    // silently revert to an older version with no new history entry.
    await assertFails(
      updateDoc(doc(db, transactionDocPath("e1")), {
        ...content(),
        updatedBy: "alice",
        updatedAt: serverTimestamp(),
        currentRevision: "rev1",
      }),
    );
  });
});

describe("Security Rules for updating and deleting transactions", () => {
  beforeEach(() => seedTransaction());

  it("allows an update by the caller, soft deletes included", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      updateVersion(db, { revisionId: "rev2", content: { description: "修正" } }),
    );
    await assertSucceeds(
      updateVersion(db, { revisionId: "rev3", content: { description: "修正", deleted: true } }),
    );
  });

  it("rejects tampering with createdBy or createdAt", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(updateVersion(db, { header: { createdBy: "someone" } }));
    await assertFails(updateVersion(db, { header: { createdAt: new Date("2020-01-01") } }));
  });

  it("rejects an update that forges updatedBy as someone else", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(updateVersion(db, { header: { updatedBy: "someone" } }));
  });

  it("rejects an update in a closed fiscal year", async () => {
    await seedTransaction("e2", "closed-year");
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      updateVersion(db, {
        transactionId: "e2",
        yearId: "closed-year",
        content: { date: new Date("2025-01-10"), description: "締切後の改変" },
      }),
    );
  });

  it("rejects a hard delete", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(deleteDoc(doc(db, transactionDocPath("e1"))));
  });
});

describe("Security Rules for a transaction's revisions, which keep history tamper-proof", () => {
  beforeEach(() => seedTransaction());

  it("never lets a revision be updated or deleted", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    // Overwriting an existing revision doc counts as an update, so a written
    // version can never be replaced.
    await assertFails(
      setDoc(doc(db, revisionDocPath("e1", "rev1")), revision({ description: "改竄" })),
    );
    await assertFails(updateDoc(doc(db, revisionDocPath("e1", "rev1")), { deleted: true }));
    await assertFails(deleteDoc(doc(db, revisionDocPath("e1", "rev1"))));
  });

  it("rejects a revision that forges its author or its time", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(updateVersion(db, { revision: { createdBy: "someone" } }));
    await assertFails(updateVersion(db, { revision: { createdAt: new Date("2020-01-01") } }));
  });

  it("rejects a revision the header does not link to, orphans included", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, revisionDocPath("e1", "rev2")), revision()));
    await assertFails(setDoc(doc(db, revisionDocPath("no-such-transaction", "rev1")), revision()));
  });

  it("rejects a revision under a closed fiscal year", async () => {
    await seedTransaction("e2", "closed-year");
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      setDoc(
        doc(db, revisionDocPath("e2", "rev2", "closed-year")),
        revision({ date: new Date("2025-01-10") }),
      ),
    );
  });
});

describe("Security Rules for monthlyTransactionSummaries", () => {
  it("lets editors and above update them, but never a non-member", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      setDoc(
        doc(
          alice,
          "tenants/alice/fiscalYears/open-year/monthlyTransactionSummaries/202601",
        ),
        { totals: { cash: { debitTotal: 100, creditTotal: 0 } } },
      ),
    );

    const mallory = testEnv.authenticatedContext("mallory").firestore();
    await assertFails(
      setDoc(
        doc(
          mallory,
          "tenants/alice/fiscalYears/open-year/monthlyTransactionSummaries/202601",
        ),
        { totals: {} },
      ),
    );
  });

  it("rejects writes under a closed fiscal year", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      setDoc(
        doc(
          db,
          "tenants/alice/fiscalYears/closed-year/monthlyTransactionSummaries/202501",
        ),
        { totals: {} },
      ),
    );
  });
});
