import type { Partner, PartnerId, TenantId } from "@account-ledgers/domain";

/**
 * Collection-like access to trading partners: list, add, and save whole models.
 * Field-level changes are expressed on the model by the usecase and persisted
 * with save.
 */
export interface PartnerRepository {
  /** Every partner, ordered by name. */
  list(tenantId: TenantId): Promise<Partner[]>;
  /** Adds a new partner and returns its generated id. */
  add(tenantId: TenantId, partner: Omit<Partner, "id">): Promise<PartnerId>;
  /** Persists the full state of an existing partner. */
  save(tenantId: TenantId, partner: Partner): Promise<void>;
}
