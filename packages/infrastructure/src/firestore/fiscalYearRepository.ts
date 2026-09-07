import { FiscalYear, type FiscalYearId } from "@account-ledgers/domain";
import {
  collection,
  doc,
  type DocumentData,
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
} from "firebase/firestore";
import type { FiscalYearRepository } from "@account-ledgers/usecases";
import type { FiscalYearDocument } from "./documents";
import { fiscalYearsPath } from "./paths";

const fiscalYearConverter: FirestoreDataConverter<FiscalYear> = {
  toFirestore(fiscalYear: FiscalYear): DocumentData {
    // startDate/endDate are Dates; Firestore stores them as Timestamps. createdAt
    // is omitted so a merge write preserves it, and updatedAt is re-stamped.
    return {
      startDate: fiscalYear.startDate,
      endDate: fiscalYear.endDate,
      status: fiscalYear.status,
      updatedAt: serverTimestamp(),
    };
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options?: SnapshotOptions,
  ): FiscalYear {
    const d = snapshot.data(options) as FiscalYearDocument;
    return new FiscalYear(
      snapshot.id as FiscalYearId,
      d.startDate.toDate(),
      d.endDate.toDate(),
      d.status as FiscalYear["status"],
    );
  },
};

export function createFirestoreFiscalYearRepository(
  db: Firestore,
): FiscalYearRepository {
  return {
    async list(tenantId) {
      const snapshot = await getDocs(
        query(
          collection(db, fiscalYearsPath(tenantId)).withConverter(
            fiscalYearConverter,
          ),
          orderBy("startDate", "desc"),
        ),
      );
      return snapshot.docs.map((d) => d.data());
    },

    async get(tenantId, yearId) {
      const snapshot = await getDoc(
        doc(db, fiscalYearsPath(tenantId), yearId).withConverter(
          fiscalYearConverter,
        ),
      );
      return snapshot.data() ?? null;
    },

    async add(tenantId, fiscalYear) {
      const ref = doc(collection(db, fiscalYearsPath(tenantId)));
      await setDoc(ref, {
        startDate: fiscalYear.startDate,
        endDate: fiscalYear.endDate,
        status: fiscalYear.status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id as FiscalYearId;
    },

    async save(tenantId, fiscalYear) {
      // toFirestore omits createdAt and stamps updatedAt; merge preserves createdAt.
      await setDoc(
        doc(db, fiscalYearsPath(tenantId), fiscalYear.id).withConverter(
          fiscalYearConverter,
        ),
        fiscalYear,
        { merge: true },
      );
    },
  };
}
