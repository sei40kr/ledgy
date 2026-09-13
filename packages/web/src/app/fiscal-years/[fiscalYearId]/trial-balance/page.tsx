"use client";

import { fiscalYearMonthKeys } from "@account-ledgers/domain";
import {
  Alert,
  Badge,
  Button,
  Field,
  Flex,
  HStack,
  NativeSelect,
  Spinner,
  Stack,
  Table,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { TrialBalance, TrialBalanceMode } from "@account-ledgers/usecases";
import { AccountTitleBadge } from "@/components/AccountTitleBadge";
import { AppShell } from "@/components/AppShell";
import { CategoryBadge } from "@/components/CategoryBadge";
import { FiscalYearRequired } from "@/components/FiscalYearRequired";
import { MonetaryAmountText } from "@/components/MonetaryAmountText";
import { TableCard } from "@/components/TableCard";
import { useAccountTitles } from "@/hooks/useAccountTitles";
import { useAuth } from "@/hooks/useAuth";
import { useFiscalYears } from "@/hooks/useFiscalYears";
import { usecases } from "@account-ledgers/infrastructure/container";
import { toDisplayMessage } from "@/components/errorMessages";

export default function TrialBalancePage() {
  return (
    <AppShell>
      <TrialBalanceContent />
    </AppShell>
  );
}

function monthLabel(monthKey: string): string {
  return `${monthKey.slice(0, 4)}年${Number(monthKey.slice(4, 6))}月`;
}

function TrialBalanceContent() {
  const { tenantId } = useAuth();
  const { currentYear } = useFiscalYears();
  const { accountTitles } = useAccountTitles();

  const monthKeys = useMemo(
    () => (currentYear ? fiscalYearMonthKeys(currentYear) : []),
    [currentYear],
  );
  const [monthKey, setMonthKey] = useState("");
  const [mode, setMode] = useState<TrialBalanceMode>("cumulative");
  const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildResult, setRebuildResult] = useState<string | null>(null);

  // Default to the current month, falling back to the last month of the fiscal year.
  const effectiveMonthKey =
    monthKey ||
    (() => {
      const current = new Date().toLocaleDateString("sv-SE").slice(0, 7).replace("-", "");
      return monthKeys.includes(current)
        ? current
        : (monthKeys[monthKeys.length - 1] ?? "");
    })();

  const accountById = useMemo(
    () => new Map(accountTitles.map((a) => [a.id, a])),
    [accountTitles],
  );

  const load = useCallback(async () => {
    if (!tenantId || !currentYear || !effectiveMonthKey) return;
    setLoading(true);
    setError(null);
    try {
      setTrialBalance(
        await usecases.trialBalance.get({
          tenantId,
          yearId: currentYear.id,
          monthKey: effectiveMonthKey,
          mode,
        }),
      );
    } catch (e) {
      setError(toDisplayMessage(e, "読み込みに失敗しました"));
    } finally {
      setLoading(false);
    }
  }, [tenantId, currentYear, effectiveMonthKey, mode]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRebuild() {
    if (!tenantId || !currentYear) return;
    setRebuilding(true);
    setError(null);
    setRebuildResult(null);
    try {
      const result = await usecases.trialBalance.rebuildMonthlyTransactionSummaries({
        tenantId,
        yearId: currentYear.id,
      });
      setRebuildResult(
        `再集計が完了しました(仕訳 ${result.transactionCount} 件 / ${result.monthCount} ヶ月分)`,
      );
      await load();
    } catch (e) {
      setError(toDisplayMessage(e, "再集計に失敗しました"));
    } finally {
      setRebuilding(false);
    }
  }

  if (!currentYear) {
    return <FiscalYearRequired />;
  }

  // Sort the rows by the account title master's sortOrder.
  const sortedRows = trialBalance
    ? [...trialBalance.rows].sort((a, b) => {
        const orderA = accountById.get(a.accountTitleId)?.sortOrder ?? 99999;
        const orderB = accountById.get(b.accountTitleId)?.sortOrder ?? 99999;
        return orderA - orderB;
      })
    : [];

  return (
    <Stack gap={4}>
      <Flex justify="flex-end" align="center" flexWrap="wrap" gap={3}>
        <HStack gap={3}>
          {trialBalance &&
            (trialBalance.isBalanced ? (
              <Badge colorPalette="green" size="lg">
                ✓ 借方総計 = 貸方総計
              </Badge>
            ) : (
              <Badge colorPalette="red" size="lg">
                ⚠ 貸借不一致 — 再集計を実行してください
              </Badge>
            ))}
          <Button
            size="sm"
            variant="outline"
            bg="bg.panel"
            onClick={handleRebuild}
            loading={rebuilding}
          >
            再集計
          </Button>
        </HStack>
      </Flex>

      <HStack gap={3} align="flex-end">
        <Field.Root maxW="10rem">
          <Field.Label>表示</Field.Label>
          <NativeSelect.Root size="sm">
            <NativeSelect.Field
              value={mode}
              onChange={(e) => setMode(e.target.value as TrialBalanceMode)}
              bg="bg.panel"
            >
              <option value="cumulative">累計</option>
              <option value="monthly">月次</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>
        <Field.Root maxW="12rem">
          <Field.Label>対象月</Field.Label>
          <NativeSelect.Root size="sm">
            <NativeSelect.Field
              value={effectiveMonthKey}
              onChange={(e) => setMonthKey(e.target.value)}
              bg="bg.panel"
            >
              {monthKeys.map((key) => (
                <option key={key} value={key}>
                  {monthLabel(key)}
                  {mode === "cumulative" ? " まで" : ""}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>
      </HStack>

      {error && (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Title>{error}</Alert.Title>
        </Alert.Root>
      )}
      {rebuildResult && (
        <Alert.Root status="success">
          <Alert.Indicator />
          <Alert.Title>{rebuildResult}</Alert.Title>
        </Alert.Root>
      )}

      {loading && <Spinner />}

      {!loading && trialBalance && (
        <TableCard>
        <Table.Root size="md" variant="outline" borderWidth={0}>
          <Table.Header>
            <Table.Row bg="bg.subtle">
              <Table.ColumnHeader>科目</Table.ColumnHeader>
              <Table.ColumnHeader w="5rem">区分</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">
                {mode === "monthly" ? "繰越(借方)" : "期首(借方)"}
              </Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">
                {mode === "monthly" ? "繰越(貸方)" : "期首(貸方)"}
              </Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">借方合計</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">貸方合計</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">残高(借方)</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">残高(貸方)</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {sortedRows.map((row) => {
              const accountTitle = accountById.get(row.accountTitleId);
              return (
                <Table.Row key={row.accountTitleId}>
                  <Table.Cell>
                    {accountTitle ? (
                      <AccountTitleBadge
                        name={accountTitle.name}
                        category={accountTitle.category}
                      />
                    ) : (
                      row.accountTitleId
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    {accountTitle ? (
                      <CategoryBadge category={accountTitle.category} />
                    ) : (
                      "-"
                    )}
                  </Table.Cell>
                  <MonetaryAmountCell value={row.openingDebit} />
                  <MonetaryAmountCell value={row.openingCredit} />
                  <MonetaryAmountCell value={row.debitTotal} />
                  <MonetaryAmountCell value={row.creditTotal} />
                  <MonetaryAmountCell value={row.closingDebit} />
                  <MonetaryAmountCell value={row.closingCredit} />
                </Table.Row>
              );
            })}
            <Table.Row bg="gray.50" fontWeight="bold">
              <Table.Cell colSpan={2}>合計</Table.Cell>
              <MonetaryAmountCell value={trialBalance.totals.openingDebit} bold />
              <MonetaryAmountCell value={trialBalance.totals.openingCredit} bold />
              <MonetaryAmountCell value={trialBalance.totals.debitTotal} bold />
              <MonetaryAmountCell value={trialBalance.totals.creditTotal} bold />
              <MonetaryAmountCell value={trialBalance.totals.closingDebit} bold />
              <MonetaryAmountCell value={trialBalance.totals.closingCredit} bold />
            </Table.Row>
          </Table.Body>
        </Table.Root>
        </TableCard>
      )}
    </Stack>
  );
}

function MonetaryAmountCell({ value, bold }: { value: number; bold?: boolean }) {
  return (
    <Table.Cell
      textAlign="right"
      fontFamily="mono"
      fontWeight={bold ? "bold" : "normal"}
      color={value === 0 ? "fg.subtle" : undefined}
    >
      <MonetaryAmountText value={value} />
    </Table.Cell>
  );
}
