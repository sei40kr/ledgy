"use client";

import type {
  AccountTitle,
  FiscalYear,
  Posting,
  Transaction,
} from "@account-ledgers/domain";
import { Box, Button, Flex, type FlexProps, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { AccountTitleBadge } from "@/components/AccountTitleBadge";
import { formatDateInFiscalYear } from "@/components/dates";
import { FileIcon } from "@/components/FileIcon";
import { TAX_CATEGORY_LABELS } from "@/components/labels";
import { MonetaryAmountText } from "@/components/MonetaryAmountText";

export interface JournalTableProps {
  transactions: Transaction[];
  /** The year the transactions belong to; decides how their dates are shortened. */
  fiscalYear: FiscalYear;
  accountTitleById: Map<string, AccountTitle>;
  partnerNameById: Map<string, string>;
  tagNameById: Map<string, string>;
  /** Called when a live transaction is clicked; a deleted one is inert. */
  onOpen(transaction: Transaction): void;
  /** Called from the supporting-documents indicator of a transaction. */
  onOpenSupportingDocuments(transaction: Transaction): void;
  /**
   * When set, the heading row sticks to the top of the scroll container at this
   * offset (the height of whatever is already stuck above it). Sticky positioning
   * needs every ancestor to leave `overflow` visible.
   */
  stickyHeadingTop?: string;
}

// The column widths shared by the heading and every transaction row. The table
// is flexbox rather than <table> so that one transaction is one row holding a
// nested table of its lines; the fixed widths (and the mirrored structure of the
// heading) are what keep the nested cells aligned with the column headings. The
// fixed cells also drop the automatic min-width, so oversized content overflows
// its cell instead of pushing the other columns out of line.
const DATE_WIDTH = "7rem";
const AMOUNT_WIDTH = "8rem";
const SUPPORTING_DOCUMENTS_WIDTH = "5.5rem";
// The lines take three parts of the flexible width and the description one.
const LINES_GROW = 3;
const DESCRIPTION_GROW = 1;

const CELL_PADDING = { px: 3, py: 3 } as const;

/**
 * The journal (仕訳帳): one row per transaction. A transaction's date,
 * description, and supporting documents belong to the whole transaction and
 * span all of its lines; the lines pair the debit postings with the credit
 * postings positionally, the way a paper journal does. Deleted transactions are
 * struck through and tinted rather than flagged in a status column.
 */
export function JournalTable({
  transactions,
  fiscalYear,
  accountTitleById,
  partnerNameById,
  tagNameById,
  onOpen,
  onOpenSupportingDocuments,
  stickyHeadingTop,
}: JournalTableProps) {
  return (
    <Box textStyle="sm" css={{ fontVariantNumeric: "lining-nums tabular-nums" }}>
      <JournalRow
        position={stickyHeadingTop === undefined ? undefined : "sticky"}
        top={stickyHeadingTop}
        zIndex={stickyHeadingTop === undefined ? undefined : 1}
        bg="bg.subtle"
        fontWeight="medium"
        borderBottomWidth="1px"
        borderColor="border"
        date="日付"
        lines={[
          {
            debitAccountTitle: "借方科目",
            debitAmount: "借方金額",
            creditAccountTitle: "貸方科目",
            creditAmount: "貸方金額",
          },
        ]}
        description="摘要 / 取引先"
        supportingDocuments="証憑"
      />
      {transactions.map((transaction) => (
        <TransactionRow
          key={transaction.id}
          transaction={transaction}
          fiscalYear={fiscalYear}
          accountTitleById={accountTitleById}
          partnerNameById={partnerNameById}
          tagNameById={tagNameById}
          onOpen={onOpen}
          onOpenSupportingDocuments={onOpenSupportingDocuments}
        />
      ))}
    </Box>
  );
}

function TransactionRow({
  transaction,
  fiscalYear,
  accountTitleById,
  partnerNameById,
  tagNameById,
  onOpen,
  onOpenSupportingDocuments,
}: Omit<JournalTableProps, "transactions" | "stickyHeadingTop"> & {
  transaction: Transaction;
}) {
  const { deleted } = transaction;

  const accountTitleCell = (posting: Posting | null) => {
    if (!posting) return null;
    const accountTitle = accountTitleById.get(posting.accountTitleId);
    return (
      <Stack gap={0.5} align="flex-start">
        {accountTitle ? (
          <AccountTitleBadge name={accountTitle.name} category={accountTitle.category} />
        ) : (
          posting.accountTitleId
        )}
        {posting.taxCategory && (
          <Text fontSize="10px" color="fg.muted">
            {TAX_CATEGORY_LABELS[posting.taxCategory.code]}
          </Text>
        )}
        {posting.memo && (
          <Text fontSize="xs" color="fg.muted">
            {posting.memo}
          </Text>
        )}
      </Stack>
    );
  };
  const amountCell = (posting: Posting | null) =>
    posting ? <MonetaryAmountText value={posting.amount.value} /> : null;

  return (
    <JournalRow
      aria-label={deleted ? "取消済の仕訳" : undefined}
      onClick={() => !deleted && onOpen(transaction)}
      cursor={deleted ? "default" : "pointer"}
      _hover={deleted ? undefined : { bg: "bg.muted" }}
      borderBottomWidth="1px"
      borderColor="border"
      _last={{ borderBottomWidth: 0 }}
      // A deleted transaction: every line struck through, the text greyed, and
      // the row tinted so it reads as cancelled even from a distance.
      {...(deleted && {
        bg: "bg.error",
        color: "fg.muted",
        textDecoration: "line-through",
        textDecorationColor: "fg.error",
        // Badges are atomic inline boxes, which the strike does not reach on its own.
        css: {
          "& .chakra-badge": {
            textDecoration: "line-through",
            textDecorationColor: "fg.error",
            opacity: 0.7,
          },
        },
      })}
      date={
        <Text as="span" fontFamily="mono" color="fg.muted">
          {formatDateInFiscalYear(transaction.date, fiscalYear)}
        </Text>
      }
      lines={pairPostings(transaction.postings).map((line) => ({
        debitAccountTitle: accountTitleCell(line.debit),
        debitAmount: amountCell(line.debit),
        creditAccountTitle: accountTitleCell(line.credit),
        creditAmount: amountCell(line.credit),
      }))}
      description={
        <>
          {transaction.description}
          {transaction.partners.length > 0 && (
            <Text as="span" fontSize="xs" color="fg.muted">
              {" "}
              /{" "}
              {transaction.partners
                .map((id) => partnerNameById.get(id) ?? id)
                .join("、")}
            </Text>
          )}
          {transaction.tags.length > 0 && (
            <Text as="span" fontSize="xs" color="fg.info">
              {" "}
              {transaction.tags
                .map((id) => `#${tagNameById.get(id) ?? id}`)
                .join(" ")}
            </Text>
          )}
        </>
      }
      supportingDocuments={
        <SupportingDocumentIndicator
          count={transaction.supportingDocumentIds.length}
          onClick={() => onOpenSupportingDocuments(transaction)}
        />
      }
    />
  );
}

/** The cells of one line of the nested table: a debit posting beside a credit posting. */
interface LineSlots {
  debitAccountTitle: ReactNode;
  debitAmount: ReactNode;
  creditAccountTitle: ReactNode;
  creditAmount: ReactNode;
}

/**
 * One row of the journal, laid out identically whether it holds the column
 * headings or a transaction: the transaction-level cells (date, description,
 * supporting documents) beside a nested table with one line per posting pair.
 * The supporting documents are centered vertically so they visibly belong to
 * every line at once.
 */
function JournalRow({
  date,
  lines,
  description,
  supportingDocuments,
  ...rowProps
}: {
  date: ReactNode;
  lines: LineSlots[];
  description: ReactNode;
  supportingDocuments: ReactNode;
} & Omit<FlexProps, "children">) {
  return (
    <Flex align="stretch" {...rowProps}>
      <Box flex={`0 0 ${DATE_WIDTH}`} minW={0} {...CELL_PADDING} whiteSpace="nowrap">
        {date}
      </Box>
      <Stack flex={`${LINES_GROW} 1 0`} minW={0} gap={0}>
        {lines.map((line, i) => (
          <Flex key={i}>
            <Box flex="1 1 0" minW={0} {...CELL_PADDING}>
              {line.debitAccountTitle}
            </Box>
            <Box
              flex={`0 0 ${AMOUNT_WIDTH}`}
              minW={0}
              {...CELL_PADDING}
              textAlign="right"
              fontFamily="mono"
            >
              {line.debitAmount}
            </Box>
            <Box flex="1 1 0" minW={0} {...CELL_PADDING}>
              {line.creditAccountTitle}
            </Box>
            <Box
              flex={`0 0 ${AMOUNT_WIDTH}`}
              minW={0}
              {...CELL_PADDING}
              textAlign="right"
              fontFamily="mono"
            >
              {line.creditAmount}
            </Box>
          </Flex>
        ))}
      </Stack>
      <Box flex={`${DESCRIPTION_GROW} 1 0`} minW="10rem" {...CELL_PADDING}>
        {description}
      </Box>
      <Flex
        flex={`0 0 ${SUPPORTING_DOCUMENTS_WIDTH}`}
        minW={0}
        {...CELL_PADDING}
        align="center"
        justify="center"
      >
        {supportingDocuments}
      </Flex>
    </Flex>
  );
}

/**
 * Whether a transaction has supporting documents, and how many, at a glance;
 * clicking opens them. With none yet it reads as the action to add one, so it
 * still looks clickable. Stops the click so the row does not open the transaction.
 */
function SupportingDocumentIndicator({
  count,
  onClick,
}: {
  count: number;
  onClick(): void;
}) {
  const label = count > 0 ? `証憑 ${count}件` : "証憑を追加";
  return (
    <Button
      size="2xs"
      variant={count > 0 ? "subtle" : "outline"}
      aria-label={label}
      title={label}
      textDecoration="none"
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
 * compound transaction renders as several lines the way a paper 仕訳帳 does. */
interface JournalLine {
  debit: Posting | null;
  credit: Posting | null;
}

function pairPostings(postings: Posting[]): JournalLine[] {
  const debits = postings.filter((posting) => posting.side === "debit");
  const credits = postings.filter((posting) => posting.side === "credit");
  const lineCount = Math.max(debits.length, credits.length, 1);
  const lines: JournalLine[] = [];
  for (let i = 0; i < lineCount; i++) {
    lines.push({ debit: debits[i] ?? null, credit: credits[i] ?? null });
  }
  return lines;
}
