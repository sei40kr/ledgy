"use client";

import {
  type AccountTitle,
  type FiscalYear,
  type Transaction,
  normalBalanceSide,
} from "@account-ledgers/domain";
import {
  Alert,
  Box,
  Field,
  HStack,
  NativeSelect,
  Spinner,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  type AccountTitleLedger,
  monthKeyToDateRange,
} from "@account-ledgers/usecases";
import { AccountTitleBadge } from "@/components/AccountTitleBadge";
import { AppShell } from "@/components/AppShell";
import { MonetaryAmountText } from "@/components/MonetaryAmountText";
import { TableCard } from "@/components/TableCard";
import { formatDateInFiscalYear } from "@/components/dates";
import { useAccountTitles } from "@/hooks/useAccountTitles";
import { useAuth } from "@/hooks/useAuth";
import { useFiscalYears } from "@/hooks/useFiscalYears";
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
  const { tenantId } = useAuth();
  const { currentYear } = useFiscalYears();
  const { accountTitles } = useAccountTitles();

  const [accountTitleId, setAccountId] = useState("");
  const [ledger, setLedger] = useState<AccountTitleLedger | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  const accountTitle = useMemo(
    () => accountTitles.find((a) => a.id === accountTitleId) ?? null,
    [accountTitles, accountTitleId],
  );
  const accountById = useMemo(
    () => new Map(accountTitles.map((a) => [a.id, a])),
    [accountTitles],
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

  if (!currentYear) {
    return (
      <Text fontSize="sm" color="fg.muted">
        会計年度がまだありません。「会計年度」から年度を作成してください。
      </Text>
    );
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
        <NativeSelect.Root size="sm">
          <NativeSelect.Field
            value={accountTitleId}
            onChange={(e) => setAccountId(e.target.value)}
            bg="bg.panel"
          >
            <option value="">科目を選択してください</option>
            {accountTitles
              .filter((a) => a.isActive)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
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
                        accountTitleId={accountTitle.id}
                        accountById={accountById}
                        fiscalYear={currentYear}
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
    </Stack>
  );
}

/** Detail shown when a month is clicked: the transactions in that month touching that account title. */
function MonthDetail({
  loading,
  transactions,
  accountTitleId,
  accountById,
  fiscalYear,
}: {
  loading: boolean;
  transactions: Transaction[];
  accountTitleId: string;
  accountById: Map<string, AccountTitle>;
  fiscalYear: FiscalYear | null;
}) {
  if (loading) {
    return (
      <Box p={4}>
        <Spinner size="sm" />
      </Box>
    );
  }
  if (transactions.length === 0) {
    return (
      <Box p={4}>
        <Text fontSize="sm" color="fg.muted">
          この月の仕訳はありません
        </Text>
      </Box>
    );
  }
  return (
    <Table.Root size="md" bg="bg.subtle">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader w="5rem">日付</Table.ColumnHeader>
          <Table.ColumnHeader>摘要</Table.ColumnHeader>
          <Table.ColumnHeader>相手科目</Table.ColumnHeader>
          <Table.ColumnHeader textAlign="right">借方(円)</Table.ColumnHeader>
          <Table.ColumnHeader textAlign="right">貸方(円)</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {transactions.flatMap((transaction) =>
          transaction.postings
            .filter((posting) => posting.accountTitleId === accountTitleId)
            .map((posting, i) => {
              const seen = new Set<string>();
              const counterparts: AccountTitle[] = [];
              for (const l of transaction.postings) {
                if (l.side === posting.side) continue;
                const account = accountById.get(l.accountTitleId);
                if (account && !seen.has(account.id)) {
                  seen.add(account.id);
                  counterparts.push(account);
                }
              }
              return (
                <Table.Row key={`${transaction.id}-${i}`}>
                  <Table.Cell fontFamily="mono" color="fg.muted">
                    {formatDateInFiscalYear(
                      transaction.date,
                      fiscalYear,
                    )}
                  </Table.Cell>
                  <Table.Cell>{transaction.description}</Table.Cell>
                  <Table.Cell>
                    <HStack gap={1} flexWrap="wrap">
                      {counterparts.map((account) => (
                        <AccountTitleBadge
                          key={account.id}
                          name={account.name}
                          category={account.category}
                        />
                      ))}
                    </HStack>
                  </Table.Cell>
                  <Table.Cell textAlign="right" fontFamily="mono">
                    {posting.side === "debit" ? (
                      <MonetaryAmountText value={posting.amount.value} />
                    ) : (
                      ""
                    )}
                  </Table.Cell>
                  <Table.Cell textAlign="right" fontFamily="mono">
                    {posting.side === "credit" ? (
                      <MonetaryAmountText value={posting.amount.value} />
                    ) : (
                      ""
                    )}
                  </Table.Cell>
                </Table.Row>
              );
            }),
        )}
      </Table.Body>
    </Table.Root>
  );
}
