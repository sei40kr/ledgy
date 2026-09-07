import type {
  TenantId,
} from "@account-ledgers/domain";
import type { AuthPort } from "./ports/authPort";

export function signInUseCase(deps: { auth: AuthPort }) {
  return async function signIn(input: {
    email: string;
    password: string;
  }): Promise<{ tenantId: TenantId }> {
    const { uid } = await deps.auth.signIn(input.email, input.password);
    // MVP assumption: tenantId equals the creator's uid.
    return { tenantId: uid as string as TenantId };
  };
}
