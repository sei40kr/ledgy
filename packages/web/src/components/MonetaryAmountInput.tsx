import { DomainError, MonetaryAmount } from "@account-ledgers/domain";
import { Input, InputGroup, type InputProps } from "@chakra-ui/react";
import { forwardRef } from "react";

/**
 * A yen amount input: a ¥ start addon in front of a right-aligned numeric input.
 * forwardRef so it drops into react-hook-form's `register`. Extra props (size,
 * value, onChange, disabled, …) pass straight through to the inner Input.
 */
export const MonetaryAmountInput = forwardRef<HTMLInputElement, InputProps>(
  function MonetaryAmountInput(props, ref) {
    return (
      <InputGroup startAddon="¥">
        <Input
          ref={ref}
          inputMode="numeric"
          textAlign="right"
          fontFamily="mono"
          {...props}
        />
      </InputGroup>
    );
  },
);

/**
 * The amount typed into a MonetaryAmountInput so far, or null while it is not
 * yet a whole number of yen (blank, half-typed, or out of range). For the live
 * totals a form shows as the user types, which must not throw on the way.
 */
export function parseMonetaryAmountInput(text: string): MonetaryAmount | null {
  if (text.trim() === "") return null;
  try {
    return new MonetaryAmount(Number(text));
  } catch (error) {
    if (error instanceof DomainError) return null;
    throw error;
  }
}
