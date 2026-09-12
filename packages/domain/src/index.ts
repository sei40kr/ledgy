// Public API of packages/domain.
// Pure TypeScript: this layer depends on neither Firebase, React, nor any other
// external library.

export { DomainError } from "./errors";

export {
  type AccountTitleId,
  type FiscalYearId,
  type PartnerId,
  type SupportingDocumentId,
  type SubAccountTitleId,
  type TagId,
  type TenantId,
  type TransactionId,
  type UserId,
} from "./models/ids";

export { type PostingSide } from "./models/postingSide";
export {
  TAX_CATEGORY_CODES,
  TaxCategory,
  type TaxCategoryCode,
} from "./models/taxCategory";

export {
  ACCOUNT_TITLE_CATEGORIES,
  type AccountTitle,
  type AccountTitleCategory,
  normalBalanceSide,
  type SubAccountTitle,
} from "./models/accountTitle";
export { type Partner } from "./models/partner";
export { type Tag } from "./models/tag";
export {
  MAX_SUPPORTING_DOCUMENT_FILE_SIZE,
  type SupportingDocument,
  type SupportingDocumentAttachment,
  SUPPORTING_DOCUMENT_CONTENT_TYPES,
  SupportingDocumentContentTypeUnsupportedError,
  type SupportingDocumentContentType,
  SupportingDocumentFileEmptyError,
  SupportingDocumentFileTooLargeError,
  validateSupportingDocumentFile,
} from "./models/supportingDocument";
export {
  FiscalYear,
  FiscalYearPeriodInvalidError,
  type FiscalYearStatus,
} from "./models/fiscalYear";
export {
  type Transaction,
  type Posting,
  type SystemTransactionKind,
  type TransactionRevision,
} from "./models/transaction";

export {
  MonetaryAmount,
  MonetaryAmountNotIntegerError,
} from "./models/monetaryAmount";
export {
  calcPostingTotals,
  PostingAccountTitleMissingError,
  PostingAmountNotPositiveError,
  PostingSideInvalidError,
  PostingsEmptyError,
  TooManyPostingsError,
  TransactionTotalNotPositiveError,
  TransactionUnbalancedError,
  validatePostings,
} from "./services/transactionValidation";
export {
  applyPostingsToMonthlyTransactionSummary,
  fiscalYearMonthKeys,
  mergeMonthlyTransactionSummaries,
  type MonthlyTransactionSummary,
  monthKeyOf,
} from "./services/monthlyTransactionSummary";

export { STANDARD_ACCOUNT_TITLE_PRESETS } from "./presets/standardAccountTitles";
