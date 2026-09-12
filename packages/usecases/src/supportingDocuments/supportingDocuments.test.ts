import {
  FiscalYear,
  type FiscalYearId,
  SupportingDocumentContentTypeUnsupportedError,
  SupportingDocumentFileEmptyError,
  type SupportingDocument,
  type SupportingDocumentId,
  type TenantId,
  type TransactionId,
  type UserId,
} from "@account-ledgers/domain";
import { describe, expect, it } from "vitest";
import { FiscalYearClosedError } from "../fiscalYears/errors";
import {
  SupportingDocumentFileNameRequiredError,
  SupportingDocumentNotFoundError,
} from "./errors";
import type { FiscalYearRepository } from "../ports/fiscalYearRepository";
import type { SupportingDocumentRepository } from "../ports/supportingDocumentRepository";
import type { TransactionRepository } from "../ports/transactionRepository";
import { attachSupportingDocumentToTransactionUseCase } from "../transactions/attachSupportingDocumentToTransaction";
import { deleteSupportingDocumentUseCase } from "./deleteSupportingDocument";
import { getSupportingDocumentUseCase } from "./getSupportingDocument";
import { listSupportingDocumentsUseCase } from "./listSupportingDocuments";
import { uploadSupportingDocumentUseCase } from "./uploadSupportingDocument";

const tenant = "t1" as TenantId;
const user = "u1" as UserId;
const openYear = "fy-open" as FiscalYearId;
const closedYear = "fy-closed" as FiscalYearId;
const transaction = "tx1" as TransactionId;

function file(overrides: Partial<{ name: string; contentType: string; size: number }> = {}) {
  return {
    name: "supportingDocument.pdf",
    contentType: "application/pdf",
    size: 1234,
    bytes: new ArrayBuffer(8),
    ...overrides,
  };
}

/** In-memory supporting documents plus a transaction repository that only tracks the attachment link. */
function createFakes() {
  const supportingDocuments = new Map<string, SupportingDocument>();
  let seq = 0;

  const supportingDocumentRepository: SupportingDocumentRepository = {
    async listByTransaction(_tenantId, transactionId) {
      return [...supportingDocuments.values()].filter(
        (r) => !r.deleted && r.attachedTo?.transactionId === transactionId,
      );
    },
    async get(_tenantId, supportingDocumentId) {
      return supportingDocuments.get(supportingDocumentId) ?? null;
    },
    async add(_tenantId, supportingDocument) {
      const id = `r-${++seq}` as SupportingDocumentId;
      supportingDocuments.set(id, { id, uploadedAt: new Date(), ...supportingDocument });
      return id;
    },
    async save(_tenantId, supportingDocument) {
      if (!supportingDocuments.has(supportingDocument.id)) throw new Error("not found");
      supportingDocuments.set(supportingDocument.id, supportingDocument);
    },
    async fileUrl(_tenantId, supportingDocumentId) {
      return `https://example.test/${supportingDocumentId}`;
    },
  };

  const unused = () => {
    throw new Error("unused");
  };
  const transactionRepository: TransactionRepository = {
    create: unused,
    update: unused,
    softDelete: unused,
    get: unused,
    listRevisions: unused,
    search: unused,
    listAllActive: unused,
    getOpeningBalance: unused,
    saveOpeningBalance: unused,
    async attachSupportingDocument({ yearId, transactionId, supportingDocumentId }) {
      const supportingDocument = supportingDocuments.get(supportingDocumentId);
      if (!supportingDocument) throw new Error("not found");
      supportingDocuments.set(supportingDocumentId, {
        ...supportingDocument,
        attachedTo: { fiscalYearId: yearId, transactionId },
      });
    },
    async detachSupportingDocument({ supportingDocumentId }) {
      const supportingDocument = supportingDocuments.get(supportingDocumentId);
      if (!supportingDocument) throw new Error("not found");
      supportingDocuments.set(supportingDocumentId, { ...supportingDocument, attachedTo: null });
    },
  };

  const years = new Map<string, FiscalYear>([
    [openYear, new FiscalYear(openYear, new Date("2026-01-01"), new Date("2026-12-31"), "open")],
    [closedYear, new FiscalYear(closedYear, new Date("2025-01-01"), new Date("2025-12-31"), "closed")],
  ]);
  const fiscalYearRepository: FiscalYearRepository = {
    list: unused,
    async get(_tenantId, yearId) {
      return years.get(yearId) ?? null;
    },
    add: unused,
    save: unused,
  };

  const deps = {
    supportingDocuments: supportingDocumentRepository,
    transactions: transactionRepository,
    fiscalYears: fiscalYearRepository,
  };
  return {
    supportingDocuments,
    usecases: {
      upload: uploadSupportingDocumentUseCase(deps),
      list: listSupportingDocumentsUseCase(deps),
      get: getSupportingDocumentUseCase(deps),
      delete: deleteSupportingDocumentUseCase(deps),
      attach: attachSupportingDocumentToTransactionUseCase(deps),
    },
  };
}

describe("supportingDocument usecases", () => {
  it("uploads a supportingDocument as unattached, trimming the file name", async () => {
    const { usecases } = createFakes();
    const id = await usecases.upload({
      tenantId: tenant,
      file: file({ name: "  証憑.pdf " }),
      uploadedBy: user,
    });
    const supportingDocument = await usecases.get({ tenantId: tenant, supportingDocumentId: id });
    expect(supportingDocument).toMatchObject({
      fileName: "証憑.pdf",
      contentType: "application/pdf",
      size: 1234,
      uploadedBy: user,
      attachedTo: null,
      deleted: false,
    });
  });

  it("rejects an unsupported file type, an empty file, and an empty name", async () => {
    const { usecases } = createFakes();
    await expect(
      usecases.upload({ tenantId: tenant, file: file({ contentType: "text/csv" }), uploadedBy: user }),
    ).rejects.toThrow(SupportingDocumentContentTypeUnsupportedError);
    await expect(
      usecases.upload({ tenantId: tenant, file: file({ size: 0 }), uploadedBy: user }),
    ).rejects.toThrow(SupportingDocumentFileEmptyError);
    await expect(
      usecases.upload({ tenantId: tenant, file: file({ name: "  " }), uploadedBy: user }),
    ).rejects.toThrow(SupportingDocumentFileNameRequiredError);
  });

  it("lists the live supportingDocuments of one transaction", async () => {
    const { usecases } = createFakes();
    const first = await usecases.upload({ tenantId: tenant, file: file(), uploadedBy: user });
    await usecases.upload({ tenantId: tenant, file: file(), uploadedBy: user });
    await usecases.attach({
      tenantId: tenant,
      yearId: openYear,
      transactionId: transaction,
      supportingDocumentId: first,
      updatedBy: user,
    });

    const ids = (supportingDocuments: SupportingDocument[]) => supportingDocuments.map((r) => r.id);
    expect(
      ids(await usecases.list({ tenantId: tenant, transactionId: transaction })),
    ).toEqual([first]);
  });

  it("refuses to attach in a closed fiscal year", async () => {
    const { usecases } = createFakes();
    const id = await usecases.upload({ tenantId: tenant, file: file(), uploadedBy: user });
    await expect(
      usecases.attach({
        tenantId: tenant,
        yearId: closedYear,
        transactionId: transaction,
        supportingDocumentId: id,
        updatedBy: user,
      }),
    ).rejects.toThrow(FiscalYearClosedError);
  });

  it("soft-deletes an unattached supportingDocument, which then disappears from get", async () => {
    const { usecases, supportingDocuments } = createFakes();
    const id = await usecases.upload({ tenantId: tenant, file: file(), uploadedBy: user });
    await usecases.delete({ tenantId: tenant, supportingDocumentId: id, deletedBy: user });

    expect(supportingDocuments.get(id)?.deleted).toBe(true);
    expect(await usecases.get({ tenantId: tenant, supportingDocumentId: id })).toBeNull();
    await expect(
      usecases.delete({ tenantId: tenant, supportingDocumentId: id, deletedBy: user }),
    ).rejects.toThrow(SupportingDocumentNotFoundError);
  });

  it("detaches an attached supportingDocument before soft-deleting it, so the year must be open", async () => {
    const { usecases, supportingDocuments } = createFakes();
    const id = await usecases.upload({ tenantId: tenant, file: file(), uploadedBy: user });
    await usecases.attach({
      tenantId: tenant,
      yearId: openYear,
      transactionId: transaction,
      supportingDocumentId: id,
      updatedBy: user,
    });
    await usecases.delete({ tenantId: tenant, supportingDocumentId: id, deletedBy: user });
    expect(supportingDocuments.get(id)).toMatchObject({ attachedTo: null, deleted: true });
    expect(await usecases.list({ tenantId: tenant, transactionId: transaction })).toEqual([]);

    const inClosedYear = await usecases.upload({ tenantId: tenant, file: file(), uploadedBy: user });
    supportingDocuments.set(inClosedYear, {
      ...supportingDocuments.get(inClosedYear)!,
      attachedTo: { fiscalYearId: closedYear, transactionId: transaction },
    });
    await expect(
      usecases.delete({ tenantId: tenant, supportingDocumentId: inClosedYear, deletedBy: user }),
    ).rejects.toThrow(FiscalYearClosedError);
    expect(supportingDocuments.get(inClosedYear)?.deleted).toBe(false);
  });
});
