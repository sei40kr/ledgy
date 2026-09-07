import { FormatNumber } from "@chakra-ui/react";

/**
 * A yen amount: a ¥ prefix plus the grouped integer (FormatNumber handles the
 * comma grouping). Amounts are integer yen, so no fraction digits are shown.
 */
export function MonetaryAmountText({ value }: { value: number }) {
  return (
    <>
      ¥<FormatNumber value={value} maximumFractionDigits={0} />
    </>
  );
}
