import {
  type AccountTitle,
  type AccountTitleId,
  type SubAccountTitle,
  type SubAccountTitleId,
  TaxCategory,
} from "@account-ledgers/domain";
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
import type { AccountTitleRepository } from "@account-ledgers/usecases";
import type {
  AccountTitleDocument,
  SubAccountTitleDocument,
} from "./documents";
import { accountTitlesPath, subAccountTitlesPath } from "./paths";

const accountTitleConverter: FirestoreDataConverter<AccountTitle> = {
  toFirestore(accountTitle: AccountTitle): DocumentData {
    return {
      name: accountTitle.name,
      category: accountTitle.category,
      isActive: accountTitle.isActive,
      defaultTaxCategory: accountTitle.defaultTaxCategory?.code ?? null,
      searchWords: accountTitle.searchWords,
      sortOrder: accountTitle.sortOrder,
      updatedAt: serverTimestamp(),
    } satisfies Omit<AccountTitleDocument, "createdAt" | "updatedAt"> & {
      updatedAt: FieldValue;
    };
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options?: SnapshotOptions,
  ): AccountTitle {
    const d = snapshot.data(options) as AccountTitleDocument;
    return {
      id: snapshot.id as AccountTitleId,
      name: d.name,
      category: d.category as AccountTitle["category"],
      isActive: d.isActive,
      defaultTaxCategory: d.defaultTaxCategory
        ? new TaxCategory(d.defaultTaxCategory as TaxCategory["code"])
        : null,
      searchWords: d.searchWords ?? [],
      sortOrder: d.sortOrder,
    };
  },
};

const subAccountTitleConverter: FirestoreDataConverter<SubAccountTitle> = {
  toFirestore(subAccountTitle: SubAccountTitle): DocumentData {
    return {
      name: subAccountTitle.name,
      isActive: subAccountTitle.isActive,
      searchWords: subAccountTitle.searchWords,
      sortOrder: subAccountTitle.sortOrder,
      updatedAt: serverTimestamp(),
    } satisfies Omit<SubAccountTitleDocument, "createdAt" | "updatedAt"> & {
      updatedAt: FieldValue;
    };
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options?: SnapshotOptions,
  ): SubAccountTitle {
    const d = snapshot.data(options) as SubAccountTitleDocument;
    return {
      id: snapshot.id as SubAccountTitleId,
      name: d.name,
      isActive: d.isActive,
      searchWords: d.searchWords ?? [],
      sortOrder: d.sortOrder,
    };
  },
};

export function createFirestoreAccountTitleRepository(
  db: Firestore,
): AccountTitleRepository {
  return {
    async list(tenantId) {
      const snapshot = await getDocs(
        query(
          collection(db, accountTitlesPath(tenantId)).withConverter(
            accountTitleConverter,
          ),
          orderBy("sortOrder"),
        ),
      );
      return snapshot.docs.map((d) => d.data());
    },

    async add(tenantId, accountTitle) {
      const ref = doc(collection(db, accountTitlesPath(tenantId)));
      await setDoc(ref, {
        name: accountTitle.name,
        category: accountTitle.category,
        isActive: accountTitle.isActive,
        defaultTaxCategory: accountTitle.defaultTaxCategory?.code ?? null,
        searchWords: accountTitle.searchWords,
        sortOrder: accountTitle.sortOrder,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id as AccountTitleId;
    },

    async save(tenantId, accountTitle) {
      // toFirestore omits createdAt and stamps updatedAt; merge preserves createdAt.
      await setDoc(
        doc(db, accountTitlesPath(tenantId), accountTitle.id).withConverter(
          accountTitleConverter,
        ),
        accountTitle,
        { merge: true },
      );
    },

    async listSubAccountTitles(tenantId, accountTitleId) {
      const snapshot = await getDocs(
        query(
          collection(
            db,
            subAccountTitlesPath(tenantId, accountTitleId),
          ).withConverter(subAccountTitleConverter),
          orderBy("sortOrder"),
        ),
      );
      return snapshot.docs.map((d) => d.data());
    },

    async addSubAccountTitle(tenantId, accountTitleId, subAccountTitle) {
      const ref = doc(collection(db, subAccountTitlesPath(tenantId, accountTitleId)));
      await setDoc(ref, {
        name: subAccountTitle.name,
        isActive: subAccountTitle.isActive,
        searchWords: subAccountTitle.searchWords,
        sortOrder: subAccountTitle.sortOrder,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id as SubAccountTitleId;
    },

    async saveSubAccountTitle(tenantId, accountTitleId, subAccountTitle) {
      await setDoc(
        doc(
          db,
          subAccountTitlesPath(tenantId, accountTitleId),
          subAccountTitle.id,
        ).withConverter(subAccountTitleConverter),
        subAccountTitle,
        { merge: true },
      );
    },
  };
}
