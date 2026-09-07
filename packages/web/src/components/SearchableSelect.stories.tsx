import { STANDARD_ACCOUNT_TITLE_PRESETS } from "@account-ledgers/domain";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import {
  SearchableSelect,
  type SearchableSelectItem,
} from "@/components/SearchableSelect";

// Readings for a few titles, so typing "げんきん" finds 現金 like it does in the app.
const SEARCH_WORDS: Record<string, string[]> = {
  現金: ["げんきん"],
  普通預金: ["ふつうよきん", "ぎんこう"],
  売掛金: ["うりかけきん"],
  消耗品費: ["しょうもうひんひ"],
};

const items: SearchableSelectItem[] = STANDARD_ACCOUNT_TITLE_PRESETS.map(
  (preset, index) => ({
    id: `account-${index}`,
    name: preset.name,
    searchWords: SEARCH_WORDS[preset.name] ?? [],
  }),
);

const meta = {
  component: SearchableSelect,
  args: {
    items,
    value: "",
    placeholder: "科目を検索",
    size: "sm",
    onChange: fn(),
  },
  argTypes: { items: { control: false } },
  // The component is controlled, so the story owns the value through args.
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs<{ value: string }>();
    return (
      <SearchableSelect
        {...args}
        value={value}
        onChange={(id) => {
          args.onChange(id);
          updateArgs({ value: id });
        }}
      />
    );
  },
} satisfies Meta<typeof SearchableSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Selected: Story = {
  args: { value: items.find((item) => item.name === "普通預金")?.id ?? "" },
};

export const Disabled: Story = {
  args: { ...Selected.args, disabled: true },
};

export const Medium: Story = { args: { size: "md" } };
