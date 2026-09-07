import {
  type Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import type { UserId } from "@account-ledgers/domain";
import {
  type ApplicationError,
  type AuthPort,
  EmailAlreadyInUseError,
  InvalidCredentialError,
  InvalidEmailError,
  TooManyAuthAttemptsError,
  WeakPasswordError,
} from "@account-ledgers/usecases";

/** Firebase Auth error codes mapped to the errors the AuthPort contract promises. */
const AUTH_ERRORS: Record<string, new () => ApplicationError> = {
  "auth/email-already-in-use": EmailAlreadyInUseError,
  "auth/invalid-email": InvalidEmailError,
  "auth/weak-password": WeakPasswordError,
  "auth/invalid-credential": InvalidCredentialError,
  "auth/user-not-found": InvalidCredentialError,
  "auth/wrong-password": InvalidCredentialError,
  "auth/too-many-requests": TooManyAuthAttemptsError,
};

function translateAuthError(error: unknown): never {
  if (error instanceof FirebaseError) {
    const AuthError = AUTH_ERRORS[error.code];
    if (AuthError) throw new AuthError();
  }
  throw error;
}

export function createFirebaseAuthAdapter(auth: Auth): AuthPort {
  return {
    async signUp(email, password) {
      try {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        return { uid: credential.user.uid as UserId };
      } catch (error) {
        translateAuthError(error);
      }
    },
    async signIn(email, password) {
      try {
        const credential = await signInWithEmailAndPassword(
          auth,
          email,
          password,
        );
        return { uid: credential.user.uid as UserId };
      } catch (error) {
        translateAuthError(error);
      }
    },
    async signOut() {
      await firebaseSignOut(auth);
    },
  };
}
