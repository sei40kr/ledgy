import type {
  FiscalYearId,
  SupportingDocument,
  SupportingDocumentContentType,
  SupportingDocumentId,
  TransactionId,
  UserId,
} from "@account-ledgers/domain";
import {
  collection,
  doc,
  type DocumentData,
  type FieldValue,
  type Firestore,
  type FirestoreDataConverter,
  getDoc,
  getDocs,
  orderBy,
  query,
  type QueryDocumentSnapshot,
  serverTimestamp,
  setDoc,
  type SnapshotOptions,
  where,
} from "firebase/firestore";
import {
  type FirebaseStorage,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import type { SupportingDocumentRepository } from "@account-ledgers/usecases";
import type { SupportingDocumentDocument } from "../firestore/documents";
import { supportingDocumentsPath } from "../firestore/paths";

/**
 * Where a supporting document's file lives in Cloud Storage. Mirrors the Firestore path so
 * the Storage rules can scope access by tenant the same way.
 */
export const supportingDocumentObjectPath = (tenantId: string, supportingDocumentId: string) =>
  `tenants/${tenantId}/supportingDocuments/${supportingDocumentId}`;

/**
 * Read/write mapping for the supporting document record. The immutable file metadata
 * (fileName / contentType / size / uploadedBy / uploadedAt) is written once by
 * add; toFirestore carries only what may change afterwards, so a save cannot
 * touch the file identity.
 */
const supportingDocumentConverter: FirestoreDataConverter<SupportingDocument> = {
  toFirestore(supportingDocument: SupportingDocument): DocumentData {
    return {
      transactionId: supportingDocument.attachedTo?.transactionId ?? null,
      fiscalYearId: supportingDocument.attachedTo?.fiscalYearId ?? null,
      deleted: supportingDocument.deleted,
      updatedAt: serverTimestamp(),
    } satisfies Pick<
      SupportingDocumentDocument,
      "transactionId" | "fiscalYearId" | "deleted"
    > & { updatedAt: FieldValue };
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options?: SnapshotOptions,
  ): SupportingDocument {
    const d = snapshot.data(options) as SupportingDocumentDocument;
    return {
      id: snapshot.id as SupportingDocumentId,
      fileName: d.fileName,
      contentType: d.contentType as SupportingDocumentContentType,
      size: d.size,
      uploadedBy: d.uploadedBy as UserId,
      uploadedAt: d.uploadedAt?.toDate() ?? null,
      attachedTo:
        d.transactionId && d.fiscalYearId
          ? {
              fiscalYearId: d.fiscalYearId as FiscalYearId,
              transactionId: d.transactionId as TransactionId,
            }
          : null,
      deleted: d.deleted,
    };
  },
};

/**
 * Supporting documents span two Firebase services: the bytes go to Cloud Storage and the
 * record to Firestore, under the same tenant-scoped path. The object is
 * uploaded first, so a record never points at a missing file; an upload whose
 * record write fails leaves an unreachable object behind, which is harmless.
 */
export function createFirebaseSupportingDocumentRepository(
  db: Firestore,
  storage: FirebaseStorage,
): SupportingDocumentRepository {
  return {
    async listByTransaction(tenantId, transactionId) {
      const snapshot = await getDocs(
        query(
          collection(db, supportingDocumentsPath(tenantId)).withConverter(supportingDocumentConverter),
          where("deleted", "==", false),
          where("transactionId", "==", transactionId),
          orderBy("uploadedAt", "desc"),
        ),
      );
      return snapshot.docs.map((d) => d.data());
    },

    async get(tenantId, supportingDocumentId) {
      const snapshot = await getDoc(
        doc(db, supportingDocumentsPath(tenantId), supportingDocumentId).withConverter(supportingDocumentConverter),
      );
      return snapshot.data() ?? null;
    },

    async add(tenantId, supportingDocument, bytes) {
      const ref = doc(collection(db, supportingDocumentsPath(tenantId)));
      await uploadBytes(
        storageRef(storage, supportingDocumentObjectPath(tenantId, ref.id)),
        bytes,
        { contentType: supportingDocument.contentType },
      );
      await setDoc(ref, {
        fileName: supportingDocument.fileName,
        contentType: supportingDocument.contentType,
        size: supportingDocument.size,
        uploadedBy: supportingDocument.uploadedBy,
        uploadedAt: serverTimestamp(),
        transactionId: supportingDocument.attachedTo?.transactionId ?? null,
        fiscalYearId: supportingDocument.attachedTo?.fiscalYearId ?? null,
        deleted: supportingDocument.deleted,
        updatedAt: serverTimestamp(),
      });
      return ref.id as SupportingDocumentId;
    },

    async save(tenantId, supportingDocument) {
      // toFirestore omits the file metadata and stamps updatedAt; merge preserves the rest.
      await setDoc(
        doc(db, supportingDocumentsPath(tenantId), supportingDocument.id).withConverter(supportingDocumentConverter),
        supportingDocument,
        { merge: true },
      );
    },

    async fileUrl(tenantId, supportingDocumentId) {
      return getDownloadURL(
        storageRef(storage, supportingDocumentObjectPath(tenantId, supportingDocumentId)),
      );
    },
  };
}
