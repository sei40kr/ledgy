import { STANDARD_ACCOUNT_TITLE_PRESETS,
  type TenantId,
} from "@account-ledgers/domain";
import type { AuthPort } from "./ports/authPort";
import type { AccountTitleSeed, TenantRepository } from "./ports/tenantRepository";

export interface SignUpInput {
  email: string;
  password: string;
}

export function standardAccountTitleSeeds(): AccountTitleSeed[] {
  return STANDARD_ACCOUNT_TITLE_PRESETS.map((preset, index) => ({
    name: preset.name,
    category: preset.category,
    sortOrder: (index + 1) * 10,
    defaultTaxCategory: null,
    searchWords: preset.searchWords,
  }));
}

/**
 * Sign-up: registers the user with Firebase Auth, then creates their tenant
 * (tenantId = uid) and seeds the standard chart of accounts.
 */
export function signUpUseCase(deps: {
  auth: AuthPort;
  tenants: TenantRepository;
}) {
  return async function signUp(input: SignUpInput): Promise<{ tenantId: TenantId }> {
    const { uid } = await deps.auth.signUp(input.email, input.password);
    // MVP assumption: tenantId equals the creator's uid.
    const tenantId = uid as string as TenantId;
    await deps.tenants.provisionTenant({
      tenantId,
      uid,
      accountTitles: standardAccountTitleSeeds(),
    });
    return { tenantId };
  };
}
