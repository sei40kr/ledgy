import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

/**
 * Builds the environment for a Security Rules test, loading both the Firestore
 * and the Storage rules (the Storage rules look members up in Firestore).
 *
 * Give every test file its own projectId. The emulators keep data separate per
 * project ID, so clearFirestore() / clearStorage() cannot wipe another file's
 * seed data even when files run in parallel.
 */
export async function createRulesTestEnv(
  name: string,
): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: `demo-rules-${name}`,
    firestore: {
      rules: readFileSync(
        new URL("../../../../firestore.rules", import.meta.url),
        "utf8",
      ),
    },
    storage: {
      rules: readFileSync(
        new URL("../../../../storage.rules", import.meta.url),
        "utf8",
      ),
    },
  });
}
