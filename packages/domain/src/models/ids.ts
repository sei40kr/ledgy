declare const brand: unique symbol;

/**
 * Nominal ID typing: a branded string cannot be passed where another kind of
 * ID is expected. Values are cast exactly once, where they enter the system
 * (Firestore document IDs, Firebase Auth uids, form inputs).
 */
type Id<B extends string> = string & { readonly [brand]: B };

export type TenantId = Id<"TenantId">;
export type UserId = Id<"UserId">;
export type FiscalYearId = Id<"FiscalYearId">;
export type AccountTitleId = Id<"AccountTitleId">;
export type SubAccountTitleId = Id<"SubAccountTitleId">;
export type PartnerId = Id<"PartnerId">;
export type TagId = Id<"TagId">;
export type TransactionId = Id<"TransactionId">;
