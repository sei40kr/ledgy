import type { Tag, TagId } from "@account-ledgers/domain";
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
import type { TagRepository } from "@account-ledgers/usecases";
import type { TagDocument } from "./documents";
import { tagsPath } from "./paths";

const tagConverter: FirestoreDataConverter<Tag> = {
  toFirestore(tag: Tag): DocumentData {
    return {
      name: tag.name,
      searchWords: tag.searchWords,
      updatedAt: serverTimestamp(),
    } satisfies Omit<TagDocument, "createdAt" | "updatedAt"> & {
      updatedAt: FieldValue;
    };
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options?: SnapshotOptions,
  ): Tag {
    const d = snapshot.data(options) as TagDocument;
    return {
      id: snapshot.id as TagId,
      name: d.name,
      searchWords: d.searchWords ?? [],
    };
  },
};

export function createFirestoreTagRepository(db: Firestore): TagRepository {
  return {
    async list(tenantId) {
      const snapshot = await getDocs(
        query(
          collection(db, tagsPath(tenantId)).withConverter(tagConverter),
          orderBy("name"),
        ),
      );
      return snapshot.docs.map((d) => d.data());
    },

    async add(tenantId, tag) {
      const ref = doc(collection(db, tagsPath(tenantId)));
      await setDoc(ref, {
        name: tag.name,
        searchWords: tag.searchWords,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id as TagId;
    },

    async save(tenantId, tag) {
      // toFirestore omits createdAt and stamps updatedAt; merge preserves createdAt.
      await setDoc(
        doc(db, tagsPath(tenantId), tag.id).withConverter(tagConverter),
        tag,
        { merge: true },
      );
    },
  };
}
