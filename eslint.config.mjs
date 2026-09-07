import js from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/dist/**",
      "storybook-static/**",
      "**/next-env.d.ts",
      ".direnv/**",
      "infra/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Mechanically enforce the Clean Architecture layer boundaries.
  // Dependencies flow presentation → application → domain.
  // The infrastructure layer implements the application's interfaces.
  {
    files: ["packages/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/include": ["packages/**/*"],
      "boundaries/elements": [
        { type: "domain", pattern: "packages/domain/**" },
        { type: "application", pattern: "packages/usecases/**" },
        {
          type: "infrastructure",
          pattern: "packages/infrastructure/**",
        },
        {
          type: "presentation",
          pattern: "packages/web/src/(app|components|hooks)/**",
        },
        { type: "web-tests", pattern: "packages/web/tests/**" },
        { type: "scripts", pattern: "scripts/**" },
      ],
      "import/resolver": {
        typescript: {
          project: [
            "packages/domain/tsconfig.json",
            "packages/usecases/tsconfig.json",
            "packages/infrastructure/tsconfig.json",
            "packages/web/tsconfig.json",
          ],
        },
      },
    },
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            // A single outward import from domain is a design mistake.
            { from: "domain", allow: ["domain"] },
            { from: "application", allow: ["application", "domain"] },
            {
              from: "infrastructure",
              allow: ["infrastructure", "application", "domain"],
            },
            {
              from: "presentation",
              allow: [
                "presentation",
                "application",
                "domain",
                // Intended only for the composition root, which injects the repository implementations.
                "infrastructure",
              ],
            },
            {
              from: "web-tests",
              allow: ["web-tests", "application", "domain", "infrastructure"],
            },
            {
              from: "scripts",
              allow: ["scripts", "application", "domain", "infrastructure"],
            },
          ],
        },
      ],
    },
  },
  // Domain purity: no dependency on any external package.
  {
    files: ["packages/domain/**/*.ts"],
    plugins: { boundaries },
    rules: {
      "boundaries/external": [
        "error",
        {
          default: "disallow",
          rules: [],
        },
      ],
    },
  },
  // Only the domain test files may import vitest.
  {
    files: ["packages/domain/**/*.test.ts"],
    plugins: { boundaries },
    rules: {
      "boundaries/external": [
        "error",
        {
          default: "disallow",
          rules: [{ from: ["domain"], allow: ["vitest"] }],
        },
      ],
    },
  },
);
