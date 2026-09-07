// Storybook's stand-in for the composition root, registered in
// .storybook/preview.tsx. Only the usecases the storied components reach are
// present, each answering from in-memory demo data. Every one is a spy, so a
// story can override it with `mocked()` from storybook/test.
import type {
  Partner,
  PartnerId,
  SubAccountTitle,
  Tag,
  TagId,
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

export const usecases = {
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
