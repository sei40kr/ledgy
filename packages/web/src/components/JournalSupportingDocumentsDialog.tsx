"use client";

import type {
  FiscalYearId,
  TenantId,
  Transaction,
  UserId,
} from "@account-ledgers/domain";
import { TransactionSupportingDocumentsDialog } from "@/components/TransactionSupportingDocumentsDialog";
import { useTransactionSupportingDocuments } from "@/hooks/useTransactionSupportingDocuments";

/**
 * The supporting documents of one journal row, loaded through the usecases and
 * with every action applied immediately. onChanged lets the journal refresh
 * the row's indicator afterwards.
 */
export function JournalSupportingDocumentsDialog({
  tenantId,
  yearId,
  userId,
  transaction,
  disabled,
  onChanged,
  onClose,
}: {
  tenantId: TenantId;
  yearId: FiscalYearId;
  userId: UserId;
  transaction: Transaction;
  disabled: boolean;
  onChanged(): void;
  onClose(): void;
}) {
  const { supportingDocuments, attach, remove } = useTransactionSupportingDocuments({
    tenantId,
    yearId,
    transactionId: transaction.id,
    userId,
  });
  const changed = <T,>(action: (input: T) => Promise<void>) => async (input: T) => {
    await action(input);
    onChanged();
  };
  return (
    <TransactionSupportingDocumentsDialog
      tenantId={tenantId}
      uploadedBy={userId}
      supportingDocuments={supportingDocuments}
      disabled={disabled}
      onAttach={changed(attach)}
      onDelete={changed(remove)}
      onClose={onClose}
    />
  );
}
