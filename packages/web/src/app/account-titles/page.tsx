"use client";

import {
  ACCOUNT_TITLE_CATEGORIES,
  type AccountTitleId,
  type TenantId,
  type AccountTitle,
  type AccountTitleCategory,
  type SubAccountTitle,
} from "@account-ledgers/domain";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Dialog,
  Field,
  Flex,
  HStack,
  Input,
  NativeSelect,
  Portal,
  Spinner,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { AppShell } from "@/components/AppShell";
import { CategoryBadge } from "@/components/CategoryBadge";
import { SearchWordsInput } from "@/components/SearchWordsInput";
import { TableCard } from "@/components/TableCard";
import { ACCOUNT_TITLE_CATEGORY_LABELS } from "@/components/labels";
import { useAccountTitles } from "@/hooks/useAccountTitles";
import { useAuth } from "@/hooks/useAuth";
import { usecases } from "@account-ledgers/infrastructure/container";
import { toDisplayMessage } from "@/components/errorMessages";
import { normalizeSearchWords } from "@/components/searchWords";

interface AccountFormState {
  accountTitleId: string | null; // null means "create new"
  name: string;
  category: AccountTitleCategory;
  searchWords: string[];
}

type AccountFormValues = Omit<AccountFormState, "accountTitleId">;

export default function AccountsPage() {
  return (
    <AppShell>
      <AccountsContent />
    </AppShell>
  );
}

function AccountsContent() {
  const { tenantId } = useAuth();
  const { accountTitles, loading, reload } = useAccountTitles();
  const [showInactive, setShowInactive] = useState(false);
  const [form, setForm] = useState<AccountFormState | null>(null);
  const [subAccountTarget, setSubAccountTarget] = useState<AccountTitle | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  if (!tenantId) return null;

  const visibleAccounts = showInactive
    ? accountTitles
    : accountTitles.filter((a) => a.isActive);

  async function handleToggleActive(accountTitle: AccountTitle) {
    if (!tenantId) return;
    setError(null);
    try {
      await usecases.accountTitles.setActive({
        tenantId,
        accountTitleId: accountTitle.id,
        isActive: !accountTitle.isActive,
      });
      await reload();
    } catch (e) {
      setError(toDisplayMessage(e, "更新に失敗しました"));
    }
  }

  return (
    <Stack gap={4}>
      <Flex justify="flex-end" align="center">
        <HStack gap={4}>
          <Checkbox.Root
            checked={showInactive}
            onCheckedChange={(e) => setShowInactive(!!e.checked)}
            size="sm"
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control bg="bg.panel" />
            <Checkbox.Label>無効な科目も表示</Checkbox.Label>
          </Checkbox.Root>
          <Button
            size="sm"
            onClick={() =>
              setForm({
                accountTitleId: null,
                name: "",
                category: "expense",
                searchWords: [],
              })
            }
          >
            科目を追加
          </Button>
        </HStack>
      </Flex>

      {error && (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Title>{error}</Alert.Title>
        </Alert.Root>
      )}

      {loading ? (
        <Spinner />
      ) : (
        <TableCard>
        <Table.Root size="sm" variant="outline" borderWidth={0}>
          <Table.Header>
            <Table.Row bg="bg.subtle">
              <Table.ColumnHeader>科目名</Table.ColumnHeader>
              <Table.ColumnHeader w="6rem">区分</Table.ColumnHeader>
              <Table.ColumnHeader w="5rem">状態</Table.ColumnHeader>
              <Table.ColumnHeader w="16rem">操作</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {visibleAccounts.map((accountTitle) => (
              <Table.Row key={accountTitle.id} opacity={accountTitle.isActive ? 1 : 0.5}>
                <Table.Cell>{accountTitle.name}</Table.Cell>
                <Table.Cell>
                  <CategoryBadge category={accountTitle.category} />
                </Table.Cell>
                <Table.Cell>
                  <Badge colorPalette={accountTitle.isActive ? "green" : "gray"}>
                    {accountTitle.isActive ? "有効" : "無効"}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={2}>
                    <Button
                      size="2xs"
                      variant="outline"
                      onClick={() =>
                        setForm({
                          accountTitleId: accountTitle.id,
                          name: accountTitle.name,
                          category: accountTitle.category,
                          searchWords: accountTitle.searchWords,
                        })
                      }
                    >
                      編集
                    </Button>
                    <Button
                      size="2xs"
                      variant="outline"
                      onClick={() => setSubAccountTarget(accountTitle)}
                    >
                      補助科目
                    </Button>
                    <Button
                      size="2xs"
                      variant="outline"
                      colorPalette={accountTitle.isActive ? "red" : "green"}
                      onClick={() => handleToggleActive(accountTitle)}
                    >
                      {accountTitle.isActive ? "無効化" : "有効化"}
                    </Button>
                  </HStack>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
        </TableCard>
      )}

      <Text fontSize="xs" color="fg.muted">
        科目の削除はできません(使用中の仕訳を保全するため)。使わない科目は無効化してください。
      </Text>

      {form && (
        <AccountFormDialog
          tenantId={tenantId}
          form={form}
          onClose={() => setForm(null)}
          onSaved={async () => {
            setForm(null);
            await reload();
          }}
        />
      )}
      {subAccountTarget && (
        <SubAccountsDialog
          tenantId={tenantId}
          accountTitle={subAccountTarget}
          onClose={() => setSubAccountTarget(null)}
        />
      )}
    </Stack>
  );
}

function AccountFormDialog({
  tenantId,
  form,
  onClose,
  onSaved,
}: {
  tenantId: TenantId;
  form: AccountFormState;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isNew = form.accountTitleId === null;
  const {
    register,
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<AccountFormValues>({
    defaultValues: {
      name: form.name,
      category: form.category,
      searchWords: form.searchWords,
    },
  });
  const [error, setError] = useState<string | null>(null);

  const onSubmit = handleSubmit(async (data) => {
    setError(null);
    try {
      if (isNew) {
        await usecases.accountTitles.create({
          tenantId,
          name: data.name,
          category: data.category,
          defaultTaxCategory: null,
          searchWords: normalizeSearchWords(data.searchWords),
        });
      } else {
        await usecases.accountTitles.update({
          tenantId,
          accountTitleId: form.accountTitleId as AccountTitleId,
          name: data.name,
          defaultTaxCategory: null,
          searchWords: normalizeSearchWords(data.searchWords),
        });
      }
      await onSaved();
    } catch (e) {
      setError(toDisplayMessage(e, "保存に失敗しました"));
    }
  });

  return (
    <Dialog.Root open onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content as="form" onSubmit={onSubmit}>
            <Dialog.Header>
              <Dialog.Title>
                {isNew ? "科目を追加" : "科目を編集"}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap={4}>
                {error && (
                  <Alert.Root status="error">
                    <Alert.Indicator />
                    <Alert.Title>{error}</Alert.Title>
                  </Alert.Root>
                )}
                <Field.Root required>
                  <Field.Label>科目名</Field.Label>
                  <Input autoFocus {...register("name", { required: true })} />
                </Field.Root>
                <Field.Root>
                  <Field.Label>検索ワード</Field.Label>
                  <Controller
                    control={control}
                    name="searchWords"
                    render={({ field }) => (
                      <SearchWordsInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="入力してEnter"
                      />
                    )}
                  />
                  <Field.HelperText>
                    科目の入力時に名前とあわせて検索対象になります
                  </Field.HelperText>
                </Field.Root>
                {/* The category is fixed once the account title exists, to keep its transactions consistent. */}
                {isNew && (
                  <Field.Root>
                    <Field.Label>区分</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field {...register("category")}>
                        {ACCOUNT_TITLE_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {ACCOUNT_TITLE_CATEGORY_LABELS[c]}
                          </option>
                        ))}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Field.Root>
                )}
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={onClose}>
                キャンセル
              </Button>
              <Button type="submit" loading={isSubmitting}>
                保存
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function SubAccountsDialog({
  tenantId,
  accountTitle,
  onClose,
}: {
  tenantId: TenantId;
  accountTitle: AccountTitle;
  onClose: () => void;
}) {
  const [subAccountTitles, setSubAccounts] = useState<SubAccountTitle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting },
  } = useForm<{ name: string; searchWords: string[] }>({
    defaultValues: { name: "", searchWords: [] },
  });

  async function reload() {
    setSubAccounts(
      await usecases.accountTitles.listSubAccounts(tenantId, accountTitle.id),
    );
  }

  if (subAccountTitles === null) {
    void reload();
  }

  const handleAdd = handleSubmit(async (data) => {
    setError(null);
    try {
      await usecases.accountTitles.createSubAccount({
        tenantId,
        accountTitleId: accountTitle.id,
        name: data.name,
        searchWords: normalizeSearchWords(data.searchWords),
      });
      reset();
      await reload();
    } catch (e) {
      setError(toDisplayMessage(e, "追加に失敗しました"));
    }
  });

  async function handleToggle(sub: SubAccountTitle) {
    setError(null);
    try {
      await usecases.accountTitles.setSubAccountActive({
        tenantId,
        accountTitleId: accountTitle.id,
        subAccountTitleId: sub.id,
        isActive: !sub.isActive,
      });
      await reload();
    } catch (e) {
      setError(toDisplayMessage(e, "更新に失敗しました"));
    }
  }

  return (
    <Dialog.Root open onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                補助科目: {accountTitle.name}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap={4}>
                {error && (
                  <Alert.Root status="error">
                    <Alert.Indicator />
                    <Alert.Title>{error}</Alert.Title>
                  </Alert.Root>
                )}
                {subAccountTitles === null ? (
                  <Spinner />
                ) : subAccountTitles.length === 0 ? (
                  <Text fontSize="sm" color="fg.muted">
                    補助科目はまだありません
                  </Text>
                ) : (
                  <Table.Root size="sm">
                    <Table.Body>
                      {subAccountTitles.map((sub) => (
                        <Table.Row key={sub.id}>
                          <Table.Cell opacity={sub.isActive ? 1 : 0.5}>
                            {sub.name}
                          </Table.Cell>
                          <Table.Cell w="5rem">
                            <Badge
                              colorPalette={sub.isActive ? "green" : "gray"}
                            >
                              {sub.isActive ? "有効" : "無効"}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell w="6rem">
                            <Button
                              size="2xs"
                              variant="outline"
                              colorPalette={sub.isActive ? "red" : "green"}
                              onClick={() => handleToggle(sub)}
                            >
                              {sub.isActive ? "無効化" : "有効化"}
                            </Button>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                )}
                <form onSubmit={handleAdd}>
                  <HStack align="flex-start">
                    <Input
                      size="sm"
                      placeholder="補助科目名"
                      {...register("name", { required: true })}
                    />
                    <Controller
                      control={control}
                      name="searchWords"
                      render={({ field }) => (
                        <SearchWordsInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="検索ワード"
                        />
                      )}
                    />
                    <Button type="submit" size="sm" loading={isSubmitting}>
                      追加
                    </Button>
                  </HStack>
                </form>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={onClose}>
                閉じる
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
