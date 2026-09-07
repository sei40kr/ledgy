import type { AccountTitleId } from "@account-ledgers/domain";
import { describe, expect, it } from "vitest";
import { buildTrialBalance, rollForwardOpening } from "./trialBalance";

const id = (value: string) => value as AccountTitleId;


describe("buildTrialBalance", () => {
  it("builds a trial balance from opening balances and a summary, with total debits equal to total credits", () => {
    const tb = buildTrialBalance(
      {
        [id("cash")]: { debit: 500000, credit: 0 },
        [id("capital")]: { debit: 0, credit: 500000 },
      },
      {
        [id("cash")]: { debitTotal: 100000, creditTotal: 30000 },
        [id("sales")]: { debitTotal: 0, creditTotal: 100000 },
        [id("expense")]: { debitTotal: 30000, creditTotal: 0 },
      },
    );

    const cash = tb.rows.find((r) => r.accountTitleId === id("cash"));
    expect(cash).toEqual({
      accountTitleId: id("cash"),
      openingDebit: 500000,
      openingCredit: 0,
      debitTotal: 100000,
      creditTotal: 30000,
      closingDebit: 570000,
      closingCredit: 0,
    });

    const sales = tb.rows.find((r) => r.accountTitleId === id("sales"));
    expect(sales?.closingCredit).toBe(100000);
    expect(sales?.closingDebit).toBe(0);

    expect(tb.totals.closingDebit).toBe(tb.totals.closingCredit);
    expect(tb.isBalanced).toBe(true);
  });

  it("reports isBalanced = false when the summary is corrupt and does not balance", () => {
    const tb = buildTrialBalance(
      {},
      {
        [id("cash")]: { debitTotal: 1000, creditTotal: 0 },
        // the matching credit is missing, so double-entry consistency is broken
      },
    );
    expect(tb.isBalanced).toBe(false);
  });

  it("includes account titles that appear only in the opening balances and only in the summary", () => {
    const tb = buildTrialBalance(
      { [id("fixed")]: { debit: 10000, credit: 0 } },
      { [id("sales")]: { debitTotal: 0, creditTotal: 10000 } },
    );
    const ids = tb.rows.map((r) => r.accountTitleId).sort();
    expect(ids).toEqual(["fixed", "sales"]);
  });
});

describe("rollForwardOpening", () => {
  it("returns brought-forward balances with the preceding months folded into the opening balances", () => {
    const rolled = rollForwardOpening(
      {
        [id("cash")]: { debit: 100000, credit: 0 },
        [id("loan")]: { debit: 0, credit: 50000 },
      },
      {
        [id("cash")]: { debitTotal: 30000, creditTotal: 10000 },
        [id("loan")]: { debitTotal: 20000, creditTotal: 0 }, // repayment
        [id("sales")]: { debitTotal: 0, creditTotal: 40000 }, // no opening balance
      },
    );
    expect(rolled).toEqual({
      [id("cash")]: { debit: 120000, credit: 0 },
      [id("loan")]: { debit: 0, credit: 30000 },
      [id("sales")]: { debit: 0, credit: 40000 },
    });
  });

  it("normalizes and returns the opening balances when there are no preceding months", () => {
    expect(
      rollForwardOpening({ [id("cash")]: { debit: 1000, credit: 0 } }, {}),
    ).toEqual({ [id("cash")]: { debit: 1000, credit: 0 } });
  });
});
