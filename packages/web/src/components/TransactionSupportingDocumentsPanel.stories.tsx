import type {
  SupportingDocument,
  SupportingDocumentId,
  TenantId,
  UserId,
} from "@account-ledgers/domain";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { TransactionSupportingDocumentsPanel } from "@/components/TransactionSupportingDocumentsPanel";

const tenantId = "tenant-1" as TenantId;
const uploadedBy = "user-1" as UserId;

const supportingDocuments: SupportingDocument[] = [
  {
    id: "supportingDocument-1" as SupportingDocumentId,
    fileName: "20260402_yamada.png",
    contentType: "image/png",
    size: 184_320,
    uploadedBy,
    uploadedAt: new Date("2026-04-02T10:15:00"),
    attachedTo: null,
    deleted: false,
  },
  {
    id: "supportingDocument-2" as SupportingDocumentId,
    fileName: "invoice-2026-04.pdf",
    contentType: "application/pdf",
    size: 52_100,
    uploadedBy,
    uploadedAt: new Date("2026-04-05T09:00:00"),
    attachedTo: null,
    deleted: false,
  },
];

const meta = {
  title: "Components/TransactionSupportingDocumentsPanel",
  component: TransactionSupportingDocumentsPanel,
  args: {
    tenantId,
    uploadedBy,
    supportingDocuments,
    previewHeight: "20rem",
    onAttach: fn(async () => {}),
    onDelete: fn(async () => {}),
  },
  decorators: [
    (Story) => (
      <div style={{ width: "26rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TransactionSupportingDocumentsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Two supporting documents attached; the first is previewed (the mock serves a sample image for every file). */
export const WithSupportingDocuments: Story = {};

export const Empty: Story = {
  args: { supportingDocuments: [] },
};

/** A closed year or a deleted transaction: everything is read-only. */
export const Disabled: Story = {
  args: { disabled: true },
};

/** Pending mode, as the new-transaction page uses it: the list is local until the save. */
export const Pending: Story = {
  render: (args) => {
    const [list, setList] = useState(args.supportingDocuments);
    return (
      <TransactionSupportingDocumentsPanel
        {...args}
        supportingDocuments={list}
        onAttach={async (uploaded) => setList((prev) => [...prev, ...uploaded])}
        onDelete={async (supportingDocument) =>
          setList((prev) => prev.filter((r) => r.id !== supportingDocument.id))
        }
      />
    );
  },
};
