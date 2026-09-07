import type {
  AccountTitleCategory,
  PostingSide,
  TaxCategoryCode,
} from "@account-ledgers/domain";

// Japanese display labels for domain enums. These belong to the presentation
// layer; the domain model stays free of UI concerns.

export const TAX_CATEGORY_LABELS: Record<TaxCategoryCode, string> = {
  taxableSales10: "課税売上10%",
  taxableSales8: "課税売上8%(軽減)",
  taxablePurchase10: "課税仕入10%",
  taxablePurchase8: "課税仕入8%(軽減)",
  nonTaxable: "非課税",
  taxExempt: "免税",
  outOfScope: "不課税",
};

export const ACCOUNT_TITLE_CATEGORY_LABELS: Record<AccountTitleCategory, string> = {
  asset: "資産",
  liability: "負債",
  equity: "純資産",
  revenue: "収益",
  expense: "費用",
};

export const POSTING_SIDE_LABELS: Record<PostingSide, string> = {
  debit: "借方",
  credit: "貸方",
};
