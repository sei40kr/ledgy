import type {
  UserId,
} from "@account-ledgers/domain";
import { ApplicationError } from "../errors";
/** The email address is already registered. */
export class EmailAlreadyInUseError extends ApplicationError {}

export class InvalidEmailError extends ApplicationError {}

export class WeakPasswordError extends ApplicationError {}

/** The email address and password do not match a user; which of the two is wrong is never revealed. */
export class InvalidCredentialError extends ApplicationError {}

export class TooManyAuthAttemptsError extends ApplicationError {}

/**
 * Abstraction over authentication. The infrastructure layer implements it with
 * Firebase Authentication and reports a refused sign-up or sign-in with the
 * errors above, so the presentation layer can word them.
 */
export interface AuthPort {
  signUp(email: string, password: string): Promise<{ uid: UserId }>;
  signIn(email: string, password: string): Promise<{ uid: UserId }>;
  signOut(): Promise<void>;
}
