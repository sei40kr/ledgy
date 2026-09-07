import { describe, expect, it } from "vitest";
import type { AccountTitleId } from "../models/ids";
import { MonetaryAmount } from "../models/monetaryAmount";
import type { Posting } from "../models/transaction";
import {
  applyPostingsToMonthlyTransactionSummary,
  fiscalYearMonthKeys,
  mergeMonthlyTransactionSummaries,
  monthKeyOf,
} from "./monthlyTransactionSummary";

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

describe("applyPostingsToMonthlyTransactionSummary", () => {
  it("adding a transaction increases the per-account-title totals", () => {
    const summary = applyPostingsToMonthlyTransactionSummary(
      {},
      [
        posting({ side: "debit", accountTitleId: id("cash"), amount: 1000 }),
        posting({ side: "credit", accountTitleId: id("sales"), amount: 1000 }),
      ],
      1,
    );
    expect(summary).toEqual({
      [id("cash")]: { debitTotal: 1000, creditTotal: 0 },
      [id("sales")]: { debitTotal: 0, creditTotal: 1000 },
    });
  });

  it("aggregates multiple postings hitting the same account title", () => {
    const summary = applyPostingsToMonthlyTransactionSummary(
      { [id("cash")]: { debitTotal: 500, creditTotal: 200 } },
      [
        posting({ side: "debit", accountTitleId: id("cash"), amount: 300 }),
        posting({ side: "credit", accountTitleId: id("cash"), amount: 100 }),
      ],
      1,
    );
    expect(summary[id("cash")]).toEqual({ debitTotal: 800, creditTotal: 300 });
  });

  it("subtracting with sign = -1 exactly cancels the addition, as a soft delete does", () => {
    const postings = [
      posting({ side: "debit", accountTitleId: id("cash"), amount: 1000 }),
      posting({ side: "credit", accountTitleId: id("sales"), amount: 1000 }),
    ];
    const added = applyPostingsToMonthlyTransactionSummary({}, postings, 1);
    const removed = applyPostingsToMonthlyTransactionSummary(added, postings, -1);
    expect(removed).toEqual({
      [id("cash")]: { debitTotal: 0, creditTotal: 0 },
      [id("sales")]: { debitTotal: 0, creditTotal: 0 },
    });
  });

  it("leaves the original summary untouched", () => {
    const original = { [id("cash")]: { debitTotal: 100, creditTotal: 0 } };
    applyPostingsToMonthlyTransactionSummary(original, [posting({ accountTitleId: id("cash") })], 1);
    expect(original[id("cash")]).toEqual({ debitTotal: 100, creditTotal: 0 });
  });
});

describe("mergeMonthlyTransactionSummaries", () => {
  it("merges summaries across several months", () => {
    const merged = mergeMonthlyTransactionSummaries([
      { [id("cash")]: { debitTotal: 100, creditTotal: 0 } },
      {
        [id("cash")]: { debitTotal: 50, creditTotal: 30 },
        [id("sales")]: { debitTotal: 0, creditTotal: 100 },
      },
    ]);
    expect(merged).toEqual({
      [id("cash")]: { debitTotal: 150, creditTotal: 30 },
      [id("sales")]: { debitTotal: 0, creditTotal: 100 },
    });
  });

  it("returns an empty summary for an empty array", () => {
    expect(mergeMonthlyTransactionSummaries([])).toEqual({});
  });
});

describe("monthKeyOf", () => {
  it("formats the UTC year and month as YYYYMM", () => {
    expect(monthKeyOf(new Date("2026-07-04"))).toBe("202607");
    expect(monthKeyOf(new Date("2026-12-31"))).toBe("202612");
  });
});

describe("fiscalYearMonthKeys", () => {
  it("lists every month of the year, crossing year boundaries", () => {
    expect(
      fiscalYearMonthKeys({
        startDate: new Date("2026-04-01"),
        endDate: new Date("2027-03-31"),
      }),
    ).toEqual([
      "202604", "202605", "202606", "202607", "202608", "202609",
      "202610", "202611", "202612", "202701", "202702", "202703",
    ]);
  });
});
