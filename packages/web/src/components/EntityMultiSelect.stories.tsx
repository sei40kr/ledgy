import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import {
  EntityMultiSelect,
  type EntityItem,
} from "@/components/EntityMultiSelect";

const partners: EntityItem[] = [
  { id: "partner-1", name: "株式会社サンプル商事", searchWords: ["さんぷる"] },
  { id: "partner-2", name: "山田文具店", searchWords: ["やまだ", "ぶんぐ"] },
  { id: "partner-3", name: "東京電力", searchWords: ["でんき"] },
];

const meta = {
  component: EntityMultiSelect,
  args: {
    items: partners,
    value: [],
    placeholder: "取引先を検索・追加",
    onChange: fn(),
    onCreate: fn(),
  },
  argTypes: { items: { control: false } },
  // The component is controlled, so the story owns both the selection and the
  // item list: creating an unknown name appends it to the list, as the app does
  // after the usecase has saved it.
  render: function Render(args) {
    const [{ items, value }, updateArgs] = useArgs<{
      items: EntityItem[];
      value: string[];
    }>();
    return (
      <EntityMultiSelect
        {...args}
        items={items}
        value={value}
        onChange={(ids) => {
          args.onChange(ids);
          updateArgs({ value: ids });
        }}
        onCreate={async (name) => {
          await args.onCreate(name);
          const created: EntityItem = {
            id: `partner-${name}`,
            name,
            searchWords: [],
          };
          updateArgs({ items: [...items, created] });
          return created;
        }}
      />
    );
  },
} satisfies Meta<typeof EntityMultiSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithSelection: Story = {
  args: { value: ["partner-1", "partner-3"] },
};

export const Disabled: Story = {
  args: { ...WithSelection.args, disabled: true },
};
