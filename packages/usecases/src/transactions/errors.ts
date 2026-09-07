import { ApplicationError } from "../errors";

// Reported by the TransactionRepository implementation when a write names a
// transaction it cannot change.

export class TransactionNotFoundError extends ApplicationError {}

/** The transaction is soft-deleted, and a deleted transaction is never edited. */
export class TransactionDeletedError extends ApplicationError {}
