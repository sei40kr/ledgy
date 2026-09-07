import type { TenantId } from "@account-ledgers/domain";
import type { TagRepository } from "../ports/tagRepository";

export function listTagsUseCase(deps: { tags: TagRepository }) {
  return function listTags(tenantId: TenantId) {
    return deps.tags.list(tenantId);
  };
}
