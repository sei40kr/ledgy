import { ACCOUNT_TITLE_CATEGORIES } from "@account-ledgers/domain";
import { HStack } from "@chakra-ui/react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CategoryBadge } from "@/components/CategoryBadge";

const meta = {
  component: CategoryBadge,
  args: { category: "asset" },
} satisfies Meta<typeof CategoryBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every category side by side, one badge per color. */
export const AllCategories: Story = {
  render: () => (
    <HStack gap={2}>
      {ACCOUNT_TITLE_CATEGORIES.map((category) => (
        <CategoryBadge key={category} category={category} />
      ))}
    </HStack>
  ),
};
