import { describe, expect, it } from "vitest";
import type { AccountTitleId } from "../models/ids";
import type { Posting } from "../models/transaction";
import { MonetaryAmount } from "../models/monetaryAmount";
import {
  calcPostingTotals,
  PostingAccountTitleMissingError,
  PostingAmountNotPositiveError,
  PostingsEmptyError,
  TooManyPostingsError,
  TransactionUnbalancedError,
  validatePostings,
} from "./transactionValidation";

const id = (value: string) => value as AccountTitleId;

function posting(
  overrides: Partial<Omit<Posting, "amount">> & { amount?: number },
): Posting {
  const { amount = 1000, ...rest } = overrides;
  return {
    side: "debit",
    accountTitleId: id("acc-1"),
    subAccountTitleId: null,
    amount: new MonetaryAmount(amount),
    taxCategory: null,
    memo: "",
    ...rest,
  };
}

describe("calcPostingTotals", () => {
  it("computes the debit total, credit total, and their difference", () => {
    const totals = calcPostingTotals([
      posting({ side: "debit", amount: 1000 }),
      posting({ side: "debit", amount: 500 }),
      posting({ side: "credit", amount: 1200 }),
    ]);
    expect(totals).toEqual({
      debitTotal: 1500,
      creditTotal: 1200,
      difference: 300,
    });
  });

});

describe("validatePostings", () => {
  it("accepts a balanced compound transaction (N:N) and returns its totals", () => {
    const result = validatePostings([
      posting({ side: "debit", accountTitleId: id("cash"), amount: 700 }),
      posting({ side: "debit", accountTitleId: id("bank"), amount: 300 }),
      posting({ side: "credit", accountTitleId: id("sales"), amount: 800 }),
      posting({ side: "credit", accountTitleId: id("misc"), amount: 200 }),
    ]);
    expect(result).toEqual({ debitTotal: 1000, creditTotal: 1000 });
  });

  it("always rejects an unbalanced transaction", () => {
    expect(() =>
      validatePostings([
        posting({ side: "debit", amount: 1000 }),
        posting({ side: "credit", amount: 999 }),
      ]),
    ).toThrow(TransactionUnbalancedError);
  });

  it("rejects an empty set of postings", () => {
    expect(() => validatePostings([])).toThrow(PostingsEmptyError);
  });

  it("rejects more than 50 postings", () => {
    const postings = [
      ...Array.from({ length: 26 }, () => posting({ side: "debit", amount: 2 })),
      ...Array.from({ length: 26 }, () => posting({ side: "credit", amount: 2 })),
    ];
    expect(() => validatePostings(postings)).toThrow(TooManyPostingsError);
  });

  it("rejects postings whose amount is zero or negative", () => {
    expect(() =>
      validatePostings([
        posting({ side: "debit", amount: 0 }),
        posting({ side: "credit", amount: 0 }),
      ]),
    ).toThrow(PostingAmountNotPositiveError);
    expect(() =>
      validatePostings([
        posting({ side: "debit", amount: -100 }),
        posting({ side: "credit", amount: -100 }),
      ]),
    ).toThrow(PostingAmountNotPositiveError);
  });

  it("reports the totals of an unbalanced transaction as the reason", () => {
    expect(() =>
      validatePostings([
        posting({ side: "debit", amount: 1000 }),
        posting({ side: "credit", amount: 999 }),
      ]),
    ).toThrow(TransactionUnbalancedError);
    expect(() =>
      validatePostings([
        posting({ side: "debit", amount: 1000 }),
        posting({ side: "credit", amount: 999 }),
      ]),
    ).toThrow(expect.objectContaining({ debitTotal: 1000, creditTotal: 999 }));
  });

  it("rejects postings with no account title selected", () => {
    expect(() =>
      validatePostings([
        posting({ side: "debit", accountTitleId: id("") }),
        posting({ side: "credit" }),
      ]),
    ).toThrow(PostingAccountTitleMissingError);
  });
});
