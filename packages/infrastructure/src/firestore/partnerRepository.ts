import type { Partner, PartnerId } from "@account-ledgers/domain";
import {
  collection,
  doc,
  type DocumentData,
  type FieldValue,
  type Firestore,
  type FirestoreDataConverter,
  getDocs,
  orderBy,
  query,
  type QueryDocumentSnapshot,
  serverTimestamp,
  setDoc,
  type SnapshotOptions,
} from "firebase/firestore";
import type { PartnerRepository } from "@account-ledgers/usecases";
import type { PartnerDocument } from "./documents";
import { partnersPath } from "./paths";

const partnerConverter: FirestoreDataConverter<Partner> = {
  toFirestore(partner: Partner): DocumentData {
    return {
      name: partner.name,
      searchWords: partner.searchWords,
      updatedAt: serverTimestamp(),
    } satisfies Omit<PartnerDocument, "createdAt" | "updatedAt"> & {
      updatedAt: FieldValue;
    };
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options?: SnapshotOptions,
  ): Partner {
    const d = snapshot.data(options) as PartnerDocument;
    return {
      id: snapshot.id as PartnerId,
      name: d.name,
      searchWords: d.searchWords ?? [],
    };
  },
};

export function createFirestorePartnerRepository(
  db: Firestore,
): PartnerRepository {
  return {
    async list(tenantId) {
      const snapshot = await getDocs(
        query(
          collection(db, partnersPath(tenantId)).withConverter(partnerConverter),
          orderBy("name"),
        ),
      );
      return snapshot.docs.map((d) => d.data());
    },

    async add(tenantId, partner) {
      const ref = doc(collection(db, partnersPath(tenantId)));
      await setDoc(ref, {
        name: partner.name,
        searchWords: partner.searchWords,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id as PartnerId;
    },

    async save(tenantId, partner) {
      // toFirestore omits createdAt and stamps updatedAt; merge preserves createdAt.
      await setDoc(
        doc(db, partnersPath(tenantId), partner.id).withConverter(
          partnerConverter,
        ),
        partner,
        { merge: true },
      );
    },
  };
}
