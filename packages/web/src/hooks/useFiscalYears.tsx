"use client";

import type { FiscalYear } from "@account-ledgers/domain";
import { formatDate } from "@/components/dates";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { usecases } from "@account-ledgers/infrastructure/container";
import { useAuth } from "./useAuth";

interface FiscalYearState {
  years: FiscalYear[];
  loading: boolean;
  /** The currently selected fiscal year. Null when nothing is selected or no year exists. */
  currentYear: FiscalYear | null;
  selectYear(yearId: string): void;
  reload(): Promise<void>;
}

const FiscalYearContext = createContext<FiscalYearState | null>(null);

const STORAGE_KEY = "account-ledgers:selectedFiscalYearId";

const FISCAL_YEAR_PATH = /^\/fiscal-years\/([^/]+)(\/.*)?$/;

/** The fiscal year ID embedded in a `/fiscal-years/<id>/...` path, or null. */
function fiscalYearIdFromPath(pathname: string): string | null {
  return pathname.match(FISCAL_YEAR_PATH)?.[1] ?? null;
}

/**
 * Swaps the fiscal year ID in a `/fiscal-years/<id>/...` path, preserving the
 * trailing sub-path. Returns null for any path that is not year-scoped.
 */
function rewriteFiscalYearPath(pathname: string, yearId: string): string | null {
  const match = pathname.match(FISCAL_YEAR_PATH);
  if (!match) return null;
  return `/fiscal-years/${yearId}${match[2] ?? "/"}`;
}

export function FiscalYearProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { tenantId } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [years, setYears] = useState<FiscalYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      setYears(await usecases.fiscalYears.list(tenantId));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    setSelectedId(localStorage.getItem(STORAGE_KEY));
    void reload();
  }, [reload]);

  // On a `/fiscal-years/<id>/...` route the URL is the source of truth;
  // elsewhere (home, settings) fall back to the last selection or an open year.
  const routeYearId = fiscalYearIdFromPath(pathname);
  const currentYear =
    years.find((y) => y.id === routeYearId) ??
    years.find((y) => y.id === selectedId) ??
    years.find((y) => y.status === "open") ??
    years[0] ??
    null;

  const selectYear = useCallback(
    (yearId: string) => {
      setSelectedId(yearId);
      localStorage.setItem(STORAGE_KEY, yearId);
      const target = rewriteFiscalYearPath(pathname, yearId);
      if (target) router.push(target);
    },
    [pathname, router],
  );

  return (
    <FiscalYearContext.Provider
      value={{ years, loading, currentYear, selectYear, reload }}
    >
      {children}
    </FiscalYearContext.Provider>
  );
}

export function useFiscalYears(): FiscalYearState {
  const context = useContext(FiscalYearContext);
  if (!context) {
    throw new Error("useFiscalYears must be used inside a FiscalYearProvider");
  }
  return context;
}

export function fiscalYearLabel(year: FiscalYear): string {
  return `${formatDate(year.startDate)} 〜 ${formatDate(year.endDate)}${year.status === "closed" ? "(締切済)" : ""}`;
}
