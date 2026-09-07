// Test-only wiring: composes the per-usecase factories into the grouped
// objects the integration tests drive, mirroring the app's container.
import type { AccountTitleRepository } from "@account-ledgers/usecases";
import type { FiscalYearRepository } from "@account-ledgers/usecases";
import type { MonthlyTransactionSummaryRepository } from "@account-ledgers/usecases";
import type { TransactionRepository } from "@account-ledgers/usecases";
import { createAccountTitleUseCase } from "@account-ledgers/usecases";
import { createSubAccountTitleUseCase } from "@account-ledgers/usecases";
import { listAccountTitlesUseCase } from "@account-ledgers/usecases";
import { listSubAccountTitlesUseCase } from "@account-ledgers/usecases";
import { setAccountTitleActiveUseCase } from "@account-ledgers/usecases";
import { setSubAccountTitleActiveUseCase } from "@account-ledgers/usecases";
import { updateAccountTitleUseCase } from "@account-ledgers/usecases";
import { updateSubAccountTitleUseCase } from "@account-ledgers/usecases";
import { createFiscalYearUseCase } from "@account-ledgers/usecases";
import { getOpeningBalanceUseCase } from "@account-ledgers/usecases";
import { listFiscalYearsUseCase } from "@account-ledgers/usecases";
import { saveOpeningBalanceUseCase } from "@account-ledgers/usecases";
import { setFiscalYearStatusUseCase } from "@account-ledgers/usecases";
import { getAccountLedgerUseCase } from "@account-ledgers/usecases";
import { createTransactionUseCase } from "@account-ledgers/usecases";
import { searchTransactionsUseCase } from "@account-ledgers/usecases";
import { softDeleteTransactionUseCase } from "@account-ledgers/usecases";
import { updateTransactionUseCase } from "@account-ledgers/usecases";
import { getTrialBalanceUseCase } from "@account-ledgers/usecases";
import { rebuildMonthlyTransactionSummariesUseCase } from "@account-ledgers/usecases";

export function createAccountUseCases(deps: {
  accountTitles: AccountTitleRepository;
}) {
  return {
    list: listAccountTitlesUseCase(deps),
    create: createAccountTitleUseCase(deps),
    update: updateAccountTitleUseCase(deps),
    setActive: setAccountTitleActiveUseCase(deps),
    listSubAccounts: listSubAccountTitlesUseCase(deps),
    createSubAccount: createSubAccountTitleUseCase(deps),
    updateSubAccount: updateSubAccountTitleUseCase(deps),
    setSubAccountActive: setSubAccountTitleActiveUseCase(deps),
  };
}

export function createFiscalYearUseCases(deps: {
  fiscalYears: FiscalYearRepository;
  transactions: TransactionRepository;
}) {
  return {
    list: listFiscalYearsUseCase(deps),
    create: createFiscalYearUseCase(deps),
    setStatus: setFiscalYearStatusUseCase(deps),
    getOpeningBalance: getOpeningBalanceUseCase(deps),
    saveOpeningBalance: saveOpeningBalanceUseCase(deps),
  };
}

export function createTransactionUseCases(deps: {
  transactions: TransactionRepository;
  fiscalYears: FiscalYearRepository;
}) {
  return {
    create: createTransactionUseCase(deps),
    update: updateTransactionUseCase(deps),
    softDelete: softDeleteTransactionUseCase(deps),
    search: searchTransactionsUseCase({ transactions: deps.transactions }),
  };
}

export function createLedgerUseCases(deps: {
  fiscalYears: FiscalYearRepository;
  transactions: TransactionRepository;
  monthlyTransactionSummaries: MonthlyTransactionSummaryRepository;
}) {
  return { getAccountLedger: getAccountLedgerUseCase(deps) };
}

export function createTrialBalanceUseCases(deps: {
  fiscalYears: FiscalYearRepository;
  monthlyTransactionSummaries: MonthlyTransactionSummaryRepository;
  transactions: TransactionRepository;
}) {
  return {
    get: getTrialBalanceUseCase(deps),
    rebuildMonthlyTransactionSummaries: rebuildMonthlyTransactionSummariesUseCase(deps),
  };
}
