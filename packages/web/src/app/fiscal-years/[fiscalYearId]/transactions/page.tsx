"use client";

import {
  type AccountTitleId,
  type Transaction,
  type UserId,
} from "@account-ledgers/domain";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Field,
  HStack,
  Input,
  NativeSelect,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { APP_SHELL_HEADER_HEIGHT, AppShell } from "@/components/AppShell";
import { DateField } from "@/components/DateField";
import { FiscalYearRequired } from "@/components/FiscalYearRequired";
import { JournalSupportingDocumentsDialog } from "@/components/JournalSupportingDocumentsDialog";
import { JournalTable } from "@/components/JournalTable";
import { formatDate, parseDateInput } from "@/components/dates";
import { useAccountTitles } from "@/hooks/useAccountTitles";
import { usePartners } from "@/hooks/usePartners";
import { useTags } from "@/hooks/useTags";
import { useAuth } from "@/hooks/useAuth";
import { useFiscalYears } from "@/hooks/useFiscalYears";
import { usecases } from "@account-ledgers/infrastructure/container";
import { toDisplayMessage } from "@/components/errorMessages";

const PAGE_SIZE = 50;

export default function TransactionsPage() {
  return (
    <AppShell flush>
      <TransactionsContent />
    </AppShell>
  );
}

function TransactionsContent() {
  const { tenantId, user } = useAuth();
  const { currentYear } = useFiscalYears();
  const { accountTitles } = useAccountTitles();
  const { partners } = usePartners();
  const { tags } = useTags();
  const router = useRouter();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [accountTitleId, setAccountId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [nextCursor, setNextCursor] = useState<unknown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The transaction whose supporting documents are open in the dialog.
  const [supportingDocumentsOf, setSupportingDocumentsOf] = useState<Transaction | null>(null);

  const accountTitleById = useMemo(
    () => new Map(accountTitles.map((a) => [a.id, a])),
    [accountTitles],
  );
  const partnerNameById = useMemo(
    () => new Map(partners.map((p) => [p.id, p.name])),
    [partners],
  );
  const tagNameById = useMemo(
    () => new Map(tags.map((t) => [t.id, t.name])),
    [tags],
  );
  function editHref(transactionId: string): string {
    return currentYear
      ? `/fiscal-years/${currentYear.id}/transactions/${transactionId}/edit/`
      : "/fiscal-years/";
  }

  const runSearch = useCallback(
    async (cursor?: unknown) => {
      if (!tenantId || !currentYear) return;
      setLoading(true);
      setError(null);
      try {
        const page = await usecases.transactions.search({
          tenantId,
          yearId: currentYear.id,
          dateFrom: dateFrom ? parseDateInput(dateFrom) : undefined,
          dateTo: dateTo ? parseDateInput(dateTo) : undefined,
          accountTitleId: (accountTitleId as AccountTitleId) || undefined,
          keyword: keyword || undefined,
          includeDeleted,
          limit: PAGE_SIZE,
          cursor,
        });
        setTransactions((prev) =>
          cursor ? [...prev, ...page.transactions] : page.transactions,
        );
        setNextCursor(page.nextCursor);
      } catch (e) {
        setError(toDisplayMessage(e, "検索に失敗しました"));
      } finally {
        setLoading(false);
      }
    },
    [tenantId, currentYear, dateFrom, dateTo, accountTitleId, keyword, includeDeleted],
  );

  useEffect(() => {
    void runSearch();
  }, [runSearch]);

  // After the dialog attaches or detaches, refresh the header the indicator reads.
  const refreshTransaction = useCallback(async () => {
    if (!tenantId || !currentYear || !supportingDocumentsOf) return;
    const fresh = await usecases.transactions.get({
      tenantId,
      yearId: currentYear.id,
      transactionId: supportingDocumentsOf.id,
    });
    if (!fresh) return;
    setTransactions((prev) => prev.map((t) => (t.id === fresh.id ? fresh : t)));
  }, [tenantId, currentYear, supportingDocumentsOf]);

  if (!currentYear) {
    return <FiscalYearRequired p={6} />;
  }

  const yearMin = formatDate(currentYear.startDate);
  const yearMax = formatDate(currentYear.endDate);

  return (
    <Stack gap={0}>
      <Stack gap={4} px={6} pt={6} pb={4}>
        <HStack gap={3} align="flex-end" flexWrap="wrap">
          <Field.Root maxW="11rem">
            <Field.Label>開始日</Field.Label>
            <DateField
              value={dateFrom}
              onChange={setDateFrom}
              min={yearMin}
              max={yearMax}
              fiscalYear={currentYear}
            />
          </Field.Root>
          <Field.Root maxW="11rem">
            <Field.Label>終了日</Field.Label>
            <DateField
              value={dateTo}
              onChange={setDateTo}
              min={yearMin}
              max={yearMax}
              fiscalYear={currentYear}
            />
          </Field.Root>
          <Field.Root maxW="16rem">
            <Field.Label>科目</Field.Label>
            <NativeSelect.Root size="sm">
              <NativeSelect.Field
                value={accountTitleId}
                onChange={(e) => setAccountId(e.target.value)}
                bg="bg.panel"
              >
                <option value="">すべて</option>
                {accountTitles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
          <Field.Root maxW="16rem">
            <Field.Label>キーワード(摘要)</Field.Label>
            <Input
              size="sm"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </Field.Root>
          <Checkbox.Root
            size="sm"
            checked={includeDeleted}
            onCheckedChange={(e) => setIncludeDeleted(!!e.checked)}
            pb={2}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control bg="bg.panel" />
            <Checkbox.Label>削除済も表示</Checkbox.Label>
          </Checkbox.Root>
        </HStack>

        {error && (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Title>{error}</Alert.Title>
          </Alert.Root>
        )}
      </Stack>

      {/* Edge to edge, with the heading pinned just below the shell's header. */}
      <Box bg="bg.panel" borderYWidth="1px" borderColor="border">
        <JournalTable
          transactions={transactions}
          fiscalYear={currentYear}
          accountTitleById={accountTitleById}
          partnerNameById={partnerNameById}
          tagNameById={tagNameById}
          onOpen={(transaction) => router.push(editHref(transaction.id))}
          onOpenSupportingDocuments={setSupportingDocumentsOf}
          stickyHeadingTop={APP_SHELL_HEADER_HEIGHT}
          insetX={6}
        />
      </Box>

      <Stack gap={4} align="center" p={6}>
        {loading && <Spinner />}
        {!loading && transactions.length === 0 && (
          <Text fontSize="sm" color="fg.muted">
            仕訳が見つかりません
          </Text>
        )}
        {nextCursor !== null && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => runSearch(nextCursor)}
            loading={loading}
          >
            さらに読み込む
          </Button>
        )}
      </Stack>

      {supportingDocumentsOf && tenantId && user && (
        <JournalSupportingDocumentsDialog
          tenantId={tenantId}
          yearId={currentYear.id}
          userId={user.uid as UserId}
          transaction={supportingDocumentsOf}
          disabled={currentYear.status !== "open" || supportingDocumentsOf.deleted}
          onChanged={() => void refreshTransaction()}
          onClose={() => setSupportingDocumentsOf(null)}
        />
      )}
    </Stack>
  );
}
