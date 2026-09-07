import type { Posting } from "../models/transaction";
import { MAX_TRANSACTION_POSTINGS } from "../models/transaction";
import { DomainError } from "../errors";

export class PostingsEmptyError extends DomainError {}

export class TooManyPostingsError extends DomainError {
  constructor(readonly max: number) {
    super();
  }
}

/** `index` is the zero-based position of the offending posting. */
export class PostingSideInvalidError extends DomainError {
  constructor(readonly index: number) {
    super();
  }
}

export class PostingAccountTitleMissingError extends DomainError {
  constructor(readonly index: number) {
    super();
  }
}

export class PostingAmountNotPositiveError extends DomainError {
  constructor(readonly index: number) {
    super();
  }
}

export class TransactionUnbalancedError extends DomainError {
  constructor(
    readonly debitTotal: number,
    readonly creditTotal: number,
  ) {
    super();
  }
}

export class TransactionTotalNotPositiveError extends DomainError {}

export interface PostingTotals {
  debitTotal: number;
  creditTotal: number;
  /** debitTotal - creditTotal. Zero means the transaction balances. */
  difference: number;
}

/**
 * Sums the debit and credit sides of the postings, for the live totals shown
 * while the user is still typing.
 */
export function calcPostingTotals(
  postings: ReadonlyArray<Pick<Posting, "side" | "amount">>,
): PostingTotals {
  let debit = 0;
  let credit = 0;
  for (const posting of postings) {
    if (posting.side === "debit") {
      debit += posting.amount.value;
    } else {
      credit += posting.amount.value;
    }
  }
  return {
    debitTotal: debit,
    creditTotal: credit,
    difference: debit - credit,
  };
}

/**
 * Validates the postings of a transaction and returns the debit/credit totals to
 * denormalize onto the header. An unbalanced transaction is always rejected here:
 * the Security Rules check that the header totals match each other, but this
 * function is the only defense at the posting level.
 */
export function validatePostings(
  postings: ReadonlyArray<Posting>,
): { debitTotal: number; creditTotal: number } {
  if (postings.length === 0) {
    throw new PostingsEmptyError();
  }
  if (postings.length > MAX_TRANSACTION_POSTINGS) {
    throw new TooManyPostingsError(MAX_TRANSACTION_POSTINGS);
  }

  let debit = 0;
  let credit = 0;
  for (const [index, posting] of postings.entries()) {
    if (posting.side !== "debit" && posting.side !== "credit") {
      throw new PostingSideInvalidError(index);
    }
    if (!posting.accountTitleId) {
      throw new PostingAccountTitleMissingError(index);
    }
    if (posting.amount.value <= 0) {
      throw new PostingAmountNotPositiveError(index);
    }
    if (posting.side === "debit") {
      debit += posting.amount.value;
    } else {
      credit += posting.amount.value;
    }
  }

  if (debit !== credit) {
    throw new TransactionUnbalancedError(debit, credit);
  }
  if (debit <= 0) {
    throw new TransactionTotalNotPositiveError();
  }

  return { debitTotal: debit, creditTotal: credit };
}
