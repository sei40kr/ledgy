import { defineConfig } from "vitest/config";

// The unit tests are plain TypeScript with no Firebase dependency, so they run
// without an emulator.
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
    ],
  },
});
