"use client";

import type { AccountTitle } from "@account-ledgers/domain";
import { useCallback, useEffect, useState } from "react";
import { usecases } from "@account-ledgers/infrastructure/container";
import { useAuth } from "./useAuth";

/** Loads and reloads the account title list. A thin adapter over the usecase, holding no logic of its own. */
export function useAccountTitles() {
  const { tenantId } = useAuth();
  const [accountTitles, setAccounts] = useState<AccountTitle[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      setAccounts(await usecases.accountTitles.list(tenantId));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { accountTitles, loading, reload };
}
