import { DomainError } from "../errors";
import type { FiscalYearId } from "./ids";

/** The start date of a fiscal year was not before its end date. */
export class FiscalYearPeriodInvalidError extends DomainError {}

export type FiscalYearStatus = "open" | "closed";

/**
 * A fiscal year. Dates are calendar dates normalized to UTC midnight. The model
 * is immutable — status changes produce a new instance via {@link withStatus}.
 */
export class FiscalYear {
  constructor(
    public readonly id: FiscalYearId,
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly status: FiscalYearStatus,
  ) {}

  /**
   * True when the year straddles two calendar years (e.g. 2025-04-01 –
   * 2026-03-31). When it stays within one calendar year, the year is redundant
   * in date displays scoped to the period.
   */
  spansCalendarYears(): boolean {
    return this.startDate.getUTCFullYear() !== this.endDate.getUTCFullYear();
  }

  /** Whether the date falls within the fiscal year's period. */
  contains(date: Date): boolean {
    const time = date.getTime();
    return (
      !Number.isNaN(time) &&
      time >= this.startDate.getTime() &&
      time <= this.endDate.getTime()
    );
  }

  /** Returns a copy of this fiscal year with a different status. */
  withStatus(status: FiscalYearStatus): FiscalYear {
    return new FiscalYear(this.id, this.startDate, this.endDate, status);
  }

  /** Validates a candidate period before a fiscal year is created. */
  static validatePeriod(startDate: Date, endDate: Date): void {
    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      startDate.getTime() >= endDate.getTime()
    ) {
      throw new FiscalYearPeriodInvalidError();
    }
  }
}
