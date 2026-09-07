"use client";

import type { Partner } from "@account-ledgers/domain";
import { useCallback, useEffect, useState } from "react";
import { usecases } from "@account-ledgers/infrastructure/container";
import { useAuth } from "./useAuth";

/** Loads and reloads the partner list. A thin adapter over the usecase, holding no logic of its own. */
export function usePartners() {
  const { tenantId } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      setPartners(await usecases.partners.list(tenantId));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { partners, loading, reload };
}
