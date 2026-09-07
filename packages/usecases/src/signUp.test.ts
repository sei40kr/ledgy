import {
  STANDARD_ACCOUNT_TITLE_PRESETS,
  type UserId,
} from "@account-ledgers/domain";
import { describe, expect, it } from "vitest";
import type { AuthPort } from "./ports/authPort";
import type { TenantRepository } from "./ports/tenantRepository";
import { signUpUseCase, standardAccountTitleSeeds } from "./signUp";

function fakeAuth(uid: UserId): AuthPort {
  return {
    signUp: async () => ({ uid }),
    signIn: async () => ({ uid }),
    signOut: async () => {},
  };
}

describe("signUp usecase", () => {
  it("creates a tenant keyed by the uid after registering with Auth", async () => {
    const provisioned: Parameters<TenantRepository["provisionTenant"]>[0][] =
      [];
    const tenants: TenantRepository = {
      provisionTenant: async (input) => {
        provisioned.push(input);
      },
      exists: async () => false,
    };

    const signUp = signUpUseCase({ auth: fakeAuth("user-1" as UserId), tenants });
    const result = await signUp({
      email: "test@example.com",
      password: "password123",
    });

    expect(result.tenantId).toBe("user-1");
    expect(provisioned).toHaveLength(1);
    expect(provisioned[0]?.tenantId).toBe("user-1");
    expect(provisioned[0]?.uid).toBe("user-1");
    expect(provisioned[0]?.accountTitles).toHaveLength(
      STANDARD_ACCOUNT_TITLE_PRESETS.length,
    );
  });

  it("seeds the standard account titles with unique names and ascending sortOrder", () => {
    const seeds = standardAccountTitleSeeds();
    const names = new Set(seeds.map((s) => s.name));
    expect(names.size).toBe(seeds.length);
    for (let i = 1; i < seeds.length; i++) {
      const prev = seeds[i - 1];
      const current = seeds[i];
      if (!prev || !current) throw new Error("unreachable");
      expect(current.sortOrder).toBeGreaterThan(prev.sortOrder);
    }
  });

  it("seeds each account title with the preset's romanized search words", () => {
    const seeds = standardAccountTitleSeeds();
    expect(seeds.find((s) => s.name === "現金")?.searchWords).toEqual(["genkin"]);
    for (const seed of seeds) expect(seed.searchWords.length).toBeGreaterThan(0);
  });
});
