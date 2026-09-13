"use client";

import type {
  FiscalYearId,
  TenantId,
  TransactionId,
  UserId,
  Transaction,
} from "@account-ledgers/domain";
import { Alert, Box, Flex, Link, Spinner, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { TransactionDraft } from "@account-ledgers/usecases";
import { AppShell } from "@/components/AppShell";
import {
  draftToFormValues,
  TransactionForm,
} from "@/components/TransactionForm";
import { SupportingDocumentsPane } from "@/components/SupportingDocumentsPane";
import { useTransactionSupportingDocuments } from "@/hooks/useTransactionSupportingDocuments";
import { useAccountTitles } from "@/hooks/useAccountTitles";
import { useAuth } from "@/hooks/useAuth";
import { useFiscalYears } from "@/hooks/useFiscalYears";
import { usecases } from "@account-ledgers/infrastructure/container";
import { toDisplayMessage } from "@/components/errorMessages";

/** The transaction ID embedded in `/fiscal-years/<id>/transactions/<txId>/edit`. */
function transactionIdFromPath(pathname: string): TransactionId | null {
  return (pathname.match(/\/transactions\/([^/]+)\/edit/)?.[1] ??
    null) as TransactionId | null;
}

export default function EditTransactionPage() {
  return (
    <AppShell>
      <EditTransactionContent />
    </AppShell>
  );
}

function EditTransactionContent() {
  const { tenantId, user } = useAuth();
  const { currentYear } = useFiscalYears();
  const { accountTitles, loading: accountsLoading } = useAccountTitles();
  const router = useRouter();
  const pathname = usePathname();
  const transactionId = transactionIdFromPath(pathname);

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The journal (仕訳帳) for this fiscal year, where saving and deleting return to.
  const journalHref = currentYear
    ? `/fiscal-years/${currentYear.id}/transactions/`
    : "/fiscal-years/";

  const load = useCallback(async () => {
    if (!tenantId || !currentYear || !transactionId || transactionId === "_") {
      setLoading(false);
      if (transactionId === "_") setNotFound(true);
      return;
    }
    setLoading(true);
    try {
      const found = await usecases.transactions.get({
        tenantId,
        yearId: currentYear.id,
        transactionId,
      });
      if (found) setTransaction(found);
      else setNotFound(true);
    } catch (e) {
      setError(toDisplayMessage(e, "読み込みに失敗しました"));
    } finally {
      setLoading(false);
    }
  }, [tenantId, currentYear, transactionId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(draft: TransactionDraft) {
    if (!tenantId || !currentYear || !user || !transaction) return;
    await usecases.transactions.update({
      tenantId,
      yearId: currentYear.id,
      transactionId: transaction.id,
      draft,
      updatedBy: user.uid as UserId,
    });
    router.push(journalHref);
  }

  async function handleDelete() {
    if (!tenantId || !currentYear || !user || !transaction) return;
    await usecases.transactions.softDelete({
      tenantId,
      yearId: currentYear.id,
      transactionId: transaction.id,
      updatedBy: user.uid as UserId,
    });
    router.push(journalHref);
  }

  if (loading || accountsLoading) return <Spinner />;

  if (error) {
    return (
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Title>{error}</Alert.Title>
      </Alert.Root>
    );
  }

  if (notFound || !transaction || !currentYear || !tenantId) {
    return (
      <Text fontSize="sm" color="fg.muted">
        仕訳が見つかりませんでした。
        <Link asChild color="fg.info">
          <NextLink href={journalHref}>仕訳帳へ戻る</NextLink>
        </Link>
      </Text>
    );
  }

  const closed = currentYear.status !== "open";

  return (
    <Stack gap={4}>
      {closed && (
        <Alert.Root status="warning">
          <Alert.Indicator />
          <Alert.Title>締切済の年度のため編集できません</Alert.Title>
        </Alert.Root>
      )}
      {transaction.deleted && (
        <Alert.Root status="warning">
          <Alert.Indicator />
          <Alert.Title>この仕訳は削除済です</Alert.Title>
        </Alert.Root>
      )}
      <Flex gap={4} align="flex-start">
        <Box flex={1} minW={0}>
          <TransactionForm
            tenantId={tenantId}
            accountTitles={accountTitles}
            initialValues={draftToFormValues(transaction)}
            mode="edit"
            disabled={closed || transaction.deleted}
            fiscalYear={currentYear}
            submitLabel="更新"
            resetAfterSubmit={false}
            onSubmit={handleSubmit}
            onDelete={handleDelete}
            onCancel={() => router.push(journalHref)}
          />
        </Box>
        {user && (
          <EditTransactionSupportingDocuments
            tenantId={tenantId}
            yearId={currentYear.id}
            transactionId={transaction.id}
            userId={user.uid as UserId}
            disabled={closed || transaction.deleted}
          />
        )}
      </Flex>
    </Stack>
  );
}

/**
 * The supporting documents of the transaction being edited. Unlike the postings, which
 * commit on 更新, attaching and deleting apply immediately: each is its own
 * version of the transaction.
 */
function EditTransactionSupportingDocuments(props: {
  tenantId: TenantId;
  yearId: FiscalYearId;
  transactionId: TransactionId;
  userId: UserId;
  disabled: boolean;
}) {
  const { supportingDocuments, attach, remove } = useTransactionSupportingDocuments(props);
  return (
    <SupportingDocumentsPane
      tenantId={props.tenantId}
      uploadedBy={props.userId}
      supportingDocuments={supportingDocuments}
      disabled={props.disabled}
      onAttach={attach}
      onDelete={remove}
    />
  );
}
