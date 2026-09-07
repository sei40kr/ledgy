import { defineConfig } from "vitest/config";

// The tests are split across projects:
// - domain-unit / usecases-unit: fast unit tests with no Firebase dependency,
//   so no emulator is needed
// - rules: exercises the Security Rules against the Firestore emulator and runs
//   through `firebase emulators:exec`. It runs serially, because
//   clearFirestore() would otherwise interfere across files.
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
