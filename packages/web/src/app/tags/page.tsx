"use client";

import type { TagId, TenantId } from "@account-ledgers/domain";
import {
  Alert,
  Button,
  Dialog,
  Field,
  Flex,
  Input,
  Portal,
  Spinner,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { AppShell } from "@/components/AppShell";
import { SearchWordsInput } from "@/components/SearchWordsInput";
import { TableCard } from "@/components/TableCard";
import { useAuth } from "@/hooks/useAuth";
import { useTags } from "@/hooks/useTags";
import { usecases } from "@account-ledgers/infrastructure/container";
import { toDisplayMessage } from "@/components/errorMessages";
import { normalizeSearchWords } from "@/components/searchWords";

interface TagFormState {
  tagId: string | null; // null means "create new"
  name: string;
  searchWords: string[];
}

type TagFormValues = Omit<TagFormState, "tagId">;

export default function TagsPage() {
  return (
    <AppShell>
      <TagsContent />
    </AppShell>
  );
}

function TagsContent() {
  const { tenantId } = useAuth();
  const { tags, loading, reload } = useTags();
  const [form, setForm] = useState<TagFormState | null>(null);

  if (!tenantId) return null;

  return (
    <Stack gap={4}>
      <Flex justify="flex-end">
        <Button
          size="sm"
          onClick={() => setForm({ tagId: null, name: "", searchWords: [] })}
        >
          タグを追加
        </Button>
      </Flex>

      {loading ? (
        <Spinner />
      ) : tags.length === 0 ? (
        <Text fontSize="sm" color="fg.muted">
          タグはまだありません。
        </Text>
      ) : (
        <TableCard>
          <Table.Root size="sm" variant="outline" borderWidth={0}>
            <Table.Header>
              <Table.Row bg="bg.subtle">
                <Table.ColumnHeader>タグ名</Table.ColumnHeader>
                <Table.ColumnHeader>検索ワード</Table.ColumnHeader>
                <Table.ColumnHeader w="6rem">操作</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {tags.map((tag) => (
                <Table.Row key={tag.id}>
                  <Table.Cell>{tag.name}</Table.Cell>
                  <Table.Cell>
                    <Text fontSize="xs" color="fg.muted">
                      {tag.searchWords.join("、")}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Button
                      size="2xs"
                      variant="outline"
                      onClick={() =>
                        setForm({
                          tagId: tag.id,
                          name: tag.name,
                          searchWords: tag.searchWords,
                        })
                      }
                    >
                      編集
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </TableCard>
      )}

      <Text fontSize="xs" color="fg.muted">
        タグの削除はできません(使用中の仕訳を保全するため)。
      </Text>

      {form && (
        <TagFormDialog
          tenantId={tenantId}
          form={form}
          onClose={() => setForm(null)}
          onSaved={async () => {
            setForm(null);
            await reload();
          }}
        />
      )}
    </Stack>
  );
}

function TagFormDialog({
  tenantId,
  form,
  onClose,
  onSaved,
}: {
  tenantId: TenantId;
  form: TagFormState;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isNew = form.tagId === null;
  const {
    register,
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<TagFormValues>({
    defaultValues: { name: form.name, searchWords: form.searchWords },
  });
  const [error, setError] = useState<string | null>(null);

  const onSubmit = handleSubmit(async (data) => {
    setError(null);
    try {
      if (isNew) {
        await usecases.tags.create({
          tenantId,
          name: data.name,
          searchWords: normalizeSearchWords(data.searchWords),
        });
      } else {
        await usecases.tags.update({
          tenantId,
          tagId: form.tagId as TagId,
          name: data.name,
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
              <Dialog.Title>{isNew ? "タグを追加" : "タグを編集"}</Dialog.Title>
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
                  <Field.Label>タグ名</Field.Label>
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
                    仕訳のタグ入力で名前とあわせて検索対象になります
                  </Field.HelperText>
                </Field.Root>
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
