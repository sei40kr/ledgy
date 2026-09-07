import {
  type AccountTitleId,
  MonetaryAmountNotIntegerError,
} from "@account-ledgers/domain";
import { describe, expect, it } from "vitest";
import {
  OpeningBalanceNegativeError,
  OpeningBalanceUnbalancedError,
} from "./errors";
import { validateOpeningBalance } from "./openingBalanceValidation";

const id = (value: string) => value as AccountTitleId;


describe("validateOpeningBalance", () => {
  it("accepts opening balances that balance", () => {
    const result = validateOpeningBalance({
      [id("cash")]: { debit: 500000, credit: 0 },
      [id("loan")]: { debit: 0, credit: 200000 },
      [id("capital")]: { debit: 0, credit: 300000 },
    });
    expect(result).toEqual({ debitTotal: 500000, creditTotal: 500000 });
  });

  it("accepts empty opening balances of zero yen", () => {
    expect(validateOpeningBalance({})).toEqual({
      debitTotal: 0,
      creditTotal: 0,
    });
  });

  it("rejects opening balances that do not balance", () => {
    expect(() =>
      validateOpeningBalance({
        [id("cash")]: { debit: 1000, credit: 0 },
        [id("capital")]: { debit: 0, credit: 999 },
      }),
    ).toThrow(OpeningBalanceUnbalancedError);
    expect(() =>
      validateOpeningBalance({
        [id("cash")]: { debit: 1000, credit: 0 },
        [id("capital")]: { debit: 0, credit: 999 },
      }),
    ).toThrow(expect.objectContaining({ debitTotal: 1000, creditTotal: 999 }));
  });

  it("rejects negative and non-integer amounts", () => {
    expect(() =>
      validateOpeningBalance({ [id("cash")]: { debit: -1, credit: 0 } }),
    ).toThrow(OpeningBalanceNegativeError);
    expect(() =>
      validateOpeningBalance({ [id("cash")]: { debit: -1, credit: 0 } }),
    ).toThrow(expect.objectContaining({ accountTitleId: id("cash"), side: "debit" }));
    expect(() =>
      validateOpeningBalance({ [id("cash")]: { debit: 0, credit: -1 } }),
    ).toThrow(expect.objectContaining({ accountTitleId: id("cash"), side: "credit" }));
    expect(() =>
      validateOpeningBalance({ [id("cash")]: { debit: 0.5, credit: 0.5 } }),
    ).toThrow(MonetaryAmountNotIntegerError);
  });
});
