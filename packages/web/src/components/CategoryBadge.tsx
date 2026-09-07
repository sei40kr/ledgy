import type { AccountTitleCategory } from "@account-ledgers/domain";
import { Badge } from "@chakra-ui/react";
import { ACCOUNT_TITLE_CATEGORY_LABELS } from "@/components/labels";

/** Chakra color palette for each account title category. */
const CATEGORY_COLOR_PALETTES: Record<AccountTitleCategory, string> = {
  asset: "blue",
  liability: "orange",
  equity: "purple",
  revenue: "green",
  expense: "red",
};

/** The Chakra color palette that represents an account title category. */
export function categoryColorPalette(category: AccountTitleCategory): string {
  return CATEGORY_COLOR_PALETTES[category];
}

/** The account title's 区分 (category) as a color-coded badge. */
export function CategoryBadge({
  category,
}: {
  category: AccountTitleCategory;
}) {
  return (
    <Badge colorPalette={categoryColorPalette(category)} variant="subtle">
      {ACCOUNT_TITLE_CATEGORY_LABELS[category]}
    </Badge>
  );
}
