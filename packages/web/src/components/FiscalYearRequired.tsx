"use client";

import { Link, Spinner, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { useFiscalYears } from "@/hooks/useFiscalYears";

/** Hover hint on every control a fiscal year has to be selected to reach. */
export const FISCAL_YEAR_REQUIRED_HINT = "会計年度を選択すると利用できます";

/**
 * Stands in for a fiscal-year-scoped page while no year is selected — either
 * because the tenant has no year yet, or because the selection was cleared.
 */
export function FiscalYearRequired({ p }: { p?: number }) {
  const { years, loading } = useFiscalYears();

  if (loading) return <Spinner size="sm" />;

  return (
    <Text fontSize="sm" color="fg.muted" p={p}>
      {years.length === 0 ? (
        <>
          会計年度がまだありません。
          <Link asChild color="fg.info">
            <NextLink href="/fiscal-years/">会計年度</NextLink>
          </Link>
          から年度を作成してください。
        </>
      ) : (
        "会計年度が未選択です。ヘッダーの会計年度から年度を選択してください。"
      )}
    </Text>
  );
}
