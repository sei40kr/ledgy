import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { SearchWordsInput } from "@/components/SearchWordsInput";

const meta = {
  component: SearchWordsInput,
  args: {
    value: ["ふつうよきん", "みずほ"],
    placeholder: "検索ワードを入力して Enter",
    onChange: fn(),
  },
  // The component is controlled, so the story owns the value through args.
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs<{ value: string[] }>();
    return (
      <SearchWordsInput
        {...args}
        value={value}
        onChange={(next) => {
          args.onChange(next);
          updateArgs({ value: next });
        }}
      />
    );
  },
} satisfies Meta<typeof SearchWordsInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithWords: Story = {};

export const Empty: Story = { args: { value: [] } };
