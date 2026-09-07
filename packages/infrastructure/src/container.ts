// Composition root: the usecases the whole app uses are wired up here, once.
// The presentation layer reaches them only through this module.
import { createAccountTitleUseCase } from "@account-ledgers/usecases";
import { createSubAccountTitleUseCase } from "@account-ledgers/usecases";
import { listAccountTitlesUseCase } from "@account-ledgers/usecases";
import { listSubAccountTitlesUseCase } from "@account-ledgers/usecases";
import { setAccountTitleActiveUseCase } from "@account-ledgers/usecases";
import { setSubAccountTitleActiveUseCase } from "@account-ledgers/usecases";
import { updateAccountTitleUseCase } from "@account-ledgers/usecases";
import { updateSubAccountTitleUseCase } from "@account-ledgers/usecases";
import { createPartnerUseCase } from "@account-ledgers/usecases";
import { listPartnersUseCase } from "@account-ledgers/usecases";
import { updatePartnerUseCase } from "@account-ledgers/usecases";
import { createTagUseCase } from "@account-ledgers/usecases";
import { listTagsUseCase } from "@account-ledgers/usecases";
import { updateTagUseCase } from "@account-ledgers/usecases";
import { createFiscalYearUseCase } from "@account-ledgers/usecases";
import { getOpeningBalanceUseCase } from "@account-ledgers/usecases";
import { listFiscalYearsUseCase } from "@account-ledgers/usecases";
import { saveOpeningBalanceUseCase } from "@account-ledgers/usecases";
import { setFiscalYearStatusUseCase } from "@account-ledgers/usecases";
import { getAccountLedgerUseCase } from "@account-ledgers/usecases";
import { signInUseCase } from "@account-ledgers/usecases";
import { signOutUseCase } from "@account-ledgers/usecases";
import { signUpUseCase } from "@account-ledgers/usecases";
import { createTransactionUseCase } from "@account-ledgers/usecases";
import { getTransactionUseCase } from "@account-ledgers/usecases";
import { searchTransactionsUseCase } from "@account-ledgers/usecases";
import { softDeleteTransactionUseCase } from "@account-ledgers/usecases";
import { updateTransactionUseCase } from "@account-ledgers/usecases";
import { getTrialBalanceUseCase } from "@account-ledgers/usecases";
import { rebuildMonthlyTransactionSummariesUseCase } from "@account-ledgers/usecases";
import { createFirebaseAuthAdapter } from "./auth/firebaseAuthAdapter";
import { auth, db } from "./firebase/app";
import { createFirestoreAccountTitleRepository } from "./firestore/accountTitleRepository";
import { createFirestorePartnerRepository } from "./firestore/partnerRepository";
import { createFirestoreTagRepository } from "./firestore/tagRepository";
import { createFirestoreFiscalYearRepository } from "./firestore/fiscalYearRepository";
import { createFirestoreMonthlyTransactionSummaryRepository } from "./firestore/monthlyTransactionSummaryRepository";
import { createFirestoreTenantRepository } from "./firestore/tenantRepository";
import { createFirestoreTransactionRepository } from "./firestore/transactionRepository";

const authAdapter = createFirebaseAuthAdapter(auth);
const tenantRepository = createFirestoreTenantRepository(db);
const accountTitleRepository = createFirestoreAccountTitleRepository(db);
const partnerRepository = createFirestorePartnerRepository(db);
const tagRepository = createFirestoreTagRepository(db);
const fiscalYearRepository = createFirestoreFiscalYearRepository(db);
const transactionRepository = createFirestoreTransactionRepository(db);
const monthlyTransactionSummaryRepository = createFirestoreMonthlyTransactionSummaryRepository(db);

const accountTitles = { accountTitles: accountTitleRepository };
const partners = { partners: partnerRepository };
const tags = { tags: tagRepository };
const fiscalYears = { fiscalYears: fiscalYearRepository };
const transactions = {
  transactions: transactionRepository,
  fiscalYears: fiscalYearRepository,
};

export const usecases = {
  signUp: signUpUseCase({ auth: authAdapter, tenants: tenantRepository }),
  signIn: signInUseCase({ auth: authAdapter }),
  signOut: signOutUseCase({ auth: authAdapter }),
  accountTitles: {
    list: listAccountTitlesUseCase(accountTitles),
    create: createAccountTitleUseCase(accountTitles),
    update: updateAccountTitleUseCase(accountTitles),
    setActive: setAccountTitleActiveUseCase(accountTitles),
    listSubAccounts: listSubAccountTitlesUseCase(accountTitles),
    createSubAccount: createSubAccountTitleUseCase(accountTitles),
    updateSubAccount: updateSubAccountTitleUseCase(accountTitles),
    setSubAccountActive: setSubAccountTitleActiveUseCase(accountTitles),
  },
  partners: {
    list: listPartnersUseCase(partners),
    create: createPartnerUseCase(partners),
    update: updatePartnerUseCase(partners),
  },
  tags: {
    list: listTagsUseCase(tags),
    create: createTagUseCase(tags),
    update: updateTagUseCase(tags),
  },
  fiscalYears: {
    list: listFiscalYearsUseCase(fiscalYears),
    create: createFiscalYearUseCase(fiscalYears),
    setStatus: setFiscalYearStatusUseCase(fiscalYears),
    getOpeningBalance: getOpeningBalanceUseCase({
      transactions: transactionRepository,
    }),
    saveOpeningBalance: saveOpeningBalanceUseCase({
      transactions: transactionRepository,
      fiscalYears: fiscalYearRepository,
    }),
  },
  transactions: {
    create: createTransactionUseCase(transactions),
    update: updateTransactionUseCase(transactions),
    softDelete: softDeleteTransactionUseCase(transactions),
    get: getTransactionUseCase({ transactions: transactionRepository }),
    search: searchTransactionsUseCase({ transactions: transactionRepository }),
  },
  ledger: {
    getAccountLedger: getAccountLedgerUseCase({
      fiscalYears: fiscalYearRepository,
      transactions: transactionRepository,
      monthlyTransactionSummaries: monthlyTransactionSummaryRepository,
    }),
  },
  trialBalance: {
    get: getTrialBalanceUseCase({
      fiscalYears: fiscalYearRepository,
      transactions: transactionRepository,
      monthlyTransactionSummaries: monthlyTransactionSummaryRepository,
    }),
    rebuildMonthlyTransactionSummaries: rebuildMonthlyTransactionSummariesUseCase({
      monthlyTransactionSummaries: monthlyTransactionSummaryRepository,
      transactions: transactionRepository,
    }),
  },
};
