import type { MonthlyTransactionSummary,
  TenantId,
  FiscalYearId,
} from "@account-ledgers/domain";

export interface MonthlyTransactionSummaryRepository {
  /** Every monthly summary in the fiscal year, keyed by monthKey. */
  list(
    tenantId: TenantId,
    yearId: FiscalYearId,
  ): Promise<Record<string, MonthlyTransactionSummary>>;

  /** Rewrites all monthly transaction summaries in bulk, for rebuildMonthlyTransactionSummaries. */
  replaceAll(
    tenantId: TenantId,
    yearId: FiscalYearId,
    summaries: Record<string, MonthlyTransactionSummary>,
  ): Promise<void>;
}
