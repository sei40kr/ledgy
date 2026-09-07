import { ApplicationError } from "../errors";

/** An account title or sub account title name that is blank once trimmed. */
export class AccountTitleNameRequiredError extends ApplicationError {}

export class AccountTitleNameTakenError extends ApplicationError {
  constructor(readonly name: string) {
    super();
  }
}

export class AccountTitleNotFoundError extends ApplicationError {}

export class SubAccountTitleNotFoundError extends ApplicationError {}
