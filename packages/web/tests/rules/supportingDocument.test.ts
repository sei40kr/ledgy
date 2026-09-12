import {
  assertFails,
  assertSucceeds,
  type RulesTestContext,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { createRulesTestEnv } from "./helpers";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await createRulesTestEnv("supporting-document");
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "tenants/alice"), { createdAt: new Date() });
    await setDoc(doc(db, "tenants/alice/members/alice"), { role: "admin" });
    await setDoc(doc(db, "tenants/alice/members/viewer"), { role: "viewer" });
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

const supportingDocumentDocPath = (id: string) => `tenants/alice/supportingDocuments/${id}`;
const transactionDocPath = (id: string, yearId = "open-year") =>
  `tenants/alice/fiscalYears/${yearId}/transactions/${id}`;

/** A supporting document record as the repository writes it on upload. */
function supportingDocument(overrides: Fields = {}): Fields {
  return {
    fileName: "supportingDocument.pdf",
    contentType: "application/pdf",
    size: 1234,
    uploadedBy: "alice",
    uploadedAt: serverTimestamp(),
    transactionId: null,
    fiscalYearId: null,
    deleted: false,
    ...overrides,
  };
}

/** The content one transaction version carries. */
function content(overrides: Fields = {}): Fields {
  return {
    date: new Date("2026-01-10"),
    description: "テスト仕訳",
    partners: [],
    tags: [],
    postings: [
      { side: "debit", accountTitleId: "cash", subAccountTitleId: null, amount: 1000, taxCategory: null, memo: "" },
      { side: "credit", accountTitleId: "sales", subAccountTitleId: null, amount: 1000, taxCategory: null, memo: "" },
    ],
    supportingDocumentIds: [],
    deleted: false,
    system: null,
    ...overrides,
  };
}

/** Seeds a supporting document, and optionally a live transaction that names it, with the rules disabled. */
async function seed(options: {
  supportingDocument?: Fields;
  transaction?: { id: string; yearId?: string; content?: Fields };
}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, supportingDocumentDocPath("r1")), {
      ...supportingDocument({ uploadedAt: new Date("2026-01-09") }),
      ...options.supportingDocument,
    });
    if (options.transaction) {
      const { id, yearId = "open-year", content: overrides = {} } = options.transaction;
      await setDoc(doc(db, `${transactionDocPath(id, yearId)}/revisions/rev1`), {
        ...content(overrides),
        createdBy: "alice",
        createdAt: new Date("2026-01-10"),
      });
      await setDoc(doc(db, transactionDocPath(id, yearId)), {
        ...content(overrides),
        debitTotal: 1000,
        creditTotal: 1000,
        createdBy: "alice",
        createdAt: new Date("2026-01-10"),
        updatedBy: "alice",
        updatedAt: new Date("2026-01-10"),
        currentRevision: "rev1",
      });
    }
  });
}

/**
 * Attaches or detaches r1 the way the repository does: a new revision and the
 * header mirroring it, plus the supporting document's link, in one atomic request.
 */
function changeAttachment(
  db: TestFirestore,
  options: {
    transactionId: string;
    yearId?: string;
    supportingDocumentIds: string[];
    supportingDocumentLink: { transactionId: string | null; fiscalYearId: string | null };
    withTransactionWrite?: boolean;
    deleted?: boolean;
  },
) {
  const {
    transactionId,
    yearId = "open-year",
    supportingDocumentIds,
    supportingDocumentLink,
    withTransactionWrite = true,
    deleted = false,
  } = options;
  const batch = writeBatch(db);
  if (withTransactionWrite) {
    batch.set(doc(db, `${transactionDocPath(transactionId, yearId)}/revisions/rev2`), {
      ...content({ supportingDocumentIds, deleted }),
      createdBy: "alice",
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, transactionDocPath(transactionId, yearId)), {
      supportingDocumentIds,
      deleted,
      updatedBy: "alice",
      updatedAt: serverTimestamp(),
      currentRevision: "rev2",
    });
  }
  batch.update(doc(db, supportingDocumentDocPath("r1")), {
    ...supportingDocumentLink,
    updatedAt: serverTimestamp(),
  });
  return batch.commit();
}

describe("Security Rules for uploading supportingDocument records", () => {
  it("allows a member with write access to add an unattached supportingDocument", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(setDoc(doc(db, supportingDocumentDocPath("r1")), supportingDocument()));
  });

  it("rejects an unsupported content type, an empty or oversized file, and a blank name", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, supportingDocumentDocPath("r1")), supportingDocument({ contentType: "text/html" })));
    await assertFails(setDoc(doc(db, supportingDocumentDocPath("r1")), supportingDocument({ size: 0 })));
    await assertFails(setDoc(doc(db, supportingDocumentDocPath("r1")), supportingDocument({ size: 20 * 1024 * 1024 + 1 })));
    await assertFails(setDoc(doc(db, supportingDocumentDocPath("r1")), supportingDocument({ fileName: "" })));
  });

  it("rejects a forged uploader or upload time, and creating as attached or deleted", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, supportingDocumentDocPath("r1")), supportingDocument({ uploadedBy: "mallory" })));
    await assertFails(setDoc(doc(db, supportingDocumentDocPath("r1")), supportingDocument({ uploadedAt: new Date() })));
    await assertFails(
      setDoc(doc(db, supportingDocumentDocPath("r1")), supportingDocument({ transactionId: "e1", fiscalYearId: "open-year" })),
    );
    await assertFails(setDoc(doc(db, supportingDocumentDocPath("r1")), supportingDocument({ deleted: true })));
  });

  it("blocks a viewer and a non-member from adding, and a non-member from reading", async () => {
    await seed({});
    const viewer = testEnv.authenticatedContext("viewer").firestore();
    await assertFails(setDoc(doc(viewer, supportingDocumentDocPath("r2")), supportingDocument({ uploadedBy: "viewer" })));
    await assertSucceeds(getDoc(doc(viewer, supportingDocumentDocPath("r1"))));
    const stranger = testEnv.authenticatedContext("mallory").firestore();
    await assertFails(setDoc(doc(stranger, supportingDocumentDocPath("r2")), supportingDocument({ uploadedBy: "mallory" })));
    await assertFails(getDoc(doc(stranger, supportingDocumentDocPath("r1"))));
  });
});

describe("Security Rules keeping a supportingDocument's file identity and history intact", () => {
  it("rejects changing the file metadata or the uploader after the fact", async () => {
    await seed({});
    const db = testEnv.authenticatedContext("alice").firestore();
    for (const change of [
      { fileName: "other.pdf" },
      { contentType: "image/png" },
      { size: 1 },
      { uploadedBy: "mallory" },
      { uploadedAt: new Date() },
    ]) {
      await assertFails(updateDoc(doc(db, supportingDocumentDocPath("r1")), { ...change, updatedAt: serverTimestamp() }));
    }
  });

  it("allows a soft delete of an unattached supportingDocument but never a hard delete", async () => {
    await seed({});
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      updateDoc(doc(db, supportingDocumentDocPath("r1")), { deleted: true, updatedAt: serverTimestamp() }),
    );
    await assertFails(deleteDoc(doc(db, supportingDocumentDocPath("r1"))));
  });

  it("rejects soft-deleting a supportingDocument while it is still attached", async () => {
    await seed({
      supportingDocument: { transactionId: "e1", fiscalYearId: "open-year" },
      transaction: { id: "e1", content: { supportingDocumentIds: ["r1"] } },
    });
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      updateDoc(doc(db, supportingDocumentDocPath("r1")), { deleted: true, updatedAt: serverTimestamp() }),
    );
  });
});

describe("Security Rules tying a supportingDocument's attachment to the transaction's version", () => {
  it("allows attaching when the transaction's new version names the supportingDocument in the same request", async () => {
    await seed({ transaction: { id: "e1" } });
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      changeAttachment(db, {
        transactionId: "e1",
        supportingDocumentIds: ["r1"],
        supportingDocumentLink: { transactionId: "e1", fiscalYearId: "open-year" },
      }),
    );
  });

  it("rejects pointing a supportingDocument at a transaction that does not name it, or does not exist", async () => {
    await seed({ transaction: { id: "e1" } });
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      changeAttachment(db, {
        transactionId: "e1",
        supportingDocumentIds: ["r1"],
        supportingDocumentLink: { transactionId: "e1", fiscalYearId: "open-year" },
        withTransactionWrite: false,
      }),
    );
    await assertFails(
      changeAttachment(db, {
        transactionId: "e1",
        supportingDocumentIds: ["r1"],
        supportingDocumentLink: { transactionId: "missing", fiscalYearId: "open-year" },
        withTransactionWrite: false,
      }),
    );
  });

  it("rejects attaching to a deleted transaction, and a link naming only one of the two IDs", async () => {
    await seed({ transaction: { id: "e1", content: { deleted: true } } });
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      changeAttachment(db, {
        transactionId: "e1",
        supportingDocumentIds: ["r1"],
        deleted: true,
        supportingDocumentLink: { transactionId: "e1", fiscalYearId: "open-year" },
      }),
    );
    await assertFails(
      updateDoc(doc(db, supportingDocumentDocPath("r1")), {
        transactionId: "e1",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("allows detaching when the transaction lets go of the supportingDocument in the same request", async () => {
    await seed({
      supportingDocument: { transactionId: "e1", fiscalYearId: "open-year" },
      transaction: { id: "e1", content: { supportingDocumentIds: ["r1"] } },
    });
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      changeAttachment(db, {
        transactionId: "e1",
        supportingDocumentIds: [],
        supportingDocumentLink: { transactionId: null, fiscalYearId: null },
      }),
    );
  });

  it("allows releasing the supportingDocument as its transaction is soft-deleted", async () => {
    await seed({
      supportingDocument: { transactionId: "e1", fiscalYearId: "open-year" },
      transaction: { id: "e1", content: { supportingDocumentIds: ["r1"] } },
    });
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      changeAttachment(db, {
        transactionId: "e1",
        supportingDocumentIds: ["r1"],
        deleted: true,
        supportingDocumentLink: { transactionId: null, fiscalYearId: null },
      }),
    );
  });

  it("rejects detaching while the transaction still names the supportingDocument", async () => {
    await seed({
      supportingDocument: { transactionId: "e1", fiscalYearId: "open-year" },
      transaction: { id: "e1", content: { supportingDocumentIds: ["r1"] } },
    });
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      changeAttachment(db, {
        transactionId: "e1",
        supportingDocumentIds: [],
        supportingDocumentLink: { transactionId: null, fiscalYearId: null },
        withTransactionWrite: false,
      }),
    );
  });

  it("rejects detaching from a transaction in a closed year, whose version cannot change", async () => {
    await seed({
      supportingDocument: { transactionId: "e1", fiscalYearId: "closed-year" },
      transaction: { id: "e1", yearId: "closed-year", content: { date: new Date("2025-06-01"), supportingDocumentIds: ["r1"] } },
    });
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      changeAttachment(db, {
        transactionId: "e1",
        yearId: "closed-year",
        supportingDocumentIds: [],
        supportingDocumentLink: { transactionId: null, fiscalYearId: null },
      }),
    );
    await assertFails(
      changeAttachment(db, {
        transactionId: "e1",
        yearId: "closed-year",
        supportingDocumentIds: [],
        supportingDocumentLink: { transactionId: null, fiscalYearId: null },
        withTransactionWrite: false,
      }),
    );
  });
});
