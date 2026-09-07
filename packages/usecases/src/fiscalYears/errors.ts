import type { AccountTitleId, PostingSide } from "@account-ledgers/domain";
import { ApplicationError } from "../errors";

export class FiscalYearNotFoundError extends ApplicationError {}

/** The fiscal year is closed, so its transactions and opening balance are frozen. */
export class FiscalYearClosedError extends ApplicationError {}

export class FiscalYearPeriodOverlapsError extends ApplicationError {}

/** A transaction date outside the fiscal year it is being recorded in. */
export class DateOutsideFiscalYearError extends ApplicationError {}

/** A report month outside the fiscal year. */
export class MonthOutsideFiscalYearError extends ApplicationError {}

export class OpeningBalanceNegativeError extends ApplicationError {
  constructor(
    readonly accountTitleId: AccountTitleId,
    readonly side: PostingSide,
  ) {
    super();
  }
}

export class OpeningBalanceUnbalancedError extends ApplicationError {
  constructor(
    readonly debitTotal: number,
    readonly creditTotal: number,
  ) {
    super();
  }
}
