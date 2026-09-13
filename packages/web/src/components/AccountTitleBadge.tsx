import type { AccountTitleCategory } from "@account-ledgers/domain";
import { Badge, type BadgeProps } from "@chakra-ui/react";
import { categoryColorPalette } from "@/components/CategoryBadge";

/** An account title shown as a badge tinted with its category's color. */
export function AccountTitleBadge({
  name,
  category,
  size,
}: {
  name: string;
  category: AccountTitleCategory;
  /** Overrides the badge size, for a table that sets its text larger. */
  size?: BadgeProps["size"];
}) {
  return (
    <Badge
      colorPalette={categoryColorPalette(category)}
      variant="subtle"
      size={size}
    >
      {name}
    </Badge>
  );
}
