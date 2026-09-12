import { ApplicationError } from "../errors";

export class SupportingDocumentNotFoundError extends ApplicationError {}

/** The uploaded file's name is blank once trimmed. */
export class SupportingDocumentFileNameRequiredError extends ApplicationError {}

// Reported by the TransactionRepository implementation when an attach or detach
// contradicts the supporting document's current link.

/** Already attached to the very transaction it is being attached to. */
export class SupportingDocumentAlreadyAttachedError extends ApplicationError {}

/** Attached to another live transaction; a supporting document belongs to at most one. */
export class SupportingDocumentAttachedElsewhereError extends ApplicationError {}

export class SupportingDocumentNotAttachedError extends ApplicationError {}
