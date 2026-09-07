import {
  type FiscalYearStatus,
  type TenantId,
  type FiscalYearId,
} from "@account-ledgers/domain";
import { FiscalYearNotFoundError } from "./errors";
import type { FiscalYearRepository } from "../ports/fiscalYearRepository";

export function setFiscalYearStatusUseCase(deps: {
  fiscalYears: FiscalYearRepository;
}) {
  return async function setFiscalYearStatus(input: {
    tenantId: TenantId;
    yearId: FiscalYearId;
    status: FiscalYearStatus;
  }): Promise<void> {
    const year = await deps.fiscalYears.get(input.tenantId, input.yearId);
    if (!year) {
      throw new FiscalYearNotFoundError();
    }
    await deps.fiscalYears.save(input.tenantId, year.withStatus(input.status));
  };
}
