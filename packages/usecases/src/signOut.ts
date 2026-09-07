import type { AuthPort } from "./ports/authPort";

export function signOutUseCase(deps: { auth: AuthPort }) {
  return async function signOut(): Promise<void> {
    await deps.auth.signOut();
  };
}
