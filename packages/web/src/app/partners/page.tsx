"use client";

import type { PartnerId, TenantId } from "@account-ledgers/domain";
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
import { PlusIcon } from "@/components/PlusIcon";
import { SearchWordsInput } from "@/components/SearchWordsInput";
import { TableCard } from "@/components/TableCard";
import { useAuth } from "@/hooks/useAuth";
import { usePartners } from "@/hooks/usePartners";
import { usecases } from "@account-ledgers/infrastructure/container";
import { toDisplayMessage } from "@/components/errorMessages";
import { normalizeSearchWords } from "@/components/searchWords";

interface PartnerFormState {
  partnerId: string | null; // null means "create new"
  name: string;
  searchWords: string[];
}

type PartnerFormValues = Omit<PartnerFormState, "partnerId">;

export default function PartnersPage() {
  return (
    <AppShell>
      <PartnersContent />
    </AppShell>
  );
}

function PartnersContent() {
  const { tenantId } = useAuth();
  const { partners, loading, reload } = usePartners();
  const [form, setForm] = useState<PartnerFormState | null>(null);

  if (!tenantId) return null;

  return (
    <Stack gap={4}>
      <Flex justify="flex-end">
        <Button
          size="sm"
          onClick={() => setForm({ partnerId: null, name: "", searchWords: [] })}
        >
          <PlusIcon />
          取引先を追加
        </Button>
      </Flex>

      {loading ? (
        <Spinner />
      ) : partners.length === 0 ? (
        <Text fontSize="sm" color="fg.muted">
          取引先はまだありません。
        </Text>
      ) : (
        <TableCard>
          <Table.Root size="sm" variant="outline" borderWidth={0}>
            <Table.Header>
              <Table.Row bg="bg.subtle">
                <Table.ColumnHeader>取引先名</Table.ColumnHeader>
                <Table.ColumnHeader>検索ワード</Table.ColumnHeader>
                <Table.ColumnHeader w="6rem">操作</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {partners.map((partner) => (
                <Table.Row key={partner.id}>
                  <Table.Cell>{partner.name}</Table.Cell>
                  <Table.Cell>
                    <Text fontSize="xs" color="fg.muted">
                      {partner.searchWords.join("、")}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Button
                      size="2xs"
                      variant="outline"
                      onClick={() =>
                        setForm({
                          partnerId: partner.id,
                          name: partner.name,
                          searchWords: partner.searchWords,
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
        取引先の削除はできません(使用中の仕訳を保全するため)。
      </Text>

      {form && (
        <PartnerFormDialog
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

function PartnerFormDialog({
  tenantId,
  form,
  onClose,
  onSaved,
}: {
  tenantId: TenantId;
  form: PartnerFormState;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isNew = form.partnerId === null;
  const {
    register,
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<PartnerFormValues>({
    defaultValues: { name: form.name, searchWords: form.searchWords },
  });
  const [error, setError] = useState<string | null>(null);

  const onSubmit = handleSubmit(async (data) => {
    setError(null);
    try {
      if (isNew) {
        await usecases.partners.create({
          tenantId,
          name: data.name,
          searchWords: normalizeSearchWords(data.searchWords),
        });
      } else {
        await usecases.partners.update({
          tenantId,
          partnerId: form.partnerId as PartnerId,
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
              <Dialog.Title>
                {isNew ? "取引先を追加" : "取引先を編集"}
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
                  <Field.Label>取引先名</Field.Label>
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
                    仕訳の取引先入力で名前とあわせて検索対象になります
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
