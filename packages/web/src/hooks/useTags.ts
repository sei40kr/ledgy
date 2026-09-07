"use client";

import type { Tag } from "@account-ledgers/domain";
import { useCallback, useEffect, useState } from "react";
import { usecases } from "@account-ledgers/infrastructure/container";
import { useAuth } from "./useAuth";

/** Loads and reloads the tag list. A thin adapter over the usecase, holding no logic of its own. */
export function useTags() {
  const { tenantId } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      setTags(await usecases.tags.list(tenantId));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { tags, loading, reload };
}
