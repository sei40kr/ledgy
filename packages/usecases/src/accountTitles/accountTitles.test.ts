import type {
  AccountTitle,
  AccountTitleId,
  SubAccountTitle,
  SubAccountTitleId,
  TenantId,
} from "@account-ledgers/domain";

const tenant = "t1" as TenantId;
const accountTitleId = (value: string) => value as AccountTitleId;
const subAccountTitleId = (value: string) => value as SubAccountTitleId;
import { describe, expect, it } from "vitest";
import {
  AccountTitleNameRequiredError,
  AccountTitleNameTakenError,
} from "./errors";
import type { AccountTitleRepository } from "../ports/accountTitleRepository";
import { createAccountTitleUseCase } from "./createAccountTitle";
import { createSubAccountTitleUseCase } from "./createSubAccountTitle";
import { listAccountTitlesUseCase } from "./listAccountTitles";
import { listSubAccountTitlesUseCase } from "./listSubAccountTitles";
import { setAccountTitleActiveUseCase } from "./setAccountTitleActive";
import { setSubAccountTitleActiveUseCase } from "./setSubAccountTitleActive";
import { updateAccountTitleUseCase } from "./updateAccountTitle";
import { updateSubAccountTitleUseCase } from "./updateSubAccountTitle";

/** Wires every account-title usecase to one fake repository. */
function createAccountUseCases(deps: { accountTitles: AccountTitleRepository }) {
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

/** In-memory fake repository — proof that the application layer does not depend on Firebase. */
function createFakeAccountRepository(initial: AccountTitle[] = []) {
  const accountTitles = new Map<string, AccountTitle>(initial.map((a) => [a.id, a]));
  const subAccountTitles = new Map<string, SubAccountTitle[]>();
  let nextId = 1;

  const repo: AccountTitleRepository = {
    async list() {
      return [...accountTitles.values()].sort((a, b) => a.sortOrder - b.sortOrder);
    },
    async add(_tenantId, accountTitle) {
      const id = accountTitleId(`acc-${nextId++}`);
      accountTitles.set(id, { id, ...accountTitle });
      return id;
    },
    async save(_tenantId, accountTitle) {
      if (!accountTitles.has(accountTitle.id)) throw new Error("not found");
      accountTitles.set(accountTitle.id, accountTitle);
    },
    async listSubAccountTitles(_tenantId, accountTitleId) {
      return subAccountTitles.get(accountTitleId) ?? [];
    },
    async addSubAccountTitle(_tenantId, accountTitleId, subAccountTitle) {
      const id = subAccountTitleId(`sub-${nextId++}`);
      const list = subAccountTitles.get(accountTitleId) ?? [];
      list.push({ id, ...subAccountTitle });
      subAccountTitles.set(accountTitleId, list);
      return id;
    },
    async saveSubAccountTitle(_tenantId, accountTitleId, subAccountTitle) {
      const list = subAccountTitles.get(accountTitleId) ?? [];
      const index = list.findIndex((s) => s.id === subAccountTitle.id);
      if (index === -1) throw new Error("not found");
      list[index] = subAccountTitle;
    },
  };
  return repo;
}

const baseAccount: AccountTitle = {
  id: accountTitleId("acc-cash"),
  name: "現金",
  category: "asset",
  isActive: true,
  defaultTaxCategory: null,
  searchWords: [],
  sortOrder: 10,
};

describe("account title usecases", () => {
  it("assigns the next sortOrder at the end when an account title is created", async () => {
    const usecases = createAccountUseCases({
      accountTitles: createFakeAccountRepository([baseAccount]),
    });
    await usecases.create({
      tenantId: tenant,
      name: "新科目",
      category: "expense",
      defaultTaxCategory: null,
      searchWords: [],
    });
    const list = await usecases.list(tenant);
    expect(list).toHaveLength(2);
    expect(list[1]?.sortOrder).toBe(20);
  });

  it("persists the search words as given on create", async () => {
    const usecases = createAccountUseCases({
      accountTitles: createFakeAccountRepository(),
    });
    await usecases.create({
      tenantId: tenant,
      name: "普通預金",
      category: "asset",
      defaultTaxCategory: null,
      searchWords: ["bank", "銀行"],
    });
    const list = await usecases.list(tenant);
    expect(list[0]?.searchWords).toEqual(["bank", "銀行"]);
  });

  it("rejects a duplicate name", async () => {
    const usecases = createAccountUseCases({
      accountTitles: createFakeAccountRepository([baseAccount]),
    });
    await expect(
      usecases.create({
        tenantId: tenant,
        name: "現金",
        category: "asset",
        defaultTaxCategory: null,
        searchWords: [],
      }),
    ).rejects.toThrow(AccountTitleNameTakenError);
  });

  it("rejects an empty account title name", async () => {
    const usecases = createAccountUseCases({
      accountTitles: createFakeAccountRepository(),
    });
    await expect(
      usecases.create({
        tenantId: tenant,
        name: "   ",
        category: "asset",
        defaultTaxCategory: null,
        searchWords: [],
      }),
    ).rejects.toThrow(AccountTitleNameRequiredError);
  });

  it("allows an account title to keep its own name on update", async () => {
    const usecases = createAccountUseCases({
      accountTitles: createFakeAccountRepository([baseAccount]),
    });
    await usecases.update({
      tenantId: tenant,
      accountTitleId: accountTitleId("acc-cash"),
      name: "現金(改名)",
      defaultTaxCategory: null,
      searchWords: [],
    });
    const list = await usecases.list(tenant);
    expect(list[0]?.name).toBe("現金(改名)");
  });

  it("deactivates and reactivates an account title; there is no delete API", async () => {
    const repo = createFakeAccountRepository([baseAccount]);
    const usecases = createAccountUseCases({ accountTitles: repo });
    await usecases.setActive({
      tenantId: tenant,
      accountTitleId: accountTitleId("acc-cash"),
      isActive: false,
    });
    expect((await usecases.list(tenant))[0]?.isActive).toBe(false);
    await usecases.setActive({
      tenantId: tenant,
      accountTitleId: accountTitleId("acc-cash"),
      isActive: true,
    });
    expect((await usecases.list(tenant))[0]?.isActive).toBe(true);
  });

  it("creates, renames, and deactivates a sub account title", async () => {
    const usecases = createAccountUseCases({
      accountTitles: createFakeAccountRepository([baseAccount]),
    });
    const subId = await usecases.createSubAccount({
      tenantId: tenant,
      accountTitleId: accountTitleId("acc-cash"),
      name: "レジ現金",
      searchWords: [],
    });
    await usecases.updateSubAccount({
      tenantId: tenant,
      accountTitleId: accountTitleId("acc-cash"),
      subAccountTitleId: subId,
      name: "レジ現金A",
      searchWords: [],
    });
    await usecases.setSubAccountActive({
      tenantId: tenant,
      accountTitleId: accountTitleId("acc-cash"),
      subAccountTitleId: subId,
      isActive: false,
    });
    const subs = await usecases.listSubAccounts(tenant, accountTitleId("acc-cash"));
    expect(subs).toEqual([
      { id: subId, name: "レジ現金A", isActive: false, searchWords: [], sortOrder: 10 },
    ]);
  });
});
