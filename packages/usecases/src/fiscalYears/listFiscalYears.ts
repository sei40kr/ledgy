import type { FiscalYear,
  TenantId,
} from "@account-ledgers/domain";
import type { FiscalYearRepository } from "../ports/fiscalYearRepository";

export function listFiscalYearsUseCase(deps: {
  fiscalYears: FiscalYearRepository;
}) {
  return function listFiscalYears(tenantId: TenantId): Promise<FiscalYear[]> {
    return deps.fiscalYears.list(tenantId);
  };
}
