import type { Tag, TagId, TenantId } from "@account-ledgers/domain";

/**
 * Collection-like access to tags: list, add, and save whole models. Field-level
 * changes are expressed on the model by the usecase and persisted with save.
 */
export interface TagRepository {
  /** Every tag, ordered by name. */
  list(tenantId: TenantId): Promise<Tag[]>;
  /** Adds a new tag and returns its generated id. */
  add(tenantId: TenantId, tag: Omit<Tag, "id">): Promise<TagId>;
  /** Persists the full state of an existing tag. */
  save(tenantId: TenantId, tag: Tag): Promise<void>;
}
