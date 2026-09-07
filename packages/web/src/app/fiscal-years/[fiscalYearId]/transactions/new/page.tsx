"use client";

import type { UserId } from "@account-ledgers/domain";
import { Alert, Link, Spinner, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { useState } from "react";
import type { TransactionDraft } from "@account-ledgers/usecases";
import { AppShell } from "@/components/AppShell";
import { TransactionForm } from "@/components/TransactionForm";
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

  if (yearsLoading || accountsLoading) return <Spinner />;
  if (!tenantId) return null;

  if (!currentYear) {
    return (
      <Text fontSize="sm">
        会計年度がまだありません。
        <Link asChild color="fg.info">
          <NextLink href="/fiscal-years/">会計年度</NextLink>
        </Link>
        から年度を作成してください。
      </Text>
    );
  }

  async function handleSubmit(draft: TransactionDraft) {
    if (!tenantId || !user || !currentYear) return;
    await usecases.transactions.create({
      tenantId,
      yearId: currentYear.id,
      draft,
      createdBy: user.uid as UserId,
    });
    setSaved(true);
  }

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

      <TransactionForm
        tenantId={tenantId}
        accountTitles={accountTitles}
        mode="create"
        disabled={currentYear.status !== "open"}
        fiscalYear={currentYear}
        submitLabel="保存して次へ"
        resetAfterSubmit
        onSubmit={handleSubmit}
      />
    </Stack>
  );
}
