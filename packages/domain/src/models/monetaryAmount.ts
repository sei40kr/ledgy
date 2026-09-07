import { DomainError } from "../errors";

/** The value handed to MonetaryAmount was not a safe integer. */
export class MonetaryAmountNotIntegerError extends DomainError {}

/**
 * A monetary amount in integer yen. Constructing one is the whole domain rule
 * about money: an amount that is not a safe integer never enters the domain, and
 * everything downstream uses plain integer arithmetic on `value`.
 */
export class MonetaryAmount {
  constructor(readonly value: number) {
    if (!Number.isSafeInteger(value)) {
      throw new MonetaryAmountNotIntegerError();
    }
  }
}
