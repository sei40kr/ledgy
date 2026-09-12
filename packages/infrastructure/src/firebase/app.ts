import { getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-account-ledgers",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // Supporting document files live in Cloud Storage. The emulator accepts any bucket name.
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    "demo-account-ledgers.appspot.com",
};

// A `demo-` project ID is emulator-only and a real one must never meet the
// emulator, so the flag and the ID have to agree. Failing fast here is what
// stops a stray .env.local from pointing `next dev` at production. Only the
// browser ever connects, so a prerender at build time is left alone.
const useEmulator = process.env.NEXT_PUBLIC_USE_EMULATOR === "true";
if (
  typeof window !== "undefined" &&
  useEmulator !== firebaseConfig.projectId.startsWith("demo-")
) {
  throw new Error(
    `NEXT_PUBLIC_USE_EMULATOR=${String(useEmulator)} contradicts the project ID "${firebaseConfig.projectId}": ` +
      "a demo- project ID is emulator-only, and a real one may not use the emulator",
  );
}

const app = getApps()[0] ?? initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Connecting to the emulators is a one-shot operation, so the state lives on
// globalThis to survive hot module replacement.
const globals = globalThis as typeof globalThis & {
  __emulatorsConnected?: boolean;
};

if (useEmulator && !globals.__emulatorsConnected) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", {
    disableWarnings: true,
  });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  globals.__emulatorsConnected = true;
}
