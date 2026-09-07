import {
  type AccountTitle,
  type SubAccountTitle,
  type AccountTitleId,
  type SubAccountTitleId,
} from "@account-ledgers/domain";
import {
  AccountTitleNameRequiredError,
  AccountTitleNameTakenError,
  AccountTitleNotFoundError,
  SubAccountTitleNotFoundError,
} from "./errors";

export function validateName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new AccountTitleNameRequiredError();
  }
  return trimmed;
}

export function assertNameUnique(
  accountTitles: AccountTitle[],
  name: string,
  excludeAccountTitleId?: string,
): void {
  if (
    accountTitles.some(
      (a) => a.name === name && a.id !== excludeAccountTitleId,
    )
  ) {
    throw new AccountTitleNameTakenError(name);
  }
}

export function findAccountTitle(
  accountTitles: AccountTitle[],
  accountTitleId: AccountTitleId,
): AccountTitle {
  const found = accountTitles.find((a) => a.id === accountTitleId);
  if (!found) {
    throw new AccountTitleNotFoundError();
  }
  return found;
}

export function findSubAccountTitle(
  subAccountTitles: SubAccountTitle[],
  subAccountTitleId: SubAccountTitleId,
): SubAccountTitle {
  const found = subAccountTitles.find((s) => s.id === subAccountTitleId);
  if (!found) {
    throw new SubAccountTitleNotFoundError();
  }
  return found;
}
