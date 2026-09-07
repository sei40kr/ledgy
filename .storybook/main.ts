import path from "node:path";
import type { StorybookConfig } from "@storybook/nextjs-vite";

// Storybook is configured once at the workspace root: the stories live in the
// web package, and the framework reads that package's next.config.ts so the
// Next.js pieces (next/link, next/navigation, next/font) behave as in the app.
const config: StorybookConfig = {
  stories: ["../packages/web/src/**/*.stories.tsx"],
  addons: ["@storybook/addon-docs"],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {
      nextConfigPath: path.resolve(import.meta.dirname, "../packages/web/next.config.ts"),
    },
  },
};

export default config;
