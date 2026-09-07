import {
  collection,
  doc,
  type Firestore,
  getDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import type { TenantRepository } from "@account-ledgers/usecases";
import { accountTitlesPath, memberPath, tenantPath } from "./paths";

export function createFirestoreTenantRepository(
  db: Firestore,
): TenantRepository {
  return {
    async provisionTenant({ tenantId, uid, accountTitles }) {
      const batch = writeBatch(db);
      batch.set(doc(db, tenantPath(tenantId)), {
        createdAt: serverTimestamp(),
      });
      batch.set(doc(db, memberPath(tenantId, uid)), {
        role: "admin",
        createdAt: serverTimestamp(),
      });
      for (const accountTitle of accountTitles) {
        batch.set(doc(collection(db, accountTitlesPath(tenantId))), {
          name: accountTitle.name,
          category: accountTitle.category,
          isActive: true,
          defaultTaxCategory: accountTitle.defaultTaxCategory?.code ?? null,
          searchWords: accountTitle.searchWords,
          sortOrder: accountTitle.sortOrder,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    },

    async exists(tenantId) {
      const snapshot = await getDoc(doc(db, tenantPath(tenantId)));
      return snapshot.exists();
    },
  };
}
