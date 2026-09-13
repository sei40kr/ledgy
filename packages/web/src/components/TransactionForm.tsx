"use client";

import {
  type AccountTitle,
  type AccountTitleId,
  calcPostingTotals,
  type FiscalYear,
  MonetaryAmount,
  type Partner,
  type PartnerId,
  type Posting,
  type PostingSide,
  type SubAccountTitle,
  type SubAccountTitleId,
  type Tag,
  type TagId,
  TaxCategory,
  type TaxCategoryCode,
  TAX_CATEGORY_CODES,
  type TenantId,
} from "@account-ledgers/domain";
import {
  Alert,
  Badge,
  Box,
  Button,
  Field,
  Flex,
  HStack,
  Input,
  NativeSelect,
  Spacer,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type Control,
  Controller,
  useFieldArray,
  useForm,
  type UseFormRegister,
  type UseFormSetValue,
  useWatch,
} from "react-hook-form";
import type { TransactionDraft } from "@account-ledgers/usecases";
import { DateField } from "@/components/DateField";
import { MonetaryAmountText } from "@/components/MonetaryAmountText";
import { EntityMultiSelect } from "@/components/EntityMultiSelect";
import {
  MonetaryAmountInput,
  parseMonetaryAmountInput,
} from "@/components/MonetaryAmountInput";
import { SearchableSelect } from "@/components/SearchableSelect";
import { TAX_CATEGORY_LABELS } from "@/components/labels";
import { formatDate, parseDateInput } from "@/components/dates";
import { usecases } from "@account-ledgers/infrastructure/container";
import { toDisplayMessage } from "@/components/errorMessages";

/** One posting line on a single side (debit or credit). */
interface Line {
  accountId: string;
  subAccountId: string;
  amount: string;
  /** TaxCategoryCode, or "" for no tax category. */
  taxCategory: string;
  memo: string;
}

const EMPTY_LINE: Line = {
  accountId: "",
  subAccountId: "",
  amount: "",
  taxCategory: "",
  memo: "",
};

export interface TransactionFormValues {
  date: string;
  partners: string[];
  tags: string[];
  debits: Line[];
  credits: Line[];
}

/** Rebuild form values from a saved revision, splitting its postings back into the two sides. */
export function draftToFormValues(draft: {
  date: Date;
  partners: string[];
  tags: string[];
  postings: Posting[];
}): TransactionFormValues {
  const toLines = (side: PostingSide): Line[] => {
    const lines = draft.postings
      .filter((posting) => posting.side === side)
      .map((posting) => ({
        accountId: posting.accountTitleId,
        subAccountId: posting.subAccountTitleId ?? "",
        amount: String(posting.amount.value),
        taxCategory: posting.taxCategory?.code ?? "",
        memo: posting.memo ?? "",
      }));
    return lines.length > 0 ? lines : [EMPTY_LINE];
  };
  return {
    date: formatDate(draft.date),
    partners: draft.partners,
    tags: draft.tags,
    debits: toLines("debit"),
    credits: toLines("credit"),
  };
}

/**
 * The lines whose amount already parses, for the live totals: a blank or
 * half-typed amount counts as nothing until it does.
 */
function typedAmounts(
  lines: Line[],
  side: PostingSide,
): Pick<Posting, "side" | "amount">[] {
  return lines.flatMap((line) => {
    const amount = parseMonetaryAmountInput(line.amount);
    return amount ? [{ side, amount }] : [];
  });
}

/** Clamps a YYYY-MM-DD value into [min, max]; lexical compare is chronological. */
function clampDate(value: string, min?: string, max?: string): string {
  if (min && value < min) return min;
  if (max && value > max) return max;
  return value;
}

function linesToPostings(lines: Line[], side: PostingSide): Posting[] {
  const postings: Posting[] = [];
  for (const line of lines) {
    if (line.accountId === "" && line.amount === "") continue;
    postings.push({
      side,
      accountTitleId: line.accountId as AccountTitleId,
      subAccountTitleId: line.subAccountId
        ? (line.subAccountId as SubAccountTitleId)
        : null,
      amount: new MonetaryAmount(Number(line.amount)),
      taxCategory: line.taxCategory
        ? new TaxCategory(line.taxCategory as TaxCategoryCode)
        : null,
      memo: line.memo.trim(),
    });
  }
  return postings;
}

export function TransactionForm({
  tenantId,
  accountTitles,
  initialValues,
  mode,
  disabled = false,
  fiscalYear,
  submitLabel,
  resetAfterSubmit,
  onSubmit,
  onDelete,
  onCancel,
}: {
  tenantId: TenantId;
  accountTitles: AccountTitle[];
  initialValues?: TransactionFormValues;
  mode: "create" | "edit";
  /** True for a closed fiscal year: the form is read-only. */
  disabled?: boolean;
  /** The fiscal year: bounds and year-display for the transaction date. */
  fiscalYear?: FiscalYear | null;
  submitLabel: string;
  /** Clear the postings after a successful save so the user can keep entering, used by the new-transaction page. */
  resetAfterSubmit: boolean;
  onSubmit(draft: TransactionDraft): Promise<void>;
  onDelete?(): Promise<void>;
  onCancel?(): void;
}) {
  const minDate = fiscalYear ? formatDate(fiscalYear.startDate) : undefined;
  const maxDate = fiscalYear ? formatDate(fiscalYear.endDate) : undefined;
  // toLocaleDateString("sv-SE") is local time, avoiding the UTC day-off that toISOString() causes in JST.
  // Clamp the default to the fiscal year so a new transaction always starts in range.
  const today = clampDate(
    new Date().toLocaleDateString("sv-SE"),
    minDate,
    maxDate,
  );
  const emptyValues: TransactionFormValues = {
    date: today,
    partners: [],
    tags: [],
    debits: [EMPTY_LINE],
    credits: [EMPTY_LINE],
  };
  const {
    register,
    control,
    handleSubmit,
    reset,
    setFocus,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<TransactionFormValues>({
    defaultValues: initialValues ?? emptyValues,
  });
  const debitArray = useFieldArray({ control, name: "debits" });
  const creditArray = useFieldArray({ control, name: "credits" });
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // The partner list backs the partner picker; custom entries create a partner.
  const [partnerList, setPartnerList] = useState<Partner[]>([]);
  useEffect(() => {
    let active = true;
    usecases.partners
      .list(tenantId)
      .then((ps) => {
        if (active) setPartnerList(ps);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [tenantId]);
  const createPartner = async (name: string): Promise<Partner> => {
    const id = await usecases.partners.create({ tenantId, name, searchWords: [] });
    const partner: Partner = { id, name, searchWords: [] };
    setPartnerList((prev) => [...prev, partner]);
    return partner;
  };

  // The tag list backs the tag picker; custom entries create a tag.
  const [tagList, setTagList] = useState<Tag[]>([]);
  useEffect(() => {
    let active = true;
    usecases.tags
      .list(tenantId)
      .then((ts) => {
        if (active) setTagList(ts);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [tenantId]);
  const createTag = async (name: string): Promise<Tag> => {
    const id = await usecases.tags.create({ tenantId, name, searchWords: [] });
    const tag: Tag = { id, name, searchWords: [] };
    setTagList((prev) => [...prev, tag]);
    return tag;
  };

  const activeAccounts = useMemo(
    () => accountTitles.filter((a) => a.isActive),
    [accountTitles],
  );

  // Watch the lines so the totals and the save button update as amounts change.
  const debits = watch("debits");
  const credits = watch("credits");
  const totals = calcPostingTotals([
    ...typedAmounts(debits, "debit"),
    ...typedAmounts(credits, "credit"),
  ]);
  const balanced = totals.difference === 0 && totals.debitTotal > 0;
  const canSubmit = balanced && !isSubmitting && !deleting && !disabled;

  const submit = handleSubmit(async (data) => {
    setError(null);
    try {
      await onSubmit({
        date: parseDateInput(data.date),
        partners: data.partners as PartnerId[],
        tags: data.tags as TagId[],
        postings: [
          ...linesToPostings(data.debits, "debit"),
          ...linesToPostings(data.credits, "credit"),
        ],
      });
      if (resetAfterSubmit) {
        reset(emptyValues);
        setFocus("date");
      }
    } catch (e) {
      setError(toDisplayMessage(e, "保存に失敗しました"));
    }
  });

  async function handleDelete() {
    if (!onDelete) return;
    setError(null);
    setDeleting(true);
    try {
      await onDelete();
    } catch (e) {
      setError(toDisplayMessage(e, "削除に失敗しました"));
      setDeleting(false);
    }
  }

  // Ctrl+Enter (or Cmd+Enter on macOS) saves. Listen on the document so it works even when focus is outside the form.
  const submitRef = useRef<() => void>(() => {});
  submitRef.current = () => {
    if (canSubmit) void submit();
  };
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        submitRef.current();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const balanceLabel =
    totals.debitTotal === 0 && totals.creditTotal === 0
      ? "金額を入力してください"
      : balanced
        ? "貸借一致"
        : `差額 ${Math.abs(totals.difference).toLocaleString()} 円`;

  return (
    <Box
      as="form"
      onSubmit={submit}
      bg="bg.panel"
      borderWidth="1px"
      borderColor="border"
      rounded="lg"
      overflow="hidden"
    >
      <Flex
        align="center"
        px={5}
        py={4}
        borderBottomWidth="1px"
        borderColor="border"
      >
        <Text fontSize="15px" fontWeight="semibold">
          振替伝票
        </Text>
      </Flex>

      <Stack gap={6} px={5} py={5}>
        {error && (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Title>{error}</Alert.Title>
          </Alert.Root>
        )}

        <Field.Root maxW="14rem">
          <Field.Label>取引日</Field.Label>
          <Controller
            control={control}
            name="date"
            rules={{ required: true }}
            render={({ field }) => (
              <DateField
                value={field.value}
                onChange={field.onChange}
                min={minDate}
                max={maxDate}
                fiscalYear={fiscalYear}
                disabled={disabled}
              />
            )}
          />
        </Field.Root>

        <PostingSection
          label="借方"
          hint="資産の増加・費用の発生"
          total={totals.debitTotal}
          name="debits"
          fields={debitArray.fields}
          append={debitArray.append}
          remove={debitArray.remove}
          register={register}
          control={control}
          setValue={setValue}
          tenantId={tenantId}
          accountTitles={activeAccounts}
          disabled={disabled}
        />
        <PostingSection
          label="貸方"
          hint="資産の減少・収益の発生"
          total={totals.creditTotal}
          name="credits"
          fields={creditArray.fields}
          append={creditArray.append}
          remove={creditArray.remove}
          register={register}
          control={control}
          setValue={setValue}
          tenantId={tenantId}
          accountTitles={activeAccounts}
          disabled={disabled}
        />

        <Field.Root maxW="24rem">
          <Field.Label>取引先(任意)</Field.Label>
          <Controller
            control={control}
            name="partners"
            render={({ field }) => (
              <EntityMultiSelect
                items={partnerList}
                value={field.value}
                onChange={field.onChange}
                onCreate={createPartner}
                placeholder="取引先を検索・追加"
                disabled={disabled}
              />
            )}
          />
        </Field.Root>

        <Field.Root maxW="24rem">
          <Field.Label>タグ(任意)</Field.Label>
          <Controller
            control={control}
            name="tags"
            render={({ field }) => (
              <EntityMultiSelect
                items={tagList}
                value={field.value}
                onChange={field.onChange}
                onCreate={createTag}
                placeholder="タグを検索・追加"
                disabled={disabled}
              />
            )}
          />
        </Field.Root>
      </Stack>

      <Flex
        align="center"
        gap={4}
        px={5}
        py={4}
        borderTopWidth="1px"
        borderColor="border"
        bg="bg.subtle"
        flexWrap="wrap"
      >
        <Badge
          size="md"
          colorPalette={balanced ? "green" : "gray"}
          variant={balanced ? "solid" : "subtle"}
        >
          {balanceLabel}
        </Badge>
        <Spacer />
        <HStack gap={3}>
          <Text fontSize="xs" color="fg.muted">
            Ctrl+Enter で保存
          </Text>
          {mode === "edit" && onDelete && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              colorPalette="red"
              disabled={disabled || isSubmitting}
              loading={deleting}
              onClick={handleDelete}
            >
              この仕訳を削除
            </Button>
          )}
          {mode === "edit" && onCancel && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isSubmitting || deleting}
              onClick={onCancel}
            >
              キャンセル
            </Button>
          )}
          <Button type="submit" size="sm" disabled={!canSubmit} loading={isSubmitting}>
            {submitLabel}
          </Button>
        </HStack>
      </Flex>
    </Box>
  );
}

function PostingSection({
  label,
  hint,
  total,
  name,
  fields,
  append,
  remove,
  register,
  control,
  setValue,
  tenantId,
  accountTitles,
  disabled,
}: {
  label: string;
  hint: string;
  total: number;
  name: "debits" | "credits";
  fields: { id: string }[];
  append: (value: Line) => void;
  remove: (index: number) => void;
  register: UseFormRegister<TransactionFormValues>;
  control: Control<TransactionFormValues>;
  setValue: UseFormSetValue<TransactionFormValues>;
  tenantId: TenantId;
  accountTitles: AccountTitle[];
  disabled: boolean;
}) {
  return (
    <Stack gap={2}>
      <HStack align="baseline" gap={2}>
        <Text fontSize="16px" fontWeight="semibold">
          {label}
        </Text>
        <Text fontSize="11px" color="fg.subtle">
          {hint}
        </Text>
        <Spacer />
        <Text fontSize="15px" fontWeight="semibold" fontFamily="mono">
          <MonetaryAmountText value={total} />
        </Text>
      </HStack>
      <Table.Root size="sm">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>勘定科目</Table.ColumnHeader>
            <Table.ColumnHeader w="9rem" textAlign="right">
              金額
            </Table.ColumnHeader>
            <Table.ColumnHeader w="10rem">税区分</Table.ColumnHeader>
            <Table.ColumnHeader>摘要</Table.ColumnHeader>
            <Table.ColumnHeader w="3rem" />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {fields.map((field, index) => (
            <PostingRow
              key={field.id}
              name={name}
              index={index}
              register={register}
              control={control}
              setValue={setValue}
              tenantId={tenantId}
              accountTitles={accountTitles}
              disabled={disabled}
              canRemove={fields.length > 1}
              onRemove={() => remove(index)}
            />
          ))}
        </Table.Body>
      </Table.Root>
      <Button
        type="button"
        size="xs"
        variant="outline"
        borderStyle="dashed"
        color="fg.muted"
        alignSelf="flex-start"
        disabled={disabled}
        onClick={() => append(EMPTY_LINE)}
      >
        ＋ {label}の行を追加
      </Button>
    </Stack>
  );
}

/**
 * One posting row: the account title picker, plus a sub account title picker that
 * appears only once an account with sub account titles is chosen. The chosen
 * account's sub account titles are loaded lazily, and picking a different account
 * clears any stale sub account selection.
 */
function PostingRow({
  name,
  index,
  register,
  control,
  setValue,
  tenantId,
  accountTitles,
  disabled,
  canRemove,
  onRemove,
}: {
  name: "debits" | "credits";
  index: number;
  register: UseFormRegister<TransactionFormValues>;
  control: Control<TransactionFormValues>;
  setValue: UseFormSetValue<TransactionFormValues>;
  tenantId: TenantId;
  accountTitles: AccountTitle[];
  disabled: boolean;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const accountId = useWatch({ control, name: `${name}.${index}.accountId` });
  const [subAccountTitles, setSubAccountTitles] = useState<SubAccountTitle[]>([]);

  useEffect(() => {
    let active = true;
    if (!accountId) {
      setSubAccountTitles([]);
      return;
    }
    usecases.accountTitles
      .listSubAccounts(tenantId, accountId as AccountTitleId)
      .then((subs) => {
        if (active) setSubAccountTitles(subs.filter((s) => s.isActive));
      })
      .catch(() => {
        if (active) setSubAccountTitles([]);
      });
    return () => {
      active = false;
    };
  }, [accountId, tenantId]);

  return (
    <Table.Row>
      <Table.Cell>
        <Stack gap={1.5}>
          <Controller
            control={control}
            name={`${name}.${index}.accountId`}
            render={({ field }) => (
              <SearchableSelect
                items={accountTitles}
                value={field.value}
                onChange={(id) => {
                  field.onChange(id);
                  // A different account title invalidates the sub account choice.
                  setValue(`${name}.${index}.subAccountId`, "");
                }}
                disabled={disabled}
                placeholder="科目を検索"
              />
            )}
          />
          {subAccountTitles.length > 0 && (
            <Controller
              control={control}
              name={`${name}.${index}.subAccountId`}
              render={({ field }) => (
                <SearchableSelect
                  items={subAccountTitles}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                  placeholder="補助科目を検索"
                />
              )}
            />
          )}
        </Stack>
      </Table.Cell>
      <Table.Cell verticalAlign="top">
        <Controller
          control={control}
          name={`${name}.${index}.amount`}
          render={({ field: amount }) => (
            <MonetaryAmountInput
              size="sm"
              placeholder="0"
              disabled={disabled}
              value={amount.value}
              onChange={(e) =>
                amount.onChange(e.target.value.replace(/[^0-9]/g, ""))
              }
            />
          )}
        />
      </Table.Cell>
      <Table.Cell verticalAlign="top">
        <NativeSelect.Root size="sm" disabled={disabled}>
          <NativeSelect.Field {...register(`${name}.${index}.taxCategory`)}>
            <option value="">(なし)</option>
            {TAX_CATEGORY_CODES.map((code) => (
              <option key={code} value={code}>
                {TAX_CATEGORY_LABELS[code]}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Table.Cell>
      <Table.Cell verticalAlign="top">
        <Input
          size="sm"
          placeholder="摘要を入力"
          disabled={disabled}
          {...register(`${name}.${index}.memo`)}
        />
      </Table.Cell>
      <Table.Cell textAlign="right" verticalAlign="top">
        {canRemove && (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            color="fg.subtle"
            disabled={disabled}
            aria-label="行を削除"
            onClick={onRemove}
          >
            ×
          </Button>
        )}
      </Table.Cell>
    </Table.Row>
  );
}
