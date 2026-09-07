import { FiscalYear, FiscalYearPeriodInvalidError } from "@account-ledgers/domain";
import {
  FiscalYearPeriodOverlapsError,
  OpeningBalanceUnbalancedError,
} from "./errors";
import type {
  AccountTitleId,
  FiscalYearId,
  TenantId,
  UserId,
} from "@account-ledgers/domain";
import { describe, expect, it } from "vitest";
import type { FiscalYearRepository } from "../ports/fiscalYearRepository";
import type { TransactionRepository } from "../ports/transactionRepository";
import type { OpeningBalance } from "./openingBalance";
import { createFiscalYearUseCase } from "./createFiscalYear";
import { getOpeningBalanceUseCase } from "./getOpeningBalance";
import { listFiscalYearsUseCase } from "./listFiscalYears";
import { saveOpeningBalanceUseCase } from "./saveOpeningBalance";

const tenant = "t1" as TenantId;
const user = "u1" as UserId;
const accountTitleId = (value: string) => value as AccountTitleId;

/** Wires every fiscal-year usecase to fake repositories. */
function createFiscalYearUseCases(deps: {
  fiscalYears: FiscalYearRepository;
  transactions: TransactionRepository;
}) {
  return {
    list: listFiscalYearsUseCase(deps),
    create: createFiscalYearUseCase(deps),
    getOpeningBalance: getOpeningBalanceUseCase(deps),
    saveOpeningBalance: saveOpeningBalanceUseCase(deps),
  };
}

function createFakeFiscalYearRepository(initial: FiscalYear[] = []) {
  const years = new Map<string, FiscalYear>(initial.map((y) => [y.id, y]));
  let nextId = 1;

  const repo: FiscalYearRepository = {
    async list() {
      return [...years.values()].sort(
        (a, b) => b.startDate.getTime() - a.startDate.getTime(),
      );
    },
    async get(_tenantId, yearId) {
      return years.get(yearId) ?? null;
    },
    async add(_tenantId, fiscalYear) {
      const id = `fy-${nextId++}` as FiscalYearId;
      years.set(
        id,
        new FiscalYear(
          id,
          fiscalYear.startDate,
          fiscalYear.endDate,
          fiscalYear.status,
        ),
      );
      return id;
    },
    async save(_tenantId, fiscalYear) {
      if (!years.has(fiscalYear.id)) throw new Error("not found");
      years.set(fiscalYear.id, fiscalYear);
    },
  };
  return repo;
}

/** A fake transaction repository that only implements the opening-balance methods. */
function createFakeTransactionRepository() {
  const balances = new Map<string, OpeningBalance>();
  const unused = () => {
    throw new Error("unused");
  };
  const repo: TransactionRepository = {
    create: unused,
    update: unused,
    softDelete: unused,
    get: unused,
    listRevisions: unused,
    search: unused,
    listAllActive: unused,
    async getOpeningBalance({ yearId }) {
      return balances.get(yearId) ?? {};
    },
    async saveOpeningBalance({ yearId, balance }) {
      balances.set(yearId, balance);
    },
  };
  return repo;
}

describe("fiscalYear usecases", () => {
  it("creates a fiscal year", async () => {
    const usecases = createFiscalYearUseCases({
      fiscalYears: createFakeFiscalYearRepository(),
      transactions: createFakeTransactionRepository(),
    });
    await usecases.create({
      tenantId: tenant,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
    });
    const years = await usecases.list(tenant);
    expect(years).toHaveLength(1);
    expect(years[0]?.status).toBe("open");
  });

  it("rejects a start date at or after the end date", async () => {
    const usecases = createFiscalYearUseCases({
      fiscalYears: createFakeFiscalYearRepository(),
      transactions: createFakeTransactionRepository(),
    });
    await expect(
      usecases.create({
        tenantId: tenant,
        startDate: new Date("2026-12-31"),
        endDate: new Date("2026-01-01"),
      }),
    ).rejects.toThrow(FiscalYearPeriodInvalidError);
  });

  it("rejects a year whose period overlaps an existing one", async () => {
    const usecases = createFiscalYearUseCases({
      fiscalYears: createFakeFiscalYearRepository([
        new FiscalYear(
          "fy-2026" as FiscalYearId,
          new Date("2026-01-01"),
          new Date("2026-12-31"),
          "open",
        ),
      ]),
      transactions: createFakeTransactionRepository(),
    });
    await expect(
      usecases.create({
        tenantId: tenant,
        startDate: new Date("2026-06-01"),
        endDate: new Date("2027-05-31"),
      }),
    ).rejects.toThrow(FiscalYearPeriodOverlapsError);
    // adjacent periods do not overlap and are allowed
    await expect(
      usecases.create({
        tenantId: tenant,
        startDate: new Date("2027-01-01"),
        endDate: new Date("2027-12-31"),
      }),
    ).resolves.toBeTruthy();
  });

  it("opening balances: saves them when they balance, dropping all-zero account titles", async () => {
    const usecases = createFiscalYearUseCases({
      fiscalYears: createFakeFiscalYearRepository(),
      transactions: createFakeTransactionRepository(),
    });
    const yearId = await usecases.create({
      tenantId: tenant,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
    });

    await usecases.saveOpeningBalance({
      tenantId: tenant,
      yearId,
      createdBy: user,
      balance: {
        [accountTitleId("cash")]: { debit: 500000, credit: 0 },
        [accountTitleId("capital")]: { debit: 0, credit: 500000 },
        [accountTitleId("unused")]: { debit: 0, credit: 0 },
      },
    });

    const saved = await usecases.getOpeningBalance(tenant, yearId);
    expect(Object.keys(saved).sort()).toEqual(["capital", "cash"]);
  });

  it("opening balances: rejects them when they do not balance", async () => {
    const usecases = createFiscalYearUseCases({
      fiscalYears: createFakeFiscalYearRepository(),
      transactions: createFakeTransactionRepository(),
    });
    const yearId = await usecases.create({
      tenantId: tenant,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
    });
    await expect(
      usecases.saveOpeningBalance({
        tenantId: tenant,
        yearId,
        createdBy: user,
        balance: { [accountTitleId("cash")]: { debit: 1000, credit: 0 } },
      }),
    ).rejects.toThrow(OpeningBalanceUnbalancedError);
  });
});
