import { randomUUID } from "node:crypto";
import { deleteApp, type FirebaseApp, initializeApp } from "firebase/app";
import { type Auth, connectAuthEmulator, getAuth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  type Firestore,
  getFirestore,
} from "firebase/firestore";
import {
  connectStorageEmulator,
  type FirebaseStorage,
  getStorage,
} from "firebase/storage";

export interface TestFirebase {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
  cleanup(): Promise<void>;
}

/**
 * Creates a Firebase client for tests, connected to the emulators.
 * Assumes execution through emulators:exec; the ports match firebase.json.
 */
export function createTestFirebase(): TestFirebase {
  const app = initializeApp(
    {
      projectId: "demo-account-ledgers",
      apiKey: "demo-api-key",
      storageBucket: "demo-account-ledgers.appspot.com",
    },
    `test-${randomUUID()}`,
  );
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  const storage = getStorage(app);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  return {
    app,
    auth,
    db,
    storage,
    cleanup: () => deleteApp(app),
  };
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}@example.com`;
}
