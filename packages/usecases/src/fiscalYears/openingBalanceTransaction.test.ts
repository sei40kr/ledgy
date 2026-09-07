import { type AccountTitleId, MonetaryAmount } from "@account-ledgers/domain";
import { describe, expect, it } from "vitest";
import {
  openingBalanceToPostings,
  postingsToOpeningBalance,
} from "./openingBalanceTransaction";

const id = (value: string) => value as AccountTitleId;

describe("opening balance <-> transaction postings", () => {
  it("turns a balance into a debit/credit posting per non-zero side", () => {
    const postings = openingBalanceToPostings({
      [id("cash")]: { debit: 300000, credit: 0 },
      [id("capital")]: { debit: 0, credit: 300000 },
    });
    expect(postings).toEqual([
      {
        side: "debit",
        accountTitleId: id("cash"),
        subAccountTitleId: null,
        amount: new MonetaryAmount(300000),
        taxCategory: null,
        memo: "",
      },
      {
        side: "credit",
        accountTitleId: id("capital"),
        subAccountTitleId: null,
        amount: new MonetaryAmount(300000),
        taxCategory: null,
        memo: "",
      },
    ]);
  });

  it("round-trips a balance through postings", () => {
    const balance = {
      [id("cash")]: { debit: 300000, credit: 0 },
      [id("deposit")]: { debit: 1200000, credit: 0 },
      [id("capital")]: { debit: 0, credit: 1500000 },
    };
    expect(postingsToOpeningBalance(openingBalanceToPostings(balance))).toEqual(
      balance,
    );
  });
});
