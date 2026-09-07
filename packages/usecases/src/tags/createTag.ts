import { type TagId, type TenantId } from "@account-ledgers/domain";
import { TagNameRequiredError } from "./errors";
import type { TagRepository } from "../ports/tagRepository";

export function createTagUseCase(deps: { tags: TagRepository }) {
  return async function createTag(input: {
    tenantId: TenantId;
    name: string;
    searchWords: string[];
  }): Promise<TagId> {
    const name = input.name.trim();
    if (!name) throw new TagNameRequiredError();
    return deps.tags.add(input.tenantId, {
      name,
      searchWords: input.searchWords,
    });
  };
}
