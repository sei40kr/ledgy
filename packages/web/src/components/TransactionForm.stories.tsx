import {
  type AccountTitle,
  type AccountTitleId,
  FiscalYear,
  type FiscalYearId,
  MonetaryAmount,
  type PartnerId,
  STANDARD_ACCOUNT_TITLE_PRESETS,
  type SubAccountTitle,
  type SubAccountTitleId,
  type TagId,
  TaxCategory,
  type TenantId,
} from "@account-ledgers/domain";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn, mocked } from "storybook/test";
import { usecases } from "@account-ledgers/infrastructure/container";
import {
  draftToFormValues,
  TransactionForm,
} from "@/components/TransactionForm";

// The standard chart of accounts, numbered the way sign-up seeds it.
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

function accountTitle(name: string): AccountTitle {
  const found = accountTitles.find((title) => title.name === name);
  if (!found) throw new Error(`No account title named ${name}`);
  return found;
}

const bank = accountTitle("普通預金");
const supplies = accountTitle("消耗品費");

// 普通預金 carries one sub account title per bank account.
const bankSubAccounts: SubAccountTitle[] = [
  {
    id: "sub-1" as SubAccountTitleId,
    name: "みずほ銀行",
    isActive: true,
    searchWords: ["みずほ"],
    sortOrder: 0,
  },
  {
    id: "sub-2" as SubAccountTitleId,
    name: "ゆうちょ銀行",
    isActive: true,
    searchWords: ["ゆうちょ"],
    sortOrder: 10,
  },
];

const fiscalYear = new FiscalYear(
  "fy-2026" as FiscalYearId,
  new Date("2026-01-01"),
  new Date("2026-12-31"),
  "open",
);

// A saved transaction: office supplies paid from the bank account. The partner
// and tag ids are ones the mocked composition root lists.
const savedTransaction = draftToFormValues({
  date: new Date("2026-05-10"),
  partners: ["partner-2" as PartnerId],
  tags: ["tag-2" as TagId],
  postings: [
    {
      side: "debit",
      accountTitleId: supplies.id,
      subAccountTitleId: null,
      amount: new MonetaryAmount(3300),
      taxCategory: new TaxCategory("taxablePurchase10"),
      memo: "コピー用紙",
    },
    {
      side: "credit",
      accountTitleId: bank.id,
      subAccountTitleId: bankSubAccounts[0]?.id ?? null,
      amount: new MonetaryAmount(3300),
      taxCategory: null,
      memo: "",
    },
  ],
});

// `usecases` resolves to the Storybook mock registered in .storybook/preview.tsx,
// which supplies the partner and tag pickers with demo data.
const meta = {
  component: TransactionForm,
  parameters: { layout: "padded" },
  args: {
    tenantId: "demo-tenant" as TenantId,
    accountTitles,
    mode: "create",
    fiscalYear,
    submitLabel: "保存して次へ",
    resetAfterSubmit: true,
    onSubmit: fn(),
  },
  argTypes: {
    accountTitles: { control: false },
    fiscalYear: { control: false },
    initialValues: { control: false },
  },
  beforeEach: () => {
    mocked(usecases.accountTitles.listSubAccounts).mockImplementation(
      async (_tenantId, accountTitleId) =>
        accountTitleId === bank.id ? bankSubAccounts : [],
    );
  },
} satisfies Meta<typeof TransactionForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The new-transaction page: one empty line per side, dated today. */
export const Create: Story = {};

/** The edit page: a saved transaction with its delete and cancel actions. */
export const Edit: Story = {
  args: {
    mode: "edit",
    initialValues: savedTransaction,
    submitLabel: "更新",
    resetAfterSubmit: false,
    onDelete: fn(),
    onCancel: fn(),
  },
};

/** The sides differ, so the footer shows the difference and saving stays disabled. */
export const Unbalanced: Story = {
  args: {
    initialValues: {
      ...savedTransaction,
      credits: savedTransaction.credits.map((line) => ({
        ...line,
        amount: "3000",
      })),
    },
  },
};

/** A closed fiscal year: every control is read-only. */
export const ClosedYear: Story = {
  args: {
    ...Edit.args,
    fiscalYear: fiscalYear.withStatus("closed"),
    disabled: true,
  },
};
