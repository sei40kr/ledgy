import type { FiscalYear } from "@account-ledgers/domain";

// Calendar dates are Date values normalized to UTC midnight. <input type="date">
// works in "YYYY-MM-DD" strings, so convert at the form boundary with these two.

export function parseDateInput(value: string): Date {
  // "YYYY-MM-DD" parses as UTC midnight.
  return new Date(value);
}

/** Formats for both <input type="date"> values and on-screen display. */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Short "MM/DD" for dense tables where the year is redundant. */
export function formatMonthDay(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${month}/${day}`;
}

/**
 * A date within a fiscal year. When the year stays inside one calendar year the
 * year is redundant, so we show MM/DD; when it straddles two years we keep it.
 */
export function formatDateInFiscalYear(
  date: Date,
  fiscalYear: FiscalYear | null,
): string {
  return fiscalYear && !fiscalYear.spansCalendarYears()
    ? formatMonthDay(date)
    : formatDate(date);
}
