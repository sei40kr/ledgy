import { randomUUID } from "node:crypto";
import { deleteApp, type FirebaseApp, initializeApp } from "firebase/app";
import { type Auth, connectAuthEmulator, getAuth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  type Firestore,
  getFirestore,
} from "firebase/firestore";

export interface TestFirebase {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  cleanup(): Promise<void>;
}

/**
 * Creates a Firebase client for tests, connected to the emulators.
 * Assumes execution through emulators:exec; the ports match firebase.json.
 */
export function createTestFirebase(): TestFirebase {
  const app = initializeApp(
    { projectId: "demo-account-ledgers", apiKey: "demo-api-key" },
    `test-${randomUUID()}`,
  );
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  return {
    app,
    auth,
    db,
    cleanup: () => deleteApp(app),
  };
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}@example.com`;
}
