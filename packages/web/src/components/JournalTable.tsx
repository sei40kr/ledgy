"use client";

import type {
  AccountTitle,
  FiscalYear,
  Posting,
  Transaction,
} from "@account-ledgers/domain";
import {
  Badge,
  Box,
  type BoxProps,
  Button,
  Flex,
  type FlexProps,
  Stack,
  Text,
} from "@chakra-ui/react";
import type { ReactNode } from "react";
import { AccountTitleBadge } from "@/components/AccountTitleBadge";
import { formatDateInFiscalYear } from "@/components/dates";
import { FileIcon } from "@/components/FileIcon";
import { TAX_CATEGORY_LABELS } from "@/components/labels";
import { MonetaryAmountText } from "@/components/MonetaryAmountText";
import { PartnerIcon } from "@/components/PartnerIcon";
import { TagIcon } from "@/components/TagIcon";

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
  /**
   * Padding outside the first and the last column, so the text lines up with
   * whatever the container puts above the table. Defaults to the padding of a
   * panel card's own header.
   */
  insetX?: BoxProps["px"];
}

// The column widths shared by the heading and every transaction row. The table
// is flexbox rather than <table> so that one transaction is one row holding a
// nested table of its lines; the fixed widths (and the mirrored structure of the
// heading) are what keep the nested cells aligned with the column headings. The
// fixed cells also drop the automatic min-width, so oversized content overflows
// its cell instead of pushing the other columns out of line.
const DATE_WIDTH = "6.5rem";
const AMOUNT_WIDTH = "7.5rem";
const SUPPORTING_DOCUMENTS_WIDTH = "5.5rem";
// Inside one side (debit or credit), the account title takes this much of the
// flexible width and the memo one; the amount is fixed.
const ACCOUNT_TITLE_GROW = 1.4;
const MEMO_GROW = 1;

const CELL_PADDING = { px: 3, py: 3 } as const;
const HEADING_CELL_PADDING = { px: 3, py: 2 } as const;
const DEFAULT_INSET_X = 5;

// Only the heading is ruled into its column groups — 日付 | 借方 | 貸方 | 証憑.
// Every rule lives on the left edge of the group it opens, and both heading tiers
// apply it, which is what keeps them on one vertical line. The body rows are left
// unruled so the lines of one transaction read as a single block.
const HEADING_DIVIDER = { borderLeftWidth: "1px", borderColor: "border" } as const;

/**
 * The journal (仕訳帳): one row per transaction. A transaction's date,
 * supporting documents, description, and partner / tag badges belong to the
 * whole transaction and span all of its lines; the lines pair the debit
 * postings with the credit postings positionally, the way a paper journal does,
 * each side carrying its own account title, amount, and memo. Deleted
 * transactions are struck through and tinted rather than flagged in a status
 * column.
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
  insetX = DEFAULT_INSET_X,
}: JournalTableProps) {
  return (
    <Box textStyle="sm" css={{ fontVariantNumeric: "lining-nums tabular-nums" }}>
      <JournalHeading insetX={insetX} stickyTop={stickyHeadingTop} />
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
          insetX={insetX}
        />
      ))}
    </Box>
  );
}

/**
 * The column headings, in two tiers: 借方 and 貸方 each span the three columns
 * of their side, which the tier below names. The date and the supporting
 * documents head both tiers at once.
 */
function JournalHeading({
  insetX,
  stickyTop,
}: {
  insetX: BoxProps["px"];
  stickyTop: string | undefined;
}) {
  return (
    <RowFrame
      insetX={insetX}
      position={stickyTop === undefined ? undefined : "sticky"}
      top={stickyTop}
      zIndex={stickyTop === undefined ? undefined : 1}
      bg="bg.subtle"
      fontWeight="medium"
      borderBottomWidth="1px"
      borderColor="border"
      dateAlign="center"
      divided
      date="日付"
      supportingDocuments="証憑"
    >
      <Flex borderBottomWidth="1px" borderColor="border" color="fg.muted">
        <Box flex="1 1 0" minW={0} {...HEADING_CELL_PADDING} textAlign="center">
          借方
        </Box>
        <Box
          flex="1 1 0"
          minW={0}
          {...HEADING_CELL_PADDING}
          {...HEADING_DIVIDER}
          textAlign="center"
        >
          貸方
        </Box>
      </Flex>
      <Flex>
        <SideCells
          padding={HEADING_CELL_PADDING}
          accountTitle="科目"
          amount="金額"
          memo="摘要"
        />
        <SideCells
          divided
          padding={HEADING_CELL_PADDING}
          accountTitle="科目"
          amount="金額"
          memo="摘要"
        />
      </Flex>
    </RowFrame>
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
  insetX,
}: Omit<JournalTableProps, "transactions" | "stickyHeadingTop" | "insetX"> & {
  transaction: Transaction;
  insetX: BoxProps["px"];
}) {
  const { deleted, partners, tags } = transaction;

  const accountTitleCell = (posting: Posting | null) => {
    if (!posting) return null;
    const accountTitle = accountTitleById.get(posting.accountTitleId);
    return accountTitle ? (
      <AccountTitleBadge name={accountTitle.name} category={accountTitle.category} />
    ) : (
      posting.accountTitleId
    );
  };
  // The tax category sits under the amount it applies to, where the rate reads
  // as an annotation of the figure rather than of the account title.
  const amountCell = (posting: Posting | null) =>
    posting && (
      <Stack gap={0.5} align="flex-end">
        <Text as="span" fontFamily="mono">
          <MonetaryAmountText value={posting.amount.value} />
        </Text>
        {posting.taxCategory && (
          <Text fontSize="xs" color="fg.muted">
            {TAX_CATEGORY_LABELS[posting.taxCategory.code]}
          </Text>
        )}
      </Stack>
    );
  const memoCell = (posting: Posting | null) =>
    posting?.memo ? (
      <Text color="fg.muted" wordBreak="break-word">
        {posting.memo}
      </Text>
    ) : null;

  const hasBadges = partners.length > 0 || tags.length > 0;

  return (
    <RowFrame
      insetX={insetX}
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
      supportingDocuments={
        <SupportingDocumentIndicator
          count={transaction.supportingDocumentIds.length}
          onClick={() => onOpenSupportingDocuments(transaction)}
        />
      }
    >
      {pairPostings(transaction.postings).map((line, i) => (
        <Flex key={i}>
          <SideCells
            accountTitle={accountTitleCell(line.debit)}
            amount={amountCell(line.debit)}
            memo={memoCell(line.debit)}
          />
          <SideCells
            accountTitle={accountTitleCell(line.credit)}
            amount={amountCell(line.credit)}
            memo={memoCell(line.credit)}
          />
        </Flex>
      ))}
      {hasBadges && (
        <Flex {...CELL_PADDING} pt={0} gap={2} align="center" flexWrap="wrap">
          {partners.map((id) => (
            <EntityBadge key={id} icon={<PartnerIcon boxSize="11px" />}>
              {partnerNameById.get(id) ?? id}
            </EntityBadge>
          ))}
          {tags.map((id) => (
            <EntityBadge key={id} icon={<TagIcon boxSize="11px" />}>
              {tagNameById.get(id) ?? id}
            </EntityBadge>
          ))}
        </Flex>
      )}
    </RowFrame>
  );
}

/**
 * One row of the journal, laid out identically whether it holds the column
 * headings or a transaction: the transaction-level cells (date, supporting
 * documents) on the outside, and whatever spans every line in between. The
 * supporting documents are centered vertically so they visibly belong to every
 * line at once.
 */
function RowFrame({
  date,
  supportingDocuments,
  insetX,
  dateAlign = "flex-start",
  divided = false,
  children,
  ...rowProps
}: {
  date: ReactNode;
  supportingDocuments: ReactNode;
  insetX: BoxProps["px"];
  dateAlign?: FlexProps["align"];
  /** Rules the row into its column groups. The heading alone is ruled. */
  divided?: boolean;
  children: ReactNode;
} & Omit<FlexProps, "children">) {
  return (
    <Flex align="stretch" {...rowProps}>
      <Flex
        flex={`0 0 ${DATE_WIDTH}`}
        minW={0}
        {...CELL_PADDING}
        pl={insetX}
        align={dateAlign}
        whiteSpace="nowrap"
        {...(divided && { borderRightWidth: "1px", borderColor: "border" })}
      >
        {date}
      </Flex>
      <Stack flex="1 1 0" minW={0} gap={0}>
        {children}
      </Stack>
      <Flex
        flex={`0 0 ${SUPPORTING_DOCUMENTS_WIDTH}`}
        minW={0}
        {...CELL_PADDING}
        pr={insetX}
        align="center"
        justify="center"
        {...(divided && HEADING_DIVIDER)}
      >
        {supportingDocuments}
      </Flex>
    </Flex>
  );
}

/** The three cells of one side of a line — or of the tier that heads them. */
function SideCells({
  accountTitle,
  amount,
  memo,
  divided = false,
  padding = CELL_PADDING,
}: {
  accountTitle: ReactNode;
  amount: ReactNode;
  memo: ReactNode;
  /** Opens the side with a rule. The heading alone is ruled. */
  divided?: boolean;
  padding?: Pick<BoxProps, "px" | "py">;
}) {
  return (
    <Flex flex="1 1 0" minW={0} {...(divided && HEADING_DIVIDER)}>
      <Box flex={`${ACCOUNT_TITLE_GROW} 1 0`} minW={0} {...padding}>
        {accountTitle}
      </Box>
      <Box flex={`0 0 ${AMOUNT_WIDTH}`} minW={0} {...padding} textAlign="right">
        {amount}
      </Box>
      <Box flex={`${MEMO_GROW} 1 0`} minW={0} {...padding}>
        {memo}
      </Box>
    </Flex>
  );
}

/** A partner or a tag of the transaction, told apart by its icon. */
function EntityBadge({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <Badge variant="outline" size="sm" gap={1} color="fg.muted">
      {icon}
      {children}
    </Badge>
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
