import type {
  SubAccountTitleId, AccountTitle, SubAccountTitle,
  TenantId,
  AccountTitleId,
} from "@account-ledgers/domain";

/**
 * Collection-like access to account titles: list, add, and save whole models.
 * Field-level changes (renames, deactivation, ...) are expressed on the model
 * by the usecase and persisted with save.
 */
export interface AccountTitleRepository {
  /** Every account title ordered by sortOrder ascending, including deactivated ones. */
  list(tenantId: TenantId): Promise<AccountTitle[]>;
  /** Adds a new account title and returns its generated id. */
  add(tenantId: TenantId, accountTitle: Omit<AccountTitle, "id">): Promise<AccountTitleId>;
  /** Persists the full state of an existing account title. */
  save(tenantId: TenantId, accountTitle: AccountTitle): Promise<void>;

  listSubAccountTitles(
    tenantId: TenantId,
    accountTitleId: AccountTitleId,
  ): Promise<SubAccountTitle[]>;
  addSubAccountTitle(
    tenantId: TenantId,
    accountTitleId: AccountTitleId,
    subAccountTitle: Omit<SubAccountTitle, "id">,
  ): Promise<SubAccountTitleId>;
  saveSubAccountTitle(
    tenantId: TenantId,
    accountTitleId: AccountTitleId,
    subAccountTitle: SubAccountTitle,
  ): Promise<void>;
}
