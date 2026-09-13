import {
  type AccountTitleId,
  SupportingDocumentContentTypeUnsupportedError,
  type FiscalYearId,
  MonetaryAmount,
  type Posting,
  type PostingSide,
  type SupportingDocumentId,
  type TenantId,
  type UserId,
} from "@account-ledgers/domain";
import {
  FiscalYearClosedError,
  SupportingDocumentAlreadyAttachedError,
  SupportingDocumentAttachedElsewhereError,
  SupportingDocumentNotFoundError,
} from "@account-ledgers/usecases";
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createFiscalYearUseCases,
  createSupportingDocumentUseCases,
  createTransactionUseCases,
} from "./composeUseCases";
import { signUpUseCase } from "@account-ledgers/usecases";
import { createFirebaseAuthAdapter } from "@account-ledgers/infrastructure/auth/firebaseAuthAdapter";
import { createFirebaseSupportingDocumentRepository } from "@account-ledgers/infrastructure/firebase/supportingDocumentRepository";
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

const draft = {
  date: new Date("2026-03-05"),
  partners: [],
  tags: [],
  postings: [
    posting("debit", "supplies", 2500, "証憑付きの仕訳"),
    posting("credit", "cash", 2500),
  ],
};

function pdfFile(name = "supportingDocument.pdf") {
  const bytes = new TextEncoder().encode("%PDF-1.4 test");
  return { name, contentType: "application/pdf", size: bytes.byteLength, bytes: bytes.buffer as ArrayBuffer };
}

function usecases() {
  const fiscalYears = createFirestoreFiscalYearRepository(firebase.db);
  const transactions = createFirestoreTransactionRepository(firebase.db);
  const supportingDocuments = createFirebaseSupportingDocumentRepository(firebase.db, firebase.storage);
  return {
    fiscalYears: createFiscalYearUseCases({ fiscalYears, transactions }),
    transactions: createTransactionUseCases({ transactions, fiscalYears }),
    supportingDocuments: createSupportingDocumentUseCases({ supportingDocuments, transactions, fiscalYears }),
  };
}

async function getTransaction(transactionId: string) {
  const snapshot = await getDoc(
    doc(firebase.db, `tenants/${tenantId}/fiscalYears/${yearId}/transactions/${transactionId}`),
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

async function upload(name?: string): Promise<SupportingDocumentId> {
  return usecases().supportingDocuments.upload({ tenantId, file: pdfFile(name), uploadedBy: uid });
}

beforeAll(async () => {
  firebase = createTestFirebase();
  const signUp = signUpUseCase({
    auth: createFirebaseAuthAdapter(firebase.auth),
    tenants: createFirestoreTenantRepository(firebase.db),
  });
  ({ tenantId } = await signUp({ email: uniqueEmail("supportingDocuments"), password: "password123" }));
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

describe("supportingDocuments integration (real emulators, real Security Rules)", () => {
  it("upload: stores the file and an unattached record, and serves a URL for the file", async () => {
    const { supportingDocuments } = usecases();
    const supportingDocumentId = await upload("first.pdf");

    const supportingDocument = await supportingDocuments.get({ tenantId, supportingDocumentId });
    expect(supportingDocument).toMatchObject({
      fileName: "first.pdf",
      contentType: "application/pdf",
      uploadedBy: uid,
      attachedTo: null,
      deleted: false,
    });
    expect(supportingDocument?.uploadedAt).toBeInstanceOf(Date);

    const url = await supportingDocuments.getFileUrl({ tenantId, supportingDocumentId });
    const response = await fetch(url);
    expect(response.ok).toBe(true);
    expect(await response.text()).toBe("%PDF-1.4 test");
  });

  it("upload: the domain rejects an unsupported file before anything is written", async () => {
    const { supportingDocuments } = usecases();
    await expect(
      supportingDocuments.upload({
        tenantId,
        file: { ...pdfFile("notes.txt"), contentType: "text/plain" },
        uploadedBy: uid,
      }),
    ).rejects.toThrow(SupportingDocumentContentTypeUnsupportedError);
  });

  it("create: attaches supportingDocuments uploaded ahead of the transaction, atomically with its first version", async () => {
    const { transactions, supportingDocuments } = usecases();
    const supportingDocumentId = await upload();
    const { transactionId } = await transactions.create({
      tenantId,
      yearId,
      createdBy: uid,
      draft,
      supportingDocumentIds: [supportingDocumentId],
    });

    expect((await getTransaction(transactionId))?.supportingDocumentIds).toEqual([supportingDocumentId]);
    expect((await listRevisions(transactionId))[0]?.supportingDocumentIds).toEqual([supportingDocumentId]);
    const attached = await supportingDocuments.list({ tenantId, transactionId });
    expect(attached.map((r) => r.id)).toEqual([supportingDocumentId]);
    expect(attached[0]?.attachedTo).toEqual({ fiscalYearId: yearId, transactionId });
  });

  it("create: refuses a supportingDocument already attached elsewhere, writing nothing", async () => {
    const { transactions } = usecases();
    const supportingDocumentId = await upload();
    await transactions.create({ tenantId, yearId, createdBy: uid, draft, supportingDocumentIds: [supportingDocumentId] });
    await expect(
      transactions.create({ tenantId, yearId, createdBy: uid, draft, supportingDocumentIds: [supportingDocumentId] }),
    ).rejects.toThrow(SupportingDocumentAttachedElsewhereError);
  });

  it("attach: a new version of the transaction; update keeps the attachments; delete detaches in a version of its own", async () => {
    const { transactions, supportingDocuments } = usecases();
    const { transactionId } = await transactions.create({ tenantId, yearId, createdBy: uid, draft });
    const supportingDocumentId = await upload();

    await transactions.attachSupportingDocument({ tenantId, yearId, transactionId, supportingDocumentId, updatedBy: uid });
    expect((await getTransaction(transactionId))?.supportingDocumentIds).toEqual([supportingDocumentId]);
    expect((await supportingDocuments.get({ tenantId, supportingDocumentId }))?.attachedTo).toEqual({
      fiscalYearId: yearId,
      transactionId,
    });
    await expect(
      transactions.attachSupportingDocument({ tenantId, yearId, transactionId, supportingDocumentId, updatedBy: uid }),
    ).rejects.toThrow(SupportingDocumentAlreadyAttachedError);

    await transactions.update({
      tenantId,
      yearId,
      transactionId,
      updatedBy: uid,
      draft: {
        ...draft,
        postings: [
          posting("debit", "supplies", 2500, "摘要だけ変更"),
          posting("credit", "cash", 2500),
        ],
      },
    });
    expect((await getTransaction(transactionId))?.supportingDocumentIds).toEqual([supportingDocumentId]);

    await supportingDocuments.delete({ tenantId, supportingDocumentId, deletedBy: uid });
    const header = await getTransaction(transactionId);
    expect(header?.supportingDocumentIds).toEqual([]);
    expect(header?.debitTotal).toBe(2500);

    const revisions = await listRevisions(transactionId);
    expect(revisions.map((r) => r.supportingDocumentIds)).toEqual([[], [supportingDocumentId], [supportingDocumentId], []]);
    expect(revisions.map((r) => r.postings[0]?.memo)).toEqual([
      "証憑付きの仕訳",
      "証憑付きの仕訳",
      "摘要だけ変更",
      "摘要だけ変更",
    ]);
  });

  it("softDelete: releases the supportingDocuments while the deleted version still lists them", async () => {
    // A released supporting document is kept (never hard-deleted); the corrected transaction can name it again.
    const { transactions, supportingDocuments } = usecases();
    const supportingDocumentId = await upload();
    const { transactionId } = await transactions.create({
      tenantId,
      yearId,
      createdBy: uid,
      draft,
      supportingDocumentIds: [supportingDocumentId],
    });
    await transactions.softDelete({ tenantId, yearId, transactionId, updatedBy: uid });

    expect((await supportingDocuments.get({ tenantId, supportingDocumentId }))?.attachedTo).toBeNull();
    const revisions = await listRevisions(transactionId);
    expect(revisions.at(-1)).toMatchObject({ deleted: true, supportingDocumentIds: [supportingDocumentId] });

    const corrected = await transactions.create({
      tenantId,
      yearId,
      createdBy: uid,
      draft,
      supportingDocumentIds: [supportingDocumentId],
    });
    expect((await supportingDocuments.get({ tenantId, supportingDocumentId }))?.attachedTo?.transactionId).toBe(
      corrected.transactionId,
    );
  });

  it("delete: soft-deletes the record, detaches it from its transaction, and leaves the file in place", async () => {
    const { transactions, supportingDocuments } = usecases();
    const supportingDocumentId = await upload();
    const { transactionId } = await transactions.create({
      tenantId,
      yearId,
      createdBy: uid,
      draft,
      supportingDocumentIds: [supportingDocumentId],
    });
    const url = await supportingDocuments.getFileUrl({ tenantId, supportingDocumentId });

    await supportingDocuments.delete({ tenantId, supportingDocumentId, deletedBy: uid });

    expect(await supportingDocuments.get({ tenantId, supportingDocumentId })).toBeNull();
    expect(await supportingDocuments.list({ tenantId, transactionId })).toEqual([]);
    expect((await getTransaction(transactionId))?.supportingDocumentIds).toEqual([]);
    const record = await getDoc(doc(firebase.db, `tenants/${tenantId}/supportingDocuments/${supportingDocumentId}`));
    expect(record.data()).toMatchObject({ deleted: true, transactionId: null });
    expect((await fetch(url)).ok).toBe(true);
    await expect(
      transactions.attachSupportingDocument({ tenantId, yearId, transactionId, supportingDocumentId, updatedBy: uid }),
    ).rejects.toThrow(SupportingDocumentNotFoundError);
  });

  it("closed year: attaching, and deleting an attached supportingDocument, are refused like any other change", async () => {
    const { transactions, supportingDocuments, fiscalYears } = usecases();
    const supportingDocumentId = await upload();
    const attachedId = await upload();
    const { transactionId } = await transactions.create({
      tenantId,
      yearId,
      createdBy: uid,
      draft,
      supportingDocumentIds: [attachedId],
    });
    await fiscalYears.setStatus({ tenantId, yearId, status: "closed" });
    try {
      await expect(
        transactions.attachSupportingDocument({ tenantId, yearId, transactionId, supportingDocumentId, updatedBy: uid }),
      ).rejects.toThrow(FiscalYearClosedError);
      await expect(
        supportingDocuments.delete({ tenantId, supportingDocumentId: attachedId, deletedBy: uid }),
      ).rejects.toThrow(FiscalYearClosedError);
      expect((await supportingDocuments.get({ tenantId, supportingDocumentId: attachedId }))?.deleted).toBe(false);
    } finally {
      await fiscalYears.setStatus({ tenantId, yearId, status: "open" });
    }
  });
});
