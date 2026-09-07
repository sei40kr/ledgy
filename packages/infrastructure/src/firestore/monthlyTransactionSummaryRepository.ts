import type { MonthlyTransactionSummary } from "@account-ledgers/domain";
import {
  collection,
  doc,
  type Firestore,
  getDocs,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import type { MonthlyTransactionSummaryRepository } from "@account-ledgers/usecases";
import { monthlyTransactionSummariesPath } from "./paths";

export function createFirestoreMonthlyTransactionSummaryRepository(
  db: Firestore,
): MonthlyTransactionSummaryRepository {
  return {
    async list(tenantId, yearId) {
      const snapshot = await getDocs(
        collection(db, monthlyTransactionSummariesPath(tenantId, yearId)),
      );
      return Object.fromEntries(
        snapshot.docs.map((d) => [
          d.id,
          (d.data().totals ?? {}) as MonthlyTransactionSummary,
        ]),
      );
    },

    async replaceAll(tenantId, yearId, summaries) {
      // Replace every existing summary doc with the rebuilt ones in a single batch.
      // Hard deletes are forbidden, so months absent from the rebuild are overwritten
      // with an empty summary instead.
      const existing = await getDocs(
        collection(db, monthlyTransactionSummariesPath(tenantId, yearId)),
      );
      const batch = writeBatch(db);
      const written = new Set<string>();
      for (const [monthKey, totals] of Object.entries(summaries)) {
        batch.set(doc(db, monthlyTransactionSummariesPath(tenantId, yearId), monthKey), {
          totals,
          updatedAt: serverTimestamp(),
        });
        written.add(monthKey);
      }
      for (const summaryDoc of existing.docs) {
        if (!written.has(summaryDoc.id)) {
          batch.set(summaryDoc.ref, {
            totals: {},
            updatedAt: serverTimestamp(),
          });
        }
      }
      await batch.commit();
    },
  };
}
