"use client";

import { Box } from "@chakra-ui/react";
import { useState } from "react";
import { TransactionSupportingDocumentsDialog } from "@/components/TransactionSupportingDocumentsDialog";
import {
  TransactionSupportingDocumentsPanel,
  type TransactionSupportingDocumentsPanelProps,
} from "@/components/TransactionSupportingDocumentsPanel";

/**
 * The sticky right-hand column that holds the supporting documents next to a
 * transaction form, with 拡大表示 opening the same panel as a large dialog.
 */
export function SupportingDocumentsPane(
  panel: Omit<
    TransactionSupportingDocumentsPanelProps,
    "layout" | "previewHeight" | "onEnlarge"
  >,
) {
  const [enlarged, setEnlarged] = useState(false);
  return (
    <Box
      w="26rem"
      flexShrink={0}
      position="sticky"
      top="72px"
      bg="bg.panel"
      borderWidth="1px"
      borderColor="border"
      rounded="lg"
      p={4}
    >
      <TransactionSupportingDocumentsPanel
        {...panel}
        previewHeight="calc(100vh - 22rem)"
        onEnlarge={() => setEnlarged(true)}
      />
      {enlarged && (
        <TransactionSupportingDocumentsDialog
          {...panel}
          onClose={() => setEnlarged(false)}
        />
      )}
    </Box>
  );
}
