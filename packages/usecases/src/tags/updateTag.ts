import { type TagId, type TenantId } from "@account-ledgers/domain";
import { TagNameRequiredError, TagNotFoundError } from "./errors";
import type { TagRepository } from "../ports/tagRepository";

export function updateTagUseCase(deps: { tags: TagRepository }) {
  return async function updateTag(input: {
    tenantId: TenantId;
    tagId: TagId;
    name: string;
    searchWords: string[];
  }): Promise<void> {
    const name = input.name.trim();
    if (!name) throw new TagNameRequiredError();
    const existing = await deps.tags.list(input.tenantId);
    const current = existing.find((t) => t.id === input.tagId);
    if (!current) throw new TagNotFoundError();
    await deps.tags.save(input.tenantId, {
      ...current,
      name,
      searchWords: input.searchWords,
    });
  };
}
