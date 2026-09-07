import { Table } from "@chakra-ui/react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CategoryBadge } from "@/components/CategoryBadge";
import { MonetaryAmountText } from "@/components/MonetaryAmountText";
import { TableCard } from "@/components/TableCard";

const meta = {
  component: TableCard,
} satisfies Meta<typeof TableCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A table dropped in the way the list screens do: outline variant, outer border removed. */
export const WithTable: Story = {
  args: {
    children: (
      <Table.Root size="sm" variant="outline" borderWidth={0}>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>勘定科目</Table.ColumnHeader>
            <Table.ColumnHeader>区分</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="end">残高</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Cell>現金</Table.Cell>
            <Table.Cell>
              <CategoryBadge category="asset" />
            </Table.Cell>
            <Table.Cell textAlign="end" fontFamily="mono">
              <MonetaryAmountText value={125000} />
            </Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>普通預金</Table.Cell>
            <Table.Cell>
              <CategoryBadge category="asset" />
            </Table.Cell>
            <Table.Cell textAlign="end" fontFamily="mono">
              <MonetaryAmountText value={2340000} />
            </Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>買掛金</Table.Cell>
            <Table.Cell>
              <CategoryBadge category="liability" />
            </Table.Cell>
            <Table.Cell textAlign="end" fontFamily="mono">
              <MonetaryAmountText value={480000} />
            </Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table.Root>
    ),
  },
};
