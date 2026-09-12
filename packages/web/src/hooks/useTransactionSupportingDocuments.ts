"use client";

import type {
  FiscalYearId,
  SupportingDocument,
  TenantId,
  TransactionId,
  UserId,
} from "@account-ledgers/domain";
import { useCallback, useEffect, useState } from "react";
import { usecases } from "@account-ledgers/infrastructure/container";

/**
 * The supporting documents attached to one existing transaction, with attach and delete
 * applied immediately through the usecases. A thin adapter: each action runs
 * the usecase and reloads the list.
 */
export function useTransactionSupportingDocuments(input: {
  tenantId: TenantId;
  yearId: FiscalYearId;
  transactionId: TransactionId;
  userId: UserId;
}) {
  const { tenantId, yearId, transactionId, userId } = input;
  const [supportingDocuments, setSupportingDocuments] = useState<SupportingDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setSupportingDocuments(await usecases.supportingDocuments.list({ tenantId, transactionId }));
    } finally {
      setLoading(false);
    }
  }, [tenantId, transactionId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const attach = useCallback(
    async (picked: SupportingDocument[]) => {
      for (const supportingDocument of picked) {
        await usecases.transactions.attachSupportingDocument({
          tenantId,
          yearId,
          transactionId,
          supportingDocumentId: supportingDocument.id,
          updatedBy: userId,
        });
      }
      await reload();
    },
    [tenantId, yearId, transactionId, userId, reload],
  );

  const remove = useCallback(
    async (supportingDocument: SupportingDocument) => {
      await usecases.supportingDocuments.delete({
        tenantId,
        supportingDocumentId: supportingDocument.id,
        deletedBy: userId,
      });
      await reload();
    },
    [tenantId, userId, reload],
  );

  return { supportingDocuments, loading, reload, attach, remove };
}
