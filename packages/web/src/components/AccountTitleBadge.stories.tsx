import { HStack } from "@chakra-ui/react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AccountTitleBadge } from "@/components/AccountTitleBadge";

const meta = {
  component: AccountTitleBadge,
  args: { name: "普通預金", category: "asset" },
} satisfies Meta<typeof AccountTitleBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** One account title from each category, tinted with the category's palette. */
export const EveryCategory: Story = {
  render: () => (
    <HStack gap={2}>
      <AccountTitleBadge name="普通預金" category="asset" />
      <AccountTitleBadge name="買掛金" category="liability" />
      <AccountTitleBadge name="元入金" category="equity" />
      <AccountTitleBadge name="売上高" category="revenue" />
      <AccountTitleBadge name="消耗品費" category="expense" />
    </HStack>
  ),
};
