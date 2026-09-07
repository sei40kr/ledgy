"use client";

import {
  calcPostingTotals,
  type Posting,
  type UserId,
} from "@account-ledgers/domain";
import type { OpeningBalance } from "@account-ledgers/usecases";
import {
  Alert,
  Button,
  Flex,
  Spinner,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { AccountTitleBadge } from "@/components/AccountTitleBadge";
import { AppShell } from "@/components/AppShell";
import { CategoryBadge } from "@/components/CategoryBadge";
import { MonetaryAmountText } from "@/components/MonetaryAmountText";
import {
  MonetaryAmountInput,
  parseMonetaryAmountInput,
} from "@/components/MonetaryAmountInput";
import { TableCard } from "@/components/TableCard";
import { useAccountTitles } from "@/hooks/useAccountTitles";
import { useAuth } from "@/hooks/useAuth";
import { useFiscalYears } from "@/hooks/useFiscalYears";
import { usecases } from "@account-ledgers/infrastructure/container";
import { toDisplayMessage } from "@/components/errorMessages";

interface OpeningBalanceFormValues {
  amounts: Record<string, { debit: string; credit: string }>;
}

export default function OpeningBalancePage() {
  return (
    <AppShell>
      <OpeningBalanceContent />
    </AppShell>
  );
}

/** Opening balance editor, covering the balance sheet account titles: assets, liabilities, and equity. */
function OpeningBalanceContent() {
  const { tenantId, user } = useAuth();
  const { currentYear } = useFiscalYears();
  const { accountTitles, loading: accountsLoading } = useAccountTitles();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<OpeningBalanceFormValues>({ defaultValues: { amounts: {} } });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const balanceSheetAccounts = useMemo(
    () =>
      accountTitles.filter(
        (a) =>
          a.isActive &&
          (a.category === "asset" ||
            a.category === "liability" ||
            a.category === "equity"),
      ),
    [accountTitles],
  );

  const load = useCallback(async () => {
    if (!tenantId || !currentYear) return;
    setLoaded(false);
    const balance = await usecases.fiscalYears.getOpeningBalance(
      tenantId,
      currentYear.id,
    );
    // Seed a field for every balance-sheet account so the inputs are registered.
    const amounts: OpeningBalanceFormValues["amounts"] = {};
    for (const account of balanceSheetAccounts) {
      const v = balance[account.id];
      amounts[account.id] = {
        debit: v?.debit ? String(v.debit) : "",
        credit: v?.credit ? String(v.credit) : "",
      };
    }
    reset({ amounts });
    setLoaded(true);
  }, [tenantId, currentYear, balanceSheetAccounts, reset]);

  useEffect(() => {
    void load();
  }, [load]);

  // Any edit invalidates the "saved" confirmation.
  useEffect(() => {
    const sub = watch(() => setSaved(false));
    return () => sub.unsubscribe();
  }, [watch]);

  // Live debit/credit totals, computed by the domain logic. A blank or half-typed
  // field counts as nothing until it parses.
  const amounts = watch("amounts");
  const totals = calcPostingTotals(
    Object.values(amounts ?? {}).flatMap((v) => {
      const typed: Pick<Posting, "side" | "amount">[] = [];
      const debit = parseMonetaryAmountInput(v.debit);
      const credit = parseMonetaryAmountInput(v.credit);
      if (debit) typed.push({ side: "debit", amount: debit });
      if (credit) typed.push({ side: "credit", amount: credit });
      return typed;
    }),
  );
  const balanced = totals.difference === 0;

  const onSave = handleSubmit(async (data) => {
    if (!tenantId || !currentYear || !user) return;
    setError(null);
    setSaved(false);
    try {
      const balance: OpeningBalance = Object.fromEntries(
        Object.entries(data.amounts).map(([accountTitleId, v]) => [
          accountTitleId,
          { debit: Number(v.debit) || 0, credit: Number(v.credit) || 0 },
        ]),
      );
      await usecases.fiscalYears.saveOpeningBalance({
        tenantId,
        yearId: currentYear.id,
        balance,
        createdBy: user.uid as UserId,
      });
      setSaved(true);
    } catch (e) {
      setError(toDisplayMessage(e, "保存に失敗しました"));
    }
  });

  if (!currentYear) {
    return (
      <Text fontSize="sm" color="fg.muted">
        先に会計年度を作成してください。
      </Text>
    );
  }

  return (
    <Stack as="form" onSubmit={onSave} gap={4} maxW="1100px">
      <Flex align="center" gap={4} flexWrap="wrap" justify="flex-end">
        <Text
          fontSize="sm"
          fontWeight="bold"
          color={balanced ? "green.600" : "red.600"}
        >
          借方 <MonetaryAmountText value={totals.debitTotal} /> / 貸方{" "}
          <MonetaryAmountText value={totals.creditTotal} />
          {balanced ? (
            "(一致)"
          ) : (
            <>
              {" "}
              (差額 <MonetaryAmountText value={totals.difference} />)
            </>
          )}
        </Text>
        <Button
          type="submit"
          size="sm"
          loading={isSubmitting}
          disabled={!balanced || currentYear.status !== "open"}
        >
          保存
        </Button>
      </Flex>

      {error && (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Title>{error}</Alert.Title>
        </Alert.Root>
      )}
      {saved && (
        <Alert.Root status="success">
          <Alert.Indicator />
          <Alert.Title>期首残高を保存しました</Alert.Title>
        </Alert.Root>
      )}
      {currentYear.status !== "open" && (
        <Alert.Root status="warning">
          <Alert.Indicator />
          <Alert.Title>締切済の年度の期首残高は変更できません</Alert.Title>
        </Alert.Root>
      )}

      {accountsLoading || !loaded ? (
        <Spinner />
      ) : (
        <TableCard>
          <Table.Root size="sm" variant="outline" borderWidth={0}>
            <Table.Header>
              <Table.Row bg="bg.subtle">
                <Table.ColumnHeader>科目名</Table.ColumnHeader>
                <Table.ColumnHeader w="6rem">区分</Table.ColumnHeader>
                <Table.ColumnHeader w="11rem">借方(円)</Table.ColumnHeader>
                <Table.ColumnHeader w="11rem">貸方(円)</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {balanceSheetAccounts.map((accountTitle) => (
                <Table.Row key={accountTitle.id}>
                  <Table.Cell>
                    <AccountTitleBadge
                      name={accountTitle.name}
                      category={accountTitle.category}
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <CategoryBadge category={accountTitle.category} />
                  </Table.Cell>
                  <Table.Cell>
                    <MonetaryAmountInput
                      size="xs"
                      disabled={currentYear.status !== "open"}
                      {...register(`amounts.${accountTitle.id}.debit`)}
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <MonetaryAmountInput
                      size="xs"
                      disabled={currentYear.status !== "open"}
                      {...register(`amounts.${accountTitle.id}.credit`)}
                    />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </TableCard>
      )}
    </Stack>
  );
}
