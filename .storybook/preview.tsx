import type { Preview } from "@storybook/nextjs-vite";
import { sb } from "storybook/test";
import { Provider } from "../packages/web/src/components/ui/provider";

// The composition root is the module through which the UI reaches Firebase.
// It is replaced by the manual mock in its `__mocks__` directory, so no story
// ever opens a Firestore connection.
sb.mock(import("../packages/infrastructure/src/container.ts"));

const preview: Preview = {
  parameters: {
    // The app is an App Router application, so next/navigation is what the
    // components import.
    nextjs: { appDirectory: true },
  },
  decorators: [
    // The same Chakra system the root layout wraps the app in.
    (Story) => (
      <Provider>
        <Story />
      </Provider>
    ),
  ],
};

export default preview;
