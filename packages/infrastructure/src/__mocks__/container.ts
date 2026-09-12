// Storybook's stand-in for the composition root, registered in
// .storybook/preview.tsx. Only the usecases the storied components reach are
// present, each answering from in-memory demo data. Every one is a spy, so a
// story can override it with `mocked()` from storybook/test.
import type {
  Partner,
  PartnerId,
  SupportingDocument,
  SupportingDocumentId,
  SubAccountTitle,
  Tag,
  TagId,
  UserId,
} from "@account-ledgers/domain";
import { fn } from "storybook/test";

const partners: Partner[] = [
  {
    id: "partner-1" as PartnerId,
    name: "株式会社サンプル商事",
    searchWords: ["さんぷる"],
  },
  {
    id: "partner-2" as PartnerId,
    name: "山田文具店",
    searchWords: ["やまだ", "ぶんぐ"],
  },
  { id: "partner-3" as PartnerId, name: "東京電力", searchWords: ["でんき"] },
];

const tags: Tag[] = [
  { id: "tag-1" as TagId, name: "確定申告", searchWords: [] },
  { id: "tag-2" as TagId, name: "要確認", searchWords: [] },
];

// A supporting document image the stories can preview without any file storage: an inline SVG.
const SAMPLE_SUPPORTING_DOCUMENT_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="600">
      <rect width="100%" height="100%" fill="#fafaf9"/>
      <text x="210" y="70" font-size="26" text-anchor="middle" font-family="sans-serif">領 収 書</text>
      <text x="40" y="140" font-size="16" font-family="sans-serif">株式会社サンプル商事 様</text>
      <text x="40" y="220" font-size="20" font-family="sans-serif">金額  ¥3,300-</text>
      <text x="40" y="260" font-size="14" font-family="sans-serif">但し 文房具代として</text>
      <text x="40" y="540" font-size="12" font-family="sans-serif">2026年4月2日  山田文具店</text>
    </svg>`,
  );

const supportingDocuments: SupportingDocument[] = [
  {
    id: "supportingDocument-1" as SupportingDocumentId,
    fileName: "20260402_yamada.png",
    contentType: "image/png",
    size: 184_320,
    uploadedBy: "user-1" as UserId,
    uploadedAt: new Date("2026-04-02T10:15:00"),
    attachedTo: null,
    deleted: false,
  },
  {
    id: "supportingDocument-2" as SupportingDocumentId,
    fileName: "invoice-2026-04.pdf",
    contentType: "application/pdf",
    size: 52_100,
    uploadedBy: "user-1" as UserId,
    uploadedAt: new Date("2026-04-05T09:00:00"),
    attachedTo: null,
    deleted: false,
  },
];

export const usecases = {
  supportingDocuments: {
    get: fn(
      async ({ supportingDocumentId }: { supportingDocumentId: SupportingDocumentId }) =>
        supportingDocuments.find((r) => r.id === supportingDocumentId) ?? null,
    ).mockName("usecases.supportingDocuments.get"),
    getFileUrl: fn(async () => SAMPLE_SUPPORTING_DOCUMENT_IMAGE).mockName(
      "usecases.supportingDocuments.getFileUrl",
    ),
    upload: fn(async () => "supportingDocument-new" as SupportingDocumentId).mockName(
      "usecases.supportingDocuments.upload",
    ),
    delete: fn(async () => {}).mockName("usecases.supportingDocuments.delete"),
  },
  accountTitles: {
    listSubAccounts: fn(async (): Promise<SubAccountTitle[]> => []).mockName(
      "usecases.accountTitles.listSubAccounts",
    ),
  },
  partners: {
    list: fn(async () => partners).mockName("usecases.partners.list"),
    create: fn(
      async ({ name }: { name: string }) => `partner-${name}` as PartnerId,
    ).mockName("usecases.partners.create"),
  },
  tags: {
    list: fn(async () => tags).mockName("usecases.tags.list"),
    create: fn(
      async ({ name }: { name: string }) => `tag-${name}` as TagId,
    ).mockName("usecases.tags.create"),
  },
};
