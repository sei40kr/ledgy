import type { Preview } from "@storybook/nextjs-vite";

const preview: Preview = {
  parameters: {
    // The app is an App Router application, so next/navigation is what the
    // components import.
    nextjs: { appDirectory: true },
  },
};

export default preview;
