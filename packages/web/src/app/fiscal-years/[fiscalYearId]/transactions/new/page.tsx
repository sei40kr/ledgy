"use client";

import type { SupportingDocument, UserId } from "@account-ledgers/domain";
import { Alert, Box, Flex, Spinner, Stack } from "@chakra-ui/react";
import { useState } from "react";
import type { TransactionDraft } from "@account-ledgers/usecases";
import { AppShell } from "@/components/AppShell";
import { FiscalYearRequired } from "@/components/FiscalYearRequired";
import { TransactionForm } from "@/components/TransactionForm";
import { SupportingDocumentsPane } from "@/components/SupportingDocumentsPane";
import { useAccountTitles } from "@/hooks/useAccountTitles";
import { useAuth } from "@/hooks/useAuth";
import { useFiscalYears } from "@/hooks/useFiscalYears";
import { usecases } from "@account-ledgers/infrastructure/container";

export default function NewTransactionPage() {
  return (
    <AppShell>
      <NewTransactionContent />
    </AppShell>
  );
}

function NewTransactionContent() {
  const { tenantId, user } = useAuth();
  const { currentYear, loading: yearsLoading } = useFiscalYears();
  const { accountTitles, loading: accountsLoading } = useAccountTitles();
  const [saved, setSaved] = useState(false);
  // Supporting documents uploaded for the transaction being entered. Each already exists
  // as a record of its own; the save attaches them, so until then they are pending.
  const [supportingDocuments, setSupportingDocuments] = useState<SupportingDocument[]>([]);

  if (yearsLoading || accountsLoading) return <Spinner />;
  if (!tenantId) return null;

  if (!currentYear) {
    return <FiscalYearRequired />;
  }

  async function handleSubmit(draft: TransactionDraft) {
    if (!tenantId || !user || !currentYear) return;
    await usecases.transactions.create({
      tenantId,
      yearId: currentYear.id,
      draft,
      supportingDocumentIds: supportingDocuments.map((supportingDocument) => supportingDocument.id),
      createdBy: user.uid as UserId,
    });
    setSupportingDocuments([]);
    setSaved(true);
  }

  const userId = user?.uid as UserId;
  const closed = currentYear.status !== "open";

  return (
    <Stack gap={4}>
      {currentYear.status !== "open" && (
        <Alert.Root status="warning">
          <Alert.Indicator />
          <Alert.Title>
            この年度は締切済のため仕訳を登録できません
          </Alert.Title>
        </Alert.Root>
      )}

      {saved && (
        <Alert.Root status="success">
          <Alert.Indicator />
          <Alert.Title>仕訳を保存しました</Alert.Title>
        </Alert.Root>
      )}

      {/* The supportingDocuments sit beside the form so a supportingDocument can be read while its postings are entered. */}
      <Flex gap={4} align="flex-start">
        <Box flex={1} minW={0}>
          <TransactionForm
            tenantId={tenantId}
            accountTitles={accountTitles}
            mode="create"
            disabled={closed}
            fiscalYear={currentYear}
            submitLabel="保存して次へ"
            resetAfterSubmit
            onSubmit={handleSubmit}
          />
        </Box>
        <SupportingDocumentsPane
          tenantId={tenantId}
          uploadedBy={userId}
          supportingDocuments={supportingDocuments}
          disabled={closed}
          onAttach={async (uploaded) =>
            setSupportingDocuments((prev) => [...prev, ...uploaded])
          }
          onDelete={async (supportingDocument) => {
            await usecases.supportingDocuments.delete({
              tenantId,
              supportingDocumentId: supportingDocument.id,
              deletedBy: userId,
            });
            setSupportingDocuments((prev) =>
              prev.filter((r) => r.id !== supportingDocument.id),
            );
          }}
        />
      </Flex>
    </Stack>
  );
}

