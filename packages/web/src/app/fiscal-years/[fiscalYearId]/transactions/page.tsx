"use client";

import {
  type AccountTitleId,
  type FiscalYearId,
  type Posting,
  type TenantId,
  type Transaction,
  type UserId,
} from "@account-ledgers/domain";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Field,
  HStack,
  Input,
  NativeSelect,
  Spinner,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AccountTitleBadge } from "@/components/AccountTitleBadge";
import { AppShell } from "@/components/AppShell";
import { DateField } from "@/components/DateField";
import { MonetaryAmountText } from "@/components/MonetaryAmountText";
import { FileIcon } from "@/components/FileIcon";
import { TableCard } from "@/components/TableCard";
import { TransactionSupportingDocumentsDialog } from "@/components/TransactionSupportingDocumentsDialog";
import { useTransactionSupportingDocuments } from "@/hooks/useTransactionSupportingDocuments";
import { TAX_CATEGORY_LABELS } from "@/components/labels";
import {
  formatDate,
  formatDateInFiscalYear,
  parseDateInput,
} from "@/components/dates";
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
    <AppShell>
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

  const accountById = useMemo(
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
  const accountBadge = (accountTitleId: AccountTitleId) => {
    const account = accountById.get(accountTitleId);
    return account ? (
      <AccountTitleBadge name={account.name} category={account.category} />
    ) : (
      accountTitleId
    );
  };

  // The account title badge plus, when set, the posting's tax category.
  const accountCell = (posting: Posting | null) => {
    if (!posting) return "";
    return (
      <Stack gap={0.5} align="flex-start">
        {accountBadge(posting.accountTitleId)}
        {posting.taxCategory && (
          <Text fontSize="10px" color="fg.muted">
            {TAX_CATEGORY_LABELS[posting.taxCategory.code]}
          </Text>
        )}
      </Stack>
    );
  };

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
    return (
      <Text fontSize="sm" color="fg.muted">
        会計年度がまだありません。「会計年度」から年度を作成してください。
      </Text>
    );
  }

  const yearMin = formatDate(currentYear.startDate);
  const yearMax = formatDate(currentYear.endDate);

  return (
    <Stack gap={4}>
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
          <Field.Label>キーワード(摘要・取引先・メモ)</Field.Label>
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

      <TableCard>
        <Table.Root size="md" variant="outline" borderWidth={0} interactive>
        <Table.Header>
          <Table.Row bg="bg.subtle">
            <Table.ColumnHeader w="5rem">日付</Table.ColumnHeader>
            <Table.ColumnHeader>借方科目</Table.ColumnHeader>
            <Table.ColumnHeader w="8rem" textAlign="right">
              借方金額
            </Table.ColumnHeader>
            <Table.ColumnHeader>貸方科目</Table.ColumnHeader>
            <Table.ColumnHeader w="8rem" textAlign="right">
              貸方金額
            </Table.ColumnHeader>
            <Table.ColumnHeader>摘要 / 取引先</Table.ColumnHeader>
            <Table.ColumnHeader w="4.5rem" textAlign="center">
              証憑
            </Table.ColumnHeader>
            <Table.ColumnHeader w="5rem">状態</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {transactions.map((transaction) => {
            const rev = transaction;
            const lines = pairPostings(rev.postings);
            const { deleted } = rev;
            return lines.map((line, i) => {
              const isLast = i === lines.length - 1;
              return (
                <Table.Row
                  key={`${transaction.id}-${i}`}
                  onClick={() => !deleted && router.push(editHref(transaction.id))}
                  cursor={deleted ? "default" : "pointer"}
                  opacity={deleted ? 0.5 : 1}
                  // Keep the lines of one transaction visually grouped: only the
                  // last line of each transaction draws the separating border
                  // (the outline variant puts it on the <tr>).
                  borderBottomWidth={isLast ? undefined : "0px"}
                >
                  <Table.Cell fontFamily="mono" color="fg.muted">
                    {i === 0 ? formatDateInFiscalYear(rev.date, currentYear) : ""}
                  </Table.Cell>
                  <Table.Cell>{accountCell(line.debit)}</Table.Cell>
                  <Table.Cell textAlign="right" fontFamily="mono">
                    {line.debit ? <MonetaryAmountText value={line.debit.amount.value} /> : ""}
                  </Table.Cell>
                  <Table.Cell>{accountCell(line.credit)}</Table.Cell>
                  <Table.Cell textAlign="right" fontFamily="mono">
                    {line.credit ? <MonetaryAmountText value={line.credit.amount.value} /> : ""}
                  </Table.Cell>
                  <Table.Cell>
                    {i === 0 ? (
                      <>
                        {rev.description}
                        {rev.partners.length > 0 && (
                          <Text as="span" fontSize="xs" color="fg.muted">
                            {" "}
                            /{" "}
                            {rev.partners
                              .map((id) => partnerNameById.get(id) ?? id)
                              .join("、")}
                          </Text>
                        )}
                        {rev.tags.length > 0 && (
                          <Text as="span" fontSize="xs" color="fg.info">
                            {" "}
                            {rev.tags
                              .map((id) => `#${tagNameById.get(id) ?? id}`)
                              .join(" ")}
                          </Text>
                        )}
                      </>
                    ) : (
                      <Text as="span" color="fg.muted">
                        {line.debit?.memo ?? line.credit?.memo ?? ""}
                      </Text>
                    )}
                  </Table.Cell>
                  <Table.Cell textAlign="center">
                    {i === 0 && (
                      <SupportingDocumentIndicator
                        count={rev.supportingDocumentIds.length}
                        onClick={() => setSupportingDocumentsOf(transaction)}
                      />
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    {i === 0 &&
                      (deleted ? (
                        <Badge colorPalette="red">削除済</Badge>
                      ) : (
                        <Badge colorPalette="green">有効</Badge>
                      ))}
                  </Table.Cell>
                </Table.Row>
              );
            });
          })}
        </Table.Body>
        </Table.Root>
      </TableCard>

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
          alignSelf="center"
          onClick={() => runSearch(nextCursor)}
          loading={loading}
        >
          さらに読み込む
        </Button>
      )}

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

/**
 * The documents of one journal row, with every action applied immediately.
 * onChanged lets the journal refresh the row's indicator.
 */
function JournalSupportingDocumentsDialog({
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
      description={transaction.description}
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

/**
 * Whether a transaction has supporting documents, and how many, at a glance;
 * clicking opens them. With none yet it reads as the action to add one, so it
 * still looks clickable. Stops the click so the row does not navigate to the
 * edit page.
 */
function SupportingDocumentIndicator({
  count,
  onClick,
}: {
  count: number;
  onClick(): void;
}) {
  return (
    <Button
      size="2xs"
      variant={count > 0 ? "subtle" : "outline"}
      aria-label={count > 0 ? `証憑 ${count}件` : "証憑を追加"}
      title={count > 0 ? `証憑 ${count}件` : "証憑を追加"}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <FileIcon boxSize="12px" />
      {count > 0 ? count : "追加"}
    </Button>
  );
}

/** One journal line pairs a debit posting with a credit posting positionally, so a
 * compound transaction renders as several rows the way a paper 仕訳帳 does. */
interface JournalLine {
  debit: Posting | null;
  credit: Posting | null;
}

function pairPostings(postings: Posting[]): JournalLine[] {
  const debits = postings.filter((posting) => posting.side === "debit");
  const credits = postings.filter((posting) => posting.side === "credit");
  const rowCount = Math.max(debits.length, credits.length, 1);
  const lines: JournalLine[] = [];
  for (let i = 0; i < rowCount; i++) {
    lines.push({ debit: debits[i] ?? null, credit: credits[i] ?? null });
  }
  return lines;
}
