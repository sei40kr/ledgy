import type {
  FiscalYear,
  FiscalYearStatus,
  TenantId,
  FiscalYearId,
} from "@account-ledgers/domain";

/** The data for a new fiscal year, before the repository assigns an id. */
export interface NewFiscalYear {
  startDate: Date;
  endDate: Date;
  status: FiscalYearStatus;
}

/**
 * Collection-like access to fiscal years: list, get, add, and save whole
 * models. Status changes are expressed on the model by the usecase and
 * persisted with save.
 */
export interface FiscalYearRepository {
  /** Ordered by startDate descending, newest fiscal year first. */
  list(tenantId: TenantId): Promise<FiscalYear[]>;
  get(tenantId: TenantId, yearId: FiscalYearId): Promise<FiscalYear | null>;
  /** Adds a new fiscal year and returns its generated id. */
  add(tenantId: TenantId, fiscalYear: NewFiscalYear): Promise<FiscalYearId>;
  /** Persists the full state of an existing fiscal year. */
  save(tenantId: TenantId, fiscalYear: FiscalYear): Promise<void>;
}
