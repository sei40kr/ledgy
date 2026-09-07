/** monthKey ("YYYYMM") → that month's date range, from the first day to the last. */
export function monthKeyToDateRange(monthKey: string): {
  from: Date;
  to: Date;
} {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(4, 6));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: new Date(Date.UTC(year, month - 1, 1)),
    to: new Date(Date.UTC(year, month - 1, lastDay)),
  };
}
