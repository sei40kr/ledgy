import type {
  AccountTitleCategory,
  TaxCategory,
  TenantId,
  UserId,
} from "@account-ledgers/domain";

export interface AccountTitleSeed {
  name: string;
  category: AccountTitleCategory;
  sortOrder: number;
  defaultTaxCategory: TaxCategory | null;
  searchWords: string[];
}

export interface TenantRepository {
  /**
   * Atomically creates the tenant document, members/{uid} with role: admin, and
   * the standard chart of accounts in a single writeBatch.
   */
  provisionTenant(input: {
    tenantId: TenantId;
    uid: UserId;
    accountTitles: ReadonlyArray<AccountTitleSeed>;
  }): Promise<void>;

  exists(tenantId: TenantId): Promise<boolean>;
}
