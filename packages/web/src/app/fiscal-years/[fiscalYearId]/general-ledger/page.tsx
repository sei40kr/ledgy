"use client";

import {
  type Transaction,
  type UserId,
  normalBalanceSide,
} from "@account-ledgers/domain";
import {
  Alert,
  Box,
  Field,
  HStack,
  Spinner,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  type AccountTitleLedger,
  monthKeyToDateRange,
} from "@account-ledgers/usecases";
import { AppShell } from "@/components/AppShell";
import { FiscalYearRequired } from "@/components/FiscalYearRequired";
import { JournalSupportingDocumentsDialog } from "@/components/JournalSupportingDocumentsDialog";
import {
  JournalTable,
  type JournalTableProps,
} from "@/components/JournalTable";
import { MonetaryAmountText } from "@/components/MonetaryAmountText";
import { SearchableSelect } from "@/components/SearchableSelect";
import { TableCard } from "@/components/TableCard";
import { useAccountTitles } from "@/hooks/useAccountTitles";
import { useAuth } from "@/hooks/useAuth";
import { useFiscalYears } from "@/hooks/useFiscalYears";
import { usePartners } from "@/hooks/usePartners";
import { useTags } from "@/hooks/useTags";
import { usecases } from "@account-ledgers/infrastructure/container";
import { toDisplayMessage } from "@/components/errorMessages";

export default function GeneralLedgerPage() {
  return (
    <AppShell>
      <GeneralLedgerContent />
    </AppShell>
  );
}

function GeneralLedgerContent() {
  const { tenantId, user } = useAuth();
  const { currentYear } = useFiscalYears();
  const { accountTitles } = useAccountTitles();
  const { partners } = usePartners();
  const { tags } = useTags();
  const router = useRouter();

  const [accountTitleId, setAccountId] = useState("");
  const [ledger, setLedger] = useState<AccountTitleLedger | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  // The transaction whose supporting documents are open in the dialog.
  const [supportingDocumentsOf, setSupportingDocumentsOf] =
    useState<Transaction | null>(null);

  const accountTitle = useMemo(
    () => accountTitles.find((a) => a.id === accountTitleId) ?? null,
    [accountTitles, accountTitleId],
  );
  const accountById = useMemo(
    () => new Map(accountTitles.map((a) => [a.id, a])),
    [accountTitles],
  );
  const activeAccountTitles = useMemo(
    () => accountTitles.filter((a) => a.isActive),
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

  const loadLedger = useCallback(async () => {
    if (!tenantId || !currentYear || !accountTitle) {
      setLedger(null);
      return;
    }
    setLoading(true);
    setError(null);
    setExpandedMonth(null);
    try {
      setLedger(
        await usecases.ledger.getAccountLedger({
          tenantId,
          yearId: currentYear.id,
          accountTitleId: accountTitle.id,
          category: accountTitle.category,
        }),
      );
    } catch (e) {
      setError(toDisplayMessage(e, "読み込みに失敗しました"));
    } finally {
      setLoading(false);
    }
  }, [tenantId, currentYear, accountTitle]);

  useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  async function toggleMonth(monthKey: string) {
    if (expandedMonth === monthKey) {
      setExpandedMonth(null);
      return;
    }
    if (!tenantId || !currentYear || !accountTitle) return;
    setExpandedMonth(monthKey);
    setTransactionsLoading(true);
    try {
      const range = monthKeyToDateRange(monthKey);
      const page = await usecases.transactions.search({
        tenantId,
        yearId: currentYear.id,
        accountTitleId: accountTitle.id,
        dateFrom: range.from,
        dateTo: range.to,
        limit: 500,
      });
      setMonthTransactions(page.transactions);
    } finally {
      setTransactionsLoading(false);
    }
  }

  // After the dialog attaches or detaches, refresh the header the indicator reads.
  async function refreshTransaction() {
    if (!tenantId || !currentYear || !supportingDocumentsOf) return;
    const fresh = await usecases.transactions.get({
      tenantId,
      yearId: currentYear.id,
      transactionId: supportingDocumentsOf.id,
    });
    if (!fresh) return;
    setMonthTransactions((prev) =>
      prev.map((t) => (t.id === fresh.id ? fresh : t)),
    );
  }

  if (!currentYear) {
    return <FiscalYearRequired />;
  }

  const balanceSideLabel = accountTitle
    ? normalBalanceSide(accountTitle.category) === "debit"
      ? "残高(借方)"
      : "残高(貸方)"
    : "残高";

  return (
    <Stack gap={4}>
      <Field.Root maxW="20rem">
        <Field.Label>勘定科目</Field.Label>
        <SearchableSelect
          items={activeAccountTitles}
          value={accountTitleId}
          onChange={setAccountId}
          placeholder="科目を検索"
        />
      </Field.Root>

      {error && (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Title>{error}</Alert.Title>
        </Alert.Root>
      )}

      {loading && <Spinner />}

      {!loading && ledger && accountTitle && (
        <TableCard>
        <Table.Root size="md" variant="outline" borderWidth={0} interactive>
          <Table.Header>
            <Table.Row bg="bg.subtle">
              <Table.ColumnHeader w="8rem">月</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">
                借方合計(円)
              </Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">
                貸方合計(円)
              </Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">
                {balanceSideLabel}(円)
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row bg="gray.50">
              <Table.Cell fontWeight="bold">期首残高</Table.Cell>
              <Table.Cell />
              <Table.Cell />
              <Table.Cell textAlign="right" fontFamily="mono">
                <MonetaryAmountText value={ledger.openingBalance} />
              </Table.Cell>
            </Table.Row>
            {ledger.months.map((month) => (
              <Fragment key={month.monthKey}>
                <Table.Row
                  onClick={() => toggleMonth(month.monthKey)}
                  cursor="pointer"
                >
                  <Table.Cell>
                    <HStack gap={2}>
                      <Box
                        asChild
                        color="fg.muted"
                        flexShrink={0}
                        transform={
                          expandedMonth === month.monthKey
                            ? "rotate(90deg)"
                            : undefined
                        }
                        transition="transform 150ms"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </Box>
                      <span>
                        {month.monthKey.slice(0, 4)}年
                        {Number(month.monthKey.slice(4, 6))}月
                      </span>
                    </HStack>
                  </Table.Cell>
                  <Table.Cell textAlign="right" fontFamily="mono">
                    <MonetaryAmountText value={month.debitTotal} />
                  </Table.Cell>
                  <Table.Cell textAlign="right" fontFamily="mono">
                    <MonetaryAmountText value={month.creditTotal} />
                  </Table.Cell>
                  <Table.Cell textAlign="right" fontFamily="mono">
                    <MonetaryAmountText value={month.balance} />
                  </Table.Cell>
                </Table.Row>
                {expandedMonth === month.monthKey && (
                  <Table.Row>
                    <Table.Cell colSpan={4} p={0}>
                      <MonthDetail
                        loading={transactionsLoading}
                        transactions={monthTransactions}
                        fiscalYear={currentYear}
                        accountTitleById={accountById}
                        partnerNameById={partnerNameById}
                        tagNameById={tagNameById}
                        onOpen={(transaction) =>
                          router.push(
                            `/fiscal-years/${currentYear.id}/transactions/${transaction.id}/edit/`,
                          )
                        }
                        onOpenSupportingDocuments={setSupportingDocumentsOf}
                      />
                    </Table.Cell>
                  </Table.Row>
                )}
              </Fragment>
            ))}
            <Table.Row bg="gray.50">
              <Table.Cell fontWeight="bold">期末残高</Table.Cell>
              <Table.Cell />
              <Table.Cell />
              <Table.Cell
                textAlign="right"
                fontFamily="mono"
                fontWeight="bold"
              >
                <MonetaryAmountText value={ledger.closingBalance} />
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>
        </TableCard>
      )}

      {supportingDocumentsOf && tenantId && user && (
        <JournalSupportingDocumentsDialog
          tenantId={tenantId}
          yearId={currentYear.id}
          userId={user.uid as UserId}
          transaction={supportingDocumentsOf}
          disabled={
            currentYear.status !== "open" || supportingDocumentsOf.deleted
          }
          onChanged={() => void refreshTransaction()}
          onClose={() => setSupportingDocumentsOf(null)}
        />
      )}
    </Stack>
  );
}

/**
 * Detail shown when a month is clicked: the transactions of that month touching
 * the account title, shown exactly as the journal shows them.
 */
function MonthDetail({
  loading,
  ...journal
}: JournalTableProps & { loading: boolean }) {
  if (loading) {
    return (
      <Box p={4}>
        <Spinner size="sm" />
      </Box>
    );
  }
  if (journal.transactions.length === 0) {
    return (
      <Box p={4}>
        <Text fontSize="sm" color="fg.muted">
          この月の仕訳はありません
        </Text>
      </Box>
    );
  }
  return (
    <Box bg="bg.subtle" borderYWidth="1px" borderColor="border">
      <JournalTable {...journal} insetX={4} />
    </Box>
  );
}
