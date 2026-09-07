import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

/**
 * Builds the environment for a Security Rules test.
 *
 * Give every test file its own projectId. The Firestore emulator keeps data
 * separate per project ID, so clearFirestore() cannot wipe another file's seed
 * data even when files run in parallel.
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
  });
}
