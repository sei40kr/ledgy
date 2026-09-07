"use client";

import {
  type AccountTitle,
  calcPostingTotals,
  type PostingSide,
  type Transaction,
} from "@account-ledgers/domain";
import {
  Badge,
  Box,
  Flex,
  HStack,
  Link,
  Spinner,
  Table,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AccountTitleBadge } from "@/components/AccountTitleBadge";
import { AppShell } from "@/components/AppShell";
import { MonetaryAmountText } from "@/components/MonetaryAmountText";
import { formatDateInFiscalYear } from "@/components/dates";
import { useAccountTitles } from "@/hooks/useAccountTitles";
import { useAuth } from "@/hooks/useAuth";
import { useFiscalYears } from "@/hooks/useFiscalYears";
import { usecases } from "@account-ledgers/infrastructure/container";

const RECENT_LIMIT = 8;

export default function HomePage() {
  return (
    <AppShell>
      <RecentTransactions />
    </AppShell>
  );
}

function RecentTransactions() {
  const { tenantId } = useAuth();
  const { currentYear } = useFiscalYears();
  const { accountTitles } = useAccountTitles();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const accountById = useMemo(
    () => new Map(accountTitles.map((a) => [a.id, a])),
    [accountTitles],
  );

  const load = useCallback(async () => {
    if (!tenantId || !currentYear) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const page = await usecases.transactions.search({
        tenantId,
        yearId: currentYear.id,
        limit: RECENT_LIMIT,
      });
      setTransactions(page.transactions);
    } finally {
      setLoading(false);
    }
  }, [tenantId, currentYear]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!currentYear) {
    return (
      <Text fontSize="sm" color="fg.muted">
        会計年度がまだありません。「会計年度」から年度を作成してください。
      </Text>
    );
  }

  return (
    <Box
      bg="bg.panel"
      borderWidth="1px"
      borderColor="border"
      rounded="lg"
      overflow="hidden"
    >
      <Flex align="center" px={5} py="14px" borderBottomWidth="1px" borderColor="border">
        <Text fontSize="13.5px" fontWeight="semibold">
          最近の取引
        </Text>
        <Link asChild ml="auto" fontSize="12.5px" color="fg.info">
          <NextLink href={`/fiscal-years/${currentYear.id}/transactions/`}>
            仕訳帳をすべて見る
          </NextLink>
        </Link>
      </Flex>

      {loading ? (
        <Box p={5}>
          <Spinner size="sm" />
        </Box>
      ) : transactions.length === 0 ? (
        <Box p={5}>
          <Text fontSize="sm" color="fg.muted">
            仕訳がまだありません
          </Text>
        </Box>
      ) : (
        <Table.Root size="md" variant="outline" borderWidth={0}>
          <Table.Header>
            <Table.Row bg="bg.subtle">
              <Table.ColumnHeader w="7rem">日付</Table.ColumnHeader>
              <Table.ColumnHeader>摘要</Table.ColumnHeader>
              <Table.ColumnHeader w="11rem">借方科目</Table.ColumnHeader>
              <Table.ColumnHeader w="11rem">貸方科目</Table.ColumnHeader>
              <Table.ColumnHeader w="9rem" textAlign="right">
                金額(円)
              </Table.ColumnHeader>
              <Table.ColumnHeader w="6rem">状態</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {transactions.map((transaction) => (
              <Table.Row key={transaction.id}>
                <Table.Cell color="fg.muted" fontFamily="mono">
                  {formatDateInFiscalYear(
                    transaction.date,
                    currentYear,
                  )}
                </Table.Cell>
                <Table.Cell>{transaction.description}</Table.Cell>
                <Table.Cell>
                  <SideBadges
                    transaction={transaction}
                    side="debit"
                    accountById={accountById}
                  />
                </Table.Cell>
                <Table.Cell>
                  <SideBadges
                    transaction={transaction}
                    side="credit"
                    accountById={accountById}
                  />
                </Table.Cell>
                <Table.Cell textAlign="right" fontFamily="mono">
                  <MonetaryAmountText
                    value={
                      calcPostingTotals(transaction.postings)
                        .debitTotal
                    }
                  />
                </Table.Cell>
                <Table.Cell>
                  {transaction.deleted ? (
                    <Badge colorPalette="red">削除済</Badge>
                  ) : (
                    <Badge colorPalette="green">有効</Badge>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </Box>
  );
}

/** The distinct account titles on one side of a transaction, as colored badges. */
function SideBadges({
  transaction,
  side,
  accountById,
}: {
  transaction: Transaction;
  side: PostingSide;
  accountById: Map<string, AccountTitle>;
}) {
  const seen = new Set<string>();
  const accounts: AccountTitle[] = [];
  for (const posting of transaction.postings) {
    if (posting.side !== side) continue;
    const account = accountById.get(posting.accountTitleId);
    if (account && !seen.has(account.id)) {
      seen.add(account.id);
      accounts.push(account);
    }
  }
  return (
    <HStack gap={1} flexWrap="wrap">
      {accounts.map((account) => (
        <AccountTitleBadge
          key={account.id}
          name={account.name}
          category={account.category}
        />
      ))}
    </HStack>
  );
}
