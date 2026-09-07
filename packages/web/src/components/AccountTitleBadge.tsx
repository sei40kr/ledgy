import type { AccountTitleCategory } from "@account-ledgers/domain";
import { Badge } from "@chakra-ui/react";
import { categoryColorPalette } from "@/components/CategoryBadge";

/** An account title shown as a badge tinted with its category's color. */
export function AccountTitleBadge({
  name,
  category,
}: {
  name: string;
  category: AccountTitleCategory;
}) {
  return (
    <Badge colorPalette={categoryColorPalette(category)} variant="subtle">
      {name}
    </Badge>
  );
}
