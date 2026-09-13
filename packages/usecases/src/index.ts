// Public API of packages/usecases: one factory per usecase, plus the ports the
// infrastructure layer implements. Usecases orchestrate repositories through
// the ports; pure calculations live in the domain package.

export { ApplicationError } from "./errors";
export {
  AccountTitleNameRequiredError,
  AccountTitleNameTakenError,
  AccountTitleNotFoundError,
  SubAccountTitleNotFoundError,
} from "./accountTitles/errors";
export {
  DateOutsideFiscalYearError,
  FiscalYearClosedError,
  FiscalYearNotFoundError,
  FiscalYearPeriodOverlapsError,
  MonthOutsideFiscalYearError,
  OpeningBalanceNegativeError,
  OpeningBalanceUnbalancedError,
} from "./fiscalYears/errors";
export { PartnerNameRequiredError, PartnerNotFoundError } from "./partners/errors";
export {
  SupportingDocumentAlreadyAttachedError,
  SupportingDocumentAttachedElsewhereError,
  SupportingDocumentFileNameRequiredError,
  SupportingDocumentNotAttachedError,
  SupportingDocumentNotFoundError,
} from "./supportingDocuments/errors";
export { TagNameRequiredError, TagNotFoundError } from "./tags/errors";
export {
  TransactionDeletedError,
  TransactionNotFoundError,
} from "./transactions/errors";

export {
  type AccountTitleRepository,
} from "./ports/accountTitleRepository";
export {
  type AuthPort,
  EmailAlreadyInUseError,
  InvalidCredentialError,
  InvalidEmailError,
  TooManyAuthAttemptsError,
  WeakPasswordError,
} from "./ports/authPort";
export { type FiscalYearRepository } from "./ports/fiscalYearRepository";
export {
  type MonthlyTransactionSummaryRepository,
} from "./ports/monthlyTransactionSummaryRepository";
export {
  type AccountTitleSeed,
  type TenantRepository,
} from "./ports/tenantRepository";
export {
  type TransactionDraft,
  type TransactionRepository,
  type TransactionSearchParams,
  type TransactionsPage,
} from "./ports/transactionRepository";
export {
  type SupportingDocumentFile,
  type SupportingDocumentRepository,
} from "./ports/supportingDocumentRepository";

export { signInUseCase } from "./signIn";
export { signOutUseCase } from "./signOut";
export {
  type SignUpInput,
  signUpUseCase,
  standardAccountTitleSeeds,
} from "./signUp";

export { createAccountTitleUseCase } from "./accountTitles/createAccountTitle";
export { createSubAccountTitleUseCase } from "./accountTitles/createSubAccountTitle";
export { listAccountTitlesUseCase } from "./accountTitles/listAccountTitles";
export { listSubAccountTitlesUseCase } from "./accountTitles/listSubAccountTitles";
export { setAccountTitleActiveUseCase } from "./accountTitles/setAccountTitleActive";
export { setSubAccountTitleActiveUseCase } from "./accountTitles/setSubAccountTitleActive";
export { updateAccountTitleUseCase } from "./accountTitles/updateAccountTitle";
export { updateSubAccountTitleUseCase } from "./accountTitles/updateSubAccountTitle";

export { createPartnerUseCase } from "./partners/createPartner";
export { listPartnersUseCase } from "./partners/listPartners";
export { updatePartnerUseCase } from "./partners/updatePartner";
export type { PartnerRepository } from "./ports/partnerRepository";

export { createTagUseCase } from "./tags/createTag";
export { listTagsUseCase } from "./tags/listTags";
export { updateTagUseCase } from "./tags/updateTag";
export type { TagRepository } from "./ports/tagRepository";

export { createFiscalYearUseCase } from "./fiscalYears/createFiscalYear";
export { getOpeningBalanceUseCase } from "./fiscalYears/getOpeningBalance";
export { listFiscalYearsUseCase } from "./fiscalYears/listFiscalYears";
export { saveOpeningBalanceUseCase } from "./fiscalYears/saveOpeningBalance";
export { setFiscalYearStatusUseCase } from "./fiscalYears/setFiscalYearStatus";
export {
  type OpeningBalance,
  type OpeningBalanceAmounts,
} from "./fiscalYears/openingBalance";
export { validateOpeningBalance } from "./fiscalYears/openingBalanceValidation";
export {
  OPENING_BALANCE_TRANSACTION_ID,
  openingBalanceToPostings,
  postingsToOpeningBalance,
} from "./fiscalYears/openingBalanceTransaction";

export { attachSupportingDocumentToTransactionUseCase } from "./transactions/attachSupportingDocumentToTransaction";
export { createTransactionUseCase } from "./transactions/createTransaction";
export { getTransactionUseCase } from "./transactions/getTransaction";
export {
  matchesKeyword,
  searchTransactionsUseCase,
} from "./transactions/searchTransactions";
export { softDeleteTransactionUseCase } from "./transactions/softDeleteTransaction";
export { updateTransactionUseCase } from "./transactions/updateTransaction";

export { deleteSupportingDocumentUseCase } from "./supportingDocuments/deleteSupportingDocument";
export { getSupportingDocumentUseCase } from "./supportingDocuments/getSupportingDocument";
export { getSupportingDocumentFileUrlUseCase } from "./supportingDocuments/getSupportingDocumentFileUrl";
export { listSupportingDocumentsUseCase } from "./supportingDocuments/listSupportingDocuments";
export { uploadSupportingDocumentUseCase } from "./supportingDocuments/uploadSupportingDocument";

export { getAccountLedgerUseCase } from "./ledger/getAccountLedger";
export { monthKeyToDateRange } from "./ledger/monthKeyToDateRange";
export {
  type AccountTitleLedger,
  buildAccountTitleLedger,
  type LedgerMonthRow,
} from "./ledger/generalLedger";

export {
  getTrialBalanceUseCase,
  type TrialBalanceMode,
} from "./trialBalance/getTrialBalance";
export { rebuildMonthlyTransactionSummariesUseCase } from "./trialBalance/rebuildMonthlyTransactionSummaries";
export {
  buildTrialBalance,
  rollForwardOpening,
  type TrialBalance,
  type TrialBalanceRow,
  type TrialBalanceTotals,
} from "./trialBalance/trialBalance";
