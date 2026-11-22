import { defineConfig } from "vitest/config";

// The tests are split across four projects:
// - domain-unit / usecases-unit: fast unit tests with no Firebase dependency,
//   so no emulator is needed
// - integration / rules: require the Firestore emulator and run through
//   `firebase emulators:exec`. They run serially, and under separate project
//   IDs, because clearFirestore() would otherwise interfere across files.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "domain-unit",
          environment: "node",
          include: ["packages/domain/src/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "usecases-unit",
          environment: "node",
          include: ["packages/usecases/src/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "integration",
          environment: "node",
          include: ["packages/web/tests/integration/**/*.test.ts"],
          fileParallelism: false,
          testTimeout: 20000,
          hookTimeout: 20000,
        },
      },
      {
        test: {
          name: "rules",
          environment: "node",
          include: ["packages/web/tests/rules/**/*.test.ts"],
          fileParallelism: false,
          testTimeout: 20000,
          hookTimeout: 20000,
        },
      },
    ],
  },
});
