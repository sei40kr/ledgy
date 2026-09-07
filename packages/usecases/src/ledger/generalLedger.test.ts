import type { AccountTitleId } from "@account-ledgers/domain";
import { describe, expect, it } from "vitest";
import { buildAccountTitleLedger } from "./generalLedger";

const id = (value: string) => value as AccountTitleId;

describe("buildAccountTitleLedger", () => {
  it("asset account title: accumulates monthly balances from the opening balance, debit positive", () => {
    const ledger = buildAccountTitleLedger({
      accountTitleId: id("cash"),
      category: "asset",
      opening: { debit: 100000, credit: 0 },
      monthKeys: ["202601", "202602", "202603"],
      summaries: {
        "202601": { [id("cash")]: { debitTotal: 50000, creditTotal: 20000 } },
        "202603": { [id("cash")]: { debitTotal: 0, creditTotal: 40000 } },
      },
    });

    expect(ledger.openingBalance).toBe(100000);
    expect(ledger.months).toEqual([
      { monthKey: "202601", debitTotal: 50000, creditTotal: 20000, balance: 130000 },
      { monthKey: "202602", debitTotal: 0, creditTotal: 0, balance: 130000 },
      { monthKey: "202603", debitTotal: 0, creditTotal: 40000, balance: 90000 },
    ]);
    expect(ledger.closingBalance).toBe(90000);
  });

  it("liability account title: credit is the positive side", () => {
    const ledger = buildAccountTitleLedger({
      accountTitleId: id("loan"),
      category: "liability",
      opening: { debit: 0, credit: 300000 },
      monthKeys: ["202601"],
      summaries: {
        "202601": { [id("loan")]: { debitTotal: 50000, creditTotal: 0 } }, // repayment
      },
    });
    expect(ledger.openingBalance).toBe(300000);
    expect(ledger.closingBalance).toBe(250000);
  });

  it("starts from zero for an account title with no opening balance", () => {
    const ledger = buildAccountTitleLedger({
      accountTitleId: id("sales"),
      category: "revenue",
      opening: undefined,
      monthKeys: ["202601"],
      summaries: {
        "202601": { [id("sales")]: { debitTotal: 0, creditTotal: 80000 } },
      },
    });
    expect(ledger.openingBalance).toBe(0);
    expect(ledger.closingBalance).toBe(80000);
  });
});
