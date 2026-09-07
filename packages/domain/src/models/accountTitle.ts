import type { AccountTitleId, SubAccountTitleId } from "./ids";
import type { PostingSide } from "./postingSide";
import type { TaxCategory } from "./taxCategory";

/** Category of an account title. */
export type AccountTitleCategory =
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "expense";

export const ACCOUNT_TITLE_CATEGORIES: AccountTitleCategory[] = [
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
];

/** The side a positive balance sits on for this category (its normal balance). */
export function normalBalanceSide(category: AccountTitleCategory): PostingSide {
  return category === "asset" || category === "expense" ? "debit" : "credit";
}

export interface AccountTitle {
  id: AccountTitleId;
  name: string;
  category: AccountTitleCategory;
  isActive: boolean;
  defaultTaxCategory: TaxCategory | null;
  /** Extra terms the account title picker matches on, besides the name. */
  searchWords: string[];
  sortOrder: number;
}

export interface SubAccountTitle {
  id: SubAccountTitleId;
  name: string;
  isActive: boolean;
  /** Extra terms the sub account title picker matches on, besides the name. */
  searchWords: string[];
  sortOrder: number;
}
