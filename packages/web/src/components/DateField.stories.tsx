import { FiscalYear, type FiscalYearId } from "@account-ledgers/domain";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import { DateField } from "@/components/DateField";

const calendarYear = new FiscalYear(
  "fy-2026" as FiscalYearId,
  new Date("2026-01-01"),
  new Date("2026-12-31"),
  "open",
);

const aprilToMarch = new FiscalYear(
  "fy-2026-04" as FiscalYearId,
  new Date("2026-04-01"),
  new Date("2027-03-31"),
  "open",
);

const meta = {
  component: DateField,
  args: {
    value: "2026-05-10",
    min: "2026-01-01",
    max: "2026-12-31",
    fiscalYear: calendarYear,
    size: "sm",
    onChange: fn(),
  },
  argTypes: {
    fiscalYear: { control: false },
    size: { control: "select", options: ["xs", "sm", "md", "lg"] },
  },
  // The component is controlled, so the story owns the value through args.
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs<{ value: string }>();
    return (
      <DateField
        {...args}
        value={value}
        onChange={(next) => {
          args.onChange(next);
          updateArgs({ value: next });
        }}
      />
    );
  },
} satisfies Meta<typeof DateField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The fiscal year stays inside one calendar year, so the field shows MM/DD. */
export const WithinCalendarYear: Story = {};

/** The fiscal year straddles two calendar years, so the year is kept. */
export const SpanningCalendarYears: Story = {
  args: {
    value: "2027-02-15",
    min: "2026-04-01",
    max: "2027-03-31",
    fiscalYear: aprilToMarch,
  },
};

/** Without a fiscal year the field is unbounded and always shows the year. */
export const NoFiscalYear: Story = {
  args: { min: undefined, max: undefined, fiscalYear: null },
};

export const Empty: Story = { args: { value: "" } };

export const Disabled: Story = { args: { disabled: true } };
