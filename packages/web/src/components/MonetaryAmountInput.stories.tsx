import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { MonetaryAmountInput } from "@/components/MonetaryAmountInput";

const meta = {
  component: MonetaryAmountInput,
  args: { placeholder: "0", size: "sm", onChange: fn() },
  argTypes: {
    size: { control: "select", options: ["xs", "sm", "md", "lg"] },
  },
} satisfies Meta<typeof MonetaryAmountInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithValue: Story = { args: { defaultValue: "1234567" } };

export const Disabled: Story = {
  args: { defaultValue: "1234567", disabled: true },
};
