"use client";

import type { FiscalYear } from "@account-ledgers/domain";
import {
  type ConditionalValue,
  DatePicker,
  type DateValue,
  parseDate,
  Portal,
} from "@chakra-ui/react";

/**
 * A single date input built on Chakra's DatePicker so the displayed segments are
 * controlled by `format`/`parse` (native <input type="date"> can't hide the
 * year). Within a fiscal year that stays inside one calendar year the year is
 * redundant, so the field shows and accepts MM/DD; otherwise YYYY/MM/DD.
 *
 * Values cross the boundary as "YYYY-MM-DD" strings, matching the rest of the app.
 */
export function DateField({
  value,
  onChange,
  min,
  max,
  fiscalYear,
  disabled,
  size = "sm",
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  /** When set and the year does not straddle calendar years, the year is hidden. */
  fiscalYear?: FiscalYear | null;
  disabled?: boolean;
  size?: ConditionalValue<"sm" | "md" | "lg" | "xs">;
}) {
  const showYear = !fiscalYear || fiscalYear.spansCalendarYears();
  const parseYear = fiscalYear?.startDate.getUTCFullYear();

  const pad = (n: number) => String(n).padStart(2, "0");

  function format(date: DateValue): string {
    return showYear
      ? `${date.year}/${pad(date.month)}/${pad(date.day)}`
      : `${pad(date.month)}/${pad(date.day)}`;
  }

  function parse(text: string): DateValue | undefined {
    const parts = text
      .split(/[/\-.]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number);
    if (parts.some(Number.isNaN)) return undefined;
    let year: number | undefined;
    let month: number | undefined;
    let day: number | undefined;
    if (parts.length === 3) [year, month, day] = parts;
    else if (parts.length === 2) [month, day] = [parts[0], parts[1]];
    else return undefined;
    year ??= parseYear ?? new Date().getUTCFullYear();
    if (month === undefined || day === undefined) return undefined;
    try {
      return parseDate(`${year}-${pad(month)}-${pad(day)}`);
    } catch {
      return undefined;
    }
  }

  return (
    <DatePicker.Root
      size={size}
      disabled={disabled}
      locale="ja-JP"
      value={value ? [parseDate(value)] : []}
      min={min ? parseDate(min) : undefined}
      max={max ? parseDate(max) : undefined}
      format={format}
      parse={parse}
      onValueChange={(e) => onChange(e.value[0]?.toString() ?? "")}
    >
      <DatePicker.Control>
        <DatePicker.Input
          placeholder={showYear ? "YYYY/MM/DD" : "MM/DD"}
          bg="bg.panel"
        />
        <DatePicker.Trigger aria-label="カレンダーを開く">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M3 10h18M8 2v4M16 2v4" />
          </svg>
        </DatePicker.Trigger>
      </DatePicker.Control>
      <Portal>
        <DatePicker.Positioner>
          <DatePicker.Content>
            <DatePicker.View view="day">
              <DatePicker.Context>
                {(api) => (
                  <>
                    <DatePicker.ViewControl>
                      <DatePicker.PrevTrigger>‹</DatePicker.PrevTrigger>
                      <DatePicker.ViewTrigger>
                        <DatePicker.RangeText />
                      </DatePicker.ViewTrigger>
                      <DatePicker.NextTrigger>›</DatePicker.NextTrigger>
                    </DatePicker.ViewControl>
                    <DatePicker.Table>
                      <DatePicker.TableHead>
                        <DatePicker.TableRow>
                          {api.weekDays.map((weekDay, i) => (
                            <DatePicker.TableHeader key={i}>
                              {weekDay.narrow}
                            </DatePicker.TableHeader>
                          ))}
                        </DatePicker.TableRow>
                      </DatePicker.TableHead>
                      <DatePicker.TableBody>
                        {api.weeks.map((week, i) => (
                          <DatePicker.TableRow key={i}>
                            {week.map((day, j) => (
                              <DatePicker.TableCell key={j} value={day}>
                                <DatePicker.TableCellTrigger>
                                  {day.day}
                                </DatePicker.TableCellTrigger>
                              </DatePicker.TableCell>
                            ))}
                          </DatePicker.TableRow>
                        ))}
                      </DatePicker.TableBody>
                    </DatePicker.Table>
                  </>
                )}
              </DatePicker.Context>
            </DatePicker.View>
          </DatePicker.Content>
        </DatePicker.Positioner>
      </Portal>
    </DatePicker.Root>
  );
}
