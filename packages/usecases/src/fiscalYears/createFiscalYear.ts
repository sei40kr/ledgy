import {
  FiscalYear,
  type TenantId,
  type FiscalYearId,
} from "@account-ledgers/domain";
import { FiscalYearPeriodOverlapsError } from "./errors";
import type { FiscalYearRepository } from "../ports/fiscalYearRepository";

function periodsOverlap(
  a: { startDate: Date; endDate: Date },
  b: { startDate: Date; endDate: Date },
): boolean {
  return (
    a.startDate.getTime() <= b.endDate.getTime() &&
    b.startDate.getTime() <= a.endDate.getTime()
  );
}

export function createFiscalYearUseCase(deps: {
  fiscalYears: FiscalYearRepository;
}) {
  return async function createFiscalYear(input: {
    tenantId: TenantId;
    startDate: Date;
    endDate: Date;
  }): Promise<FiscalYearId> {
    FiscalYear.validatePeriod(input.startDate, input.endDate);
    const existing = await deps.fiscalYears.list(input.tenantId);
    if (existing.some((year) => periodsOverlap(year, input))) {
      throw new FiscalYearPeriodOverlapsError();
    }
    return deps.fiscalYears.add(input.tenantId, {
      startDate: input.startDate,
      endDate: input.endDate,
      status: "open",
    });
  };
}
