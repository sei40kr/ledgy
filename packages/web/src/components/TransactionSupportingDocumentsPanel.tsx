"use client";

import type {
  SupportingDocument,
  TenantId,
  UserId,
} from "@account-ledgers/domain";
import {
  Alert,
  Box,
  Button,
  createListCollection,
  FileUpload,
  Flex,
  HStack,
  Listbox,
  Spinner,
  Stack,
  Text,
  useFileUpload,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { usecases } from "@account-ledgers/infrastructure/container";
import { toDisplayMessage } from "@/components/errorMessages";
import { FileIcon } from "@/components/FileIcon";
import { SupportingDocumentPreview } from "@/components/SupportingDocumentPreview";
import {
  formatFileSize,
  MAX_SUPPORTING_DOCUMENT_FILE_SIZE,
  SUPPORTING_DOCUMENT_ACCEPT,
  SUPPORTING_DOCUMENT_MAX_FILES,
  toSupportingDocumentFile,
} from "@/components/supportingDocumentFiles";

export interface TransactionSupportingDocumentsPanelProps {
  tenantId: TenantId;
  uploadedBy: UserId;
  supportingDocuments: SupportingDocument[];
  /** True when nothing may change: a closed year or a deleted transaction. */
  disabled?: boolean;
  /**
   * "stacked" (the default) puts the list above the preview, sized by
   * previewHeight; "split" puts the list beside the preview and fills the
   * parent's height, for the dialog.
   */
  layout?: "stacked" | "split";
  previewHeight?: string;
  /** Called with the freshly uploaded documents. */
  onAttach(uploaded: SupportingDocument[]): Promise<void>;
  onDelete(supportingDocument: SupportingDocument): Promise<void>;
  /** When given, offers 拡大表示 for the selected document; what that opens is up to the caller. */
  onEnlarge?(selected: SupportingDocument): void;
}

/**
 * The supporting documents (証憑) of one transaction: the list, a preview of
 * the selected one, and the actions — add files, delete one. Files are uploaded
 * right away (each is a record of its own); what attaching and deleting persist
 * is up to the caller: the new-transaction form keeps the attachments pending
 * until the save, everywhere else they apply immediately.
 */
export function TransactionSupportingDocumentsPanel({
  tenantId,
  uploadedBy,
  supportingDocuments,
  disabled = false,
  layout = "stacked",
  previewHeight = "24rem",
  onAttach,
  onDelete,
  onEnlarge,
}: TransactionSupportingDocumentsPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep a selection whenever there is something to show.
  const selected =
    supportingDocuments.find((d) => d.id === selectedId) ??
    supportingDocuments[0] ??
    null;
  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);

  // The documents as the listbox collection that switches the preview.
  const collection = useMemo(
    () =>
      createListCollection({
        items: supportingDocuments,
        itemToValue: (d) => d.id,
        itemToString: (d) => d.fileName,
      }),
    [supportingDocuments],
  );

  const fileUpload = useFileUpload({
    accept: SUPPORTING_DOCUMENT_ACCEPT,
    maxFiles: SUPPORTING_DOCUMENT_MAX_FILES,
    maxFileSize: MAX_SUPPORTING_DOCUMENT_FILE_SIZE,
    onFileReject: ({ files }) => {
      if (files.length > 0) {
        setError(
          "PDFまたは画像(JPEG・PNG・WebP)で、20MB以下のファイルを選択してください",
        );
      }
    },
    onFileAccept: ({ files }) => {
      void upload(files);
    },
  });

  async function upload(files: File[]) {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: SupportingDocument[] = [];
      for (const file of files) {
        const supportingDocumentId = await usecases.supportingDocuments.upload({
          tenantId,
          file: await toSupportingDocumentFile(file),
          uploadedBy,
        });
        const supportingDocument = await usecases.supportingDocuments.get({
          tenantId,
          supportingDocumentId,
        });
        if (supportingDocument) uploaded.push(supportingDocument);
      }
      await onAttach(uploaded);
      const last = uploaded[uploaded.length - 1];
      if (last) setSelectedId(last.id);
    } catch (e) {
      setError(toDisplayMessage(e, "アップロードに失敗しました"));
    } finally {
      fileUpload.clearFiles();
      setUploading(false);
    }
  }

  async function remove(supportingDocument: SupportingDocument) {
    if (!window.confirm(`「${supportingDocument.fileName}」を削除しますか?`)) return;
    setBusyId(supportingDocument.id);
    setError(null);
    try {
      await onDelete(supportingDocument);
    } catch (e) {
      setError(toDisplayMessage(e, "削除に失敗しました"));
    } finally {
      setBusyId(null);
    }
  }

  const split = layout === "split";

  const header = (
    <HStack>
      <FileIcon color="fg.muted" />
      <Text fontSize="sm" fontWeight="semibold" whiteSpace="nowrap">
        証憑
      </Text>
      <FileUpload.RootProvider value={fileUpload} w="auto" ml="auto">
        <FileUpload.HiddenInput />
        <FileUpload.Trigger asChild>
          <Button size="xs" variant="outline" disabled={disabled} loading={uploading}>
            ＋ 追加
          </Button>
        </FileUpload.Trigger>
      </FileUpload.RootProvider>
    </HStack>
  );

  const alert = error && (
    <Alert.Root status="error" size="sm">
      <Alert.Indicator />
      <Alert.Title>{error}</Alert.Title>
    </Alert.Root>
  );

  const empty = (
    <Flex
      h={split ? "full" : "8rem"}
      align="center"
      justify="center"
      borderWidth="1px"
      borderStyle="dashed"
      borderColor="border"
      rounded="md"
      color="fg.muted"
      fontSize="sm"
    >
      {uploading ? <Spinner size="sm" /> : "証憑はまだありません"}
    </Flex>
  );

  const list = (
    <Listbox.Root
      collection={collection}
      selectionMode="single"
      deselectable={false}
      value={selected ? [selected.id] : []}
      onValueChange={(e) => {
        const id = e.value[0];
        if (id) setSelectedId(id);
      }}
      maxH={split ? undefined : "12rem"}
      flex={split ? 1 : undefined}
      minH={0}
    >
      <Listbox.Content>
        {collection.items.map((supportingDocument) => {
          const busy = busyId === supportingDocument.id;
          return (
            <Listbox.Item key={supportingDocument.id} item={supportingDocument}>
              <Stack gap={0} minW={0} flex={1}>
                <Listbox.ItemText truncate>{supportingDocument.fileName}</Listbox.ItemText>
                <Text fontSize="xs" color="fg.muted">
                  {formatFileSize(supportingDocument.size)}
                </Text>
              </Stack>
              <Button
                size="2xs"
                variant="ghost"
                colorPalette="red"
                disabled={disabled || busy}
                loading={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  void remove(supportingDocument);
                }}
              >
                削除
              </Button>
            </Listbox.Item>
          );
        })}
      </Listbox.Content>
    </Listbox.Root>
  );

  const preview = selected && (
    <Box
      h={split ? "full" : previewHeight}
      borderWidth="1px"
      borderColor="border"
      rounded="md"
      overflow="hidden"
    >
      <SupportingDocumentPreview tenantId={tenantId} supportingDocument={selected} />
    </Box>
  );

  if (split) {
    return (
      <Flex h="full" minH={0} gap={4}>
        <Stack w="18rem" flexShrink={0} minH={0} gap={3}>
          {header}
          {alert}
          {supportingDocuments.length === 0 ? empty : list}
        </Stack>
        <Box flex={1} minW={0} h="full">
          {preview}
        </Box>
      </Flex>
    );
  }

  return (
    <Stack gap={3}>
      {header}
      {alert}
      {supportingDocuments.length === 0 ? (
        empty
      ) : (
        <>
          {list}
          {selected && (
            <Stack gap={1}>
              {preview}
              {onEnlarge && (
                <Button
                  size="xs"
                  variant="ghost"
                  alignSelf="flex-end"
                  onClick={() => onEnlarge(selected)}
                >
                  拡大表示
                </Button>
              )}
            </Stack>
          )}
        </>
      )}
    </Stack>
  );
}
