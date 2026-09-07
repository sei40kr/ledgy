import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MonetaryAmountText } from "@/components/MonetaryAmountText";

const meta = {
  component: MonetaryAmountText,
  args: { value: 1234567 },
} satisfies Meta<typeof MonetaryAmountText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Zero: Story = { args: { value: 0 } };

export const Negative: Story = { args: { value: -50000 } };
