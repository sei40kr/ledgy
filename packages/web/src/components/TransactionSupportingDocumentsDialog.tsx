"use client";

import { Button, Dialog, Portal } from "@chakra-ui/react";
import {
  TransactionSupportingDocumentsPanel,
  type TransactionSupportingDocumentsPanelProps,
} from "@/components/TransactionSupportingDocumentsPanel";

/**
 * The supporting documents panel of one transaction as a large dialog: the
 * journal opens it from the indicator, and the transaction form's pane opens
 * it as its enlarged view. The list sits beside the preview, and the dialog
 * is sized to the viewport so nothing in it scrolls but the list and the
 * preview themselves.
 */
export function TransactionSupportingDocumentsDialog({
  description,
  onClose,
  ...panel
}: Omit<
  TransactionSupportingDocumentsPanelProps,
  "layout" | "previewHeight" | "onEnlarge"
> & {
  /** The transaction's description, for the title. */
  description: string;
  onClose(): void;
}) {
  return (
    <Dialog.Root open onOpenChange={(e) => !e.open && onClose()} size="xl">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content h="88vh" maxH="88vh">
            <Dialog.Header>
              <Dialog.Title>{description || "(摘要なし)"}の証憑</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body flex={1} minH={0} overflow="hidden">
              <TransactionSupportingDocumentsPanel {...panel} layout="split" />
            </Dialog.Body>
            <Dialog.Footer>
              <Button size="sm" variant="outline" onClick={onClose}>
                閉じる
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
