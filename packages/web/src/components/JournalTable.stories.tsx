import {
  type AccountTitle,
  type AccountTitleId,
  FiscalYear,
  type FiscalYearId,
  MonetaryAmount,
  type PartnerId,
  type Posting,
  STANDARD_ACCOUNT_TITLE_PRESETS,
  type SupportingDocumentId,
  type TagId,
  TaxCategory,
  type Transaction,
  type TransactionId,
  type UserId,
} from "@account-ledgers/domain";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { JournalTable } from "@/components/JournalTable";
import { TableCard } from "@/components/TableCard";

const accountTitles: AccountTitle[] = STANDARD_ACCOUNT_TITLE_PRESETS.map(
  (preset, index) => ({
    id: `account-${index}` as AccountTitleId,
    name: preset.name,
    category: preset.category,
    isActive: true,
    defaultTaxCategory: null,
    searchWords: [],
    sortOrder: index * 10,
  }),
);
const accountTitleById = new Map(accountTitles.map((a) => [a.id, a]));

function accountTitleId(name: string): AccountTitleId {
  const found = accountTitles.find((title) => title.name === name);
  if (!found) throw new Error(`No account title named ${name}`);
  return found.id;
}

const partnerNameById = new Map<string, string>([
  ["partner-1", "山田商店"],
  ["partner-2", "アスクル"],
]);
const tagNameById = new Map<string, string>([
  ["tag-1", "事務用品"],
  ["tag-2", "交通費"],
]);

const user = "user-1" as UserId;

function posting(
  side: Posting["side"],
  name: string,
  amount: number,
  extra: Partial<Pick<Posting, "taxCategory" | "memo">> = {},
): Posting {
  return {
    side,
    accountTitleId: accountTitleId(name),
    subAccountTitleId: null,
    amount: new MonetaryAmount(amount),
    taxCategory: extra.taxCategory ?? null,
    memo: extra.memo ?? "",
  };
}

function transaction(
  id: string,
  date: string,
  description: string,
  postings: Posting[],
  extra: Partial<
    Pick<Transaction, "partners" | "tags" | "supportingDocumentIds" | "deleted">
  > = {},
): Transaction {
  const createdAt = new Date(`${date}T09:00:00`);
  return {
    id: id as TransactionId,
    createdBy: user,
    createdAt,
    updatedBy: user,
    updatedAt: createdAt,
    date: new Date(date),
    description,
    partners: extra.partners ?? [],
    tags: extra.tags ?? [],
    postings,
    supportingDocumentIds: extra.supportingDocumentIds ?? [],
    deleted: extra.deleted ?? false,
    system: null,
  };
}

const transactions: Transaction[] = [
  // A simple entry with a partner, a tag, and a supporting document.
  transaction(
    "transaction-1",
    "2026-05-10",
    "文房具購入",
    [
      posting("debit", "消耗品費", 3300, {
        taxCategory: new TaxCategory("taxablePurchase10"),
      }),
      posting("credit", "普通預金", 3300),
    ],
    {
      partners: ["partner-2" as PartnerId],
      tags: ["tag-1" as TagId],
      supportingDocumentIds: ["supportingDocument-1" as SupportingDocumentId],
    },
  ),
  // A compound entry: one credit split across three debits, with memos.
  transaction(
    "transaction-2",
    "2026-05-12",
    "出張費精算",
    [
      posting("debit", "旅費交通費", 28600, {
        taxCategory: new TaxCategory("taxablePurchase10"),
        memo: "新幹線 東京-大阪 往復",
      }),
      posting("debit", "旅費交通費", 12000, { memo: "宿泊 1泊" }),
      posting("debit", "会議費", 4500, { memo: "打合せ喫茶" }),
      posting("credit", "現金", 45100),
    ],
    { tags: ["tag-2" as TagId] },
  ),
  // Sales with two credits: the invoice amount and the withheld tax on it.
  transaction(
    "transaction-3",
    "2026-05-15",
    "5月分請求",
    [
      posting("debit", "売掛金", 110000),
      posting("credit", "売上高", 100000, {
        taxCategory: new TaxCategory("taxableSales10"),
      }),
      posting("credit", "預り金", 10000, { memo: "源泉所得税" }),
    ],
    { partners: ["partner-1" as PartnerId] },
  ),
  // A cancelled entry: struck through across every line.
  transaction(
    "transaction-4",
    "2026-05-18",
    "二重計上の取消",
    [
      posting("debit", "消耗品費", 3300),
      posting("credit", "普通預金", 3300),
    ],
    { partners: ["partner-2" as PartnerId], deleted: true },
  ),
];

const calendarYear = new FiscalYear(
  "fy-2026" as FiscalYearId,
  new Date("2026-01-01"),
  new Date("2026-12-31"),
  "open",
);

const meta = {
  component: JournalTable,
  args: {
    transactions,
    fiscalYear: calendarYear,
    accountTitleById,
    partnerNameById,
    tagNameById,
    onOpen: fn(),
    onOpenSupportingDocuments: fn(),
  },
  argTypes: {
    fiscalYear: { control: false },
    accountTitleById: { control: false },
    partnerNameById: { control: false },
    tagNameById: { control: false },
  },
} satisfies Meta<typeof JournalTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Inside a card, the way the home page lists the recent transactions. */
export const InCard: Story = {
  render: (args) => (
    <TableCard>
      <JournalTable {...args} />
    </TableCard>
  ),
};

/**
 * Edge to edge with the heading pinned, the way the journal page lays it out.
 * The list is repeated so the page scrolls far enough to see the heading stick.
 */
export const StickyHeading: Story = {
  args: {
    transactions: Array.from({ length: 6 }, (_, i) =>
      transactions.map((t) => ({ ...t, id: `${t.id}-${i}` as TransactionId })),
    ).flat(),
    stickyHeadingTop: "0px",
  },
  parameters: { layout: "fullscreen" },
};

/** A year straddling two calendar years keeps the full date. */
export const AprilToMarch: Story = {
  args: {
    fiscalYear: new FiscalYear(
      "fy-2026-04" as FiscalYearId,
      new Date("2026-04-01"),
      new Date("2027-03-31"),
      "open",
    ),
  },
};
