import {
  type AccountTitleId,
  MonetaryAmount,
  type PartnerId,
  type Transaction,
  type TransactionId,
  type UserId,
} from "@account-ledgers/domain";
import { describe, expect, it } from "vitest";
import { matchesKeyword } from "./searchTransactions";

function transaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: "e1" as TransactionId,
    createdBy: "u1" as UserId,
    createdAt: null,
    updatedBy: "u1" as UserId,
    updatedAt: null,
    date: new Date("2026-01-10"),
    description: "文房具購入",
    partners: ["p-kokuyo" as PartnerId],
    tags: [],
    system: null,
    postings: [
      {
        side: "debit",
        accountTitleId: "supplies" as AccountTitleId,
        subAccountTitleId: null,
        amount: new MonetaryAmount(1000),
        taxCategory: null,
        memo: "ボールペン",
      },
      {
        side: "credit",
        accountTitleId: "cash" as AccountTitleId,
        subAccountTitleId: null,
        amount: new MonetaryAmount(1000),
        taxCategory: null,
        memo: "",
      },
    ],
    deleted: false,
    ...overrides,
  };
}

describe("matchesKeyword", () => {
  it("matches a substring of the description or a posting memo", () => {
    expect(matchesKeyword(transaction({}), "文房具")).toBe(true);
    expect(matchesKeyword(transaction({}), "ボールペン")).toBe(true);
    expect(matchesKeyword(transaction({}), "存在しない")).toBe(false);
  });

  it("does not match on partner references, which are ids rather than names", () => {
    expect(matchesKeyword(transaction({}), "p-kokuyo")).toBe(false);
  });

  it("matches everything for an empty or whitespace-only keyword", () => {
    expect(matchesKeyword(transaction({}), "")).toBe(true);
    expect(matchesKeyword(transaction({}), "  ")).toBe(true);
  });
});
