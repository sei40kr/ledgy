import { FiscalYear } from "@account-ledgers/domain";
import type {
  AccountTitleId,
  FiscalYearId,
  MonthlyTransactionSummary,
  TenantId,
} from "@account-ledgers/domain";
import type { OpeningBalance } from "../fiscalYears/openingBalance";

const accountTitleId = (value: string) => value as AccountTitleId;
import { describe, expect, it } from "vitest";
import type { FiscalYearRepository } from "../ports/fiscalYearRepository";
import type { MonthlyTransactionSummaryRepository } from "../ports/monthlyTransactionSummaryRepository";
import type { TransactionRepository } from "../ports/transactionRepository";
import { getAccountLedgerUseCase } from "./getAccountLedger";
import { monthKeyToDateRange } from "./monthKeyToDateRange";

function createLedgerUseCases(deps: {
  fiscalYears: FiscalYearRepository;
  transactions: TransactionRepository;
  monthlyTransactionSummaries: MonthlyTransactionSummaryRepository;
}) {
  return { getAccountLedger: getAccountLedgerUseCase(deps) };
}

const YEAR = new FiscalYear(
  "fy1" as FiscalYearId,
  new Date("2026-01-01"),
  new Date("2026-03-31"),
  "open",
);

function fakeDeps(
  opening: OpeningBalance,
  summaries: Record<string, MonthlyTransactionSummary>,
) {
  const fiscalYears: FiscalYearRepository = {
    list: async () => [YEAR],
    get: async () => YEAR,
    add: async () => "fy1" as FiscalYearId,
    save: async () => {},
  };
  const unused = () => {
    throw new Error("unused");
  };
  const transactions: TransactionRepository = {
    create: unused,
    update: unused,
    softDelete: unused,
    get: unused,
    listRevisions: unused,
    search: unused,
    listAllActive: unused,
    getOpeningBalance: async () => opening,
    saveOpeningBalance: async () => {},
  };
  const summariesRepo: MonthlyTransactionSummaryRepository = {
    list: async () => summaries,
    replaceAll: async () => {},
  };
  return {
    fiscalYears,
    transactions,
    monthlyTransactionSummaries: summariesRepo,
  };
}

describe("getAccountLedger", () => {
  it("returns monthly balances that include the opening balance", async () => {
    const usecases = createLedgerUseCases(
      fakeDeps(
        { [accountTitleId("cash")]: { debit: 100000, credit: 0 } },
        {
          "202601": { [accountTitleId("cash")]: { debitTotal: 50000, creditTotal: 20000 } },
          "202603": { [accountTitleId("cash")]: { debitTotal: 0, creditTotal: 10000 } },
        },
      ),
    );
    const ledger = await usecases.getAccountLedger({
      tenantId: "t1" as TenantId,
      yearId: "fy1" as FiscalYearId,
      accountTitleId: accountTitleId("cash"),
      category: "asset",
    });
    expect(ledger.openingBalance).toBe(100000);
    expect(ledger.months.map((m) => m.balance)).toEqual([
      130000, 130000, 120000,
    ]);
    expect(ledger.closingBalance).toBe(120000);
  });
});

describe("monthKeyToDateRange", () => {
  it("returns the first and last day of the month, including in leap years", () => {
    expect(monthKeyToDateRange("202601")).toEqual({
      from: new Date("2026-01-01"),
      to: new Date("2026-01-31"),
    });
    expect(monthKeyToDateRange("202402")).toEqual({
      from: new Date("2024-02-01"),
      to: new Date("2024-02-29"),
    });
    expect(monthKeyToDateRange("202604")).toEqual({
      from: new Date("2026-04-01"),
      to: new Date("2026-04-30"),
    });
  });
});
