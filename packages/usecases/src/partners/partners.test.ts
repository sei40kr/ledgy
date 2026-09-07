import {
  type Partner,
  type PartnerId,
  type TenantId,
} from "@account-ledgers/domain";
import { describe, expect, it } from "vitest";
import { PartnerNameRequiredError } from "./errors";
import type { PartnerRepository } from "../ports/partnerRepository";
import { createPartnerUseCase } from "./createPartner";
import { listPartnersUseCase } from "./listPartners";
import { updatePartnerUseCase } from "./updatePartner";

const tenant = "t1" as TenantId;

function createFakePartnerRepository(initial: Partner[] = []): PartnerRepository {
  const list = [...initial];
  let seq = initial.length;
  return {
    async list() {
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    },
    async add(_tenantId, partner) {
      const id = `partner-${++seq}` as PartnerId;
      list.push({ id, ...partner });
      return id;
    },
    async save(_tenantId, partner) {
      const index = list.findIndex((p) => p.id === partner.id);
      if (index === -1) throw new Error("not found");
      list[index] = partner;
    },
  };
}

function useCases(repo: PartnerRepository) {
  return {
    list: listPartnersUseCase({ partners: repo }),
    create: createPartnerUseCase({ partners: repo }),
    update: updatePartnerUseCase({ partners: repo }),
  };
}

describe("partner usecases", () => {
  it("creates a partner with the search words as given", async () => {
    const usecases = useCases(createFakePartnerRepository());
    const id = await usecases.create({
      tenantId: tenant,
      name: "株式会社サンプル",
      searchWords: ["さんぷる", "sample"],
    });
    const list = await usecases.list(tenant);
    const created = list.find((p) => p.id === id);
    expect(created?.name).toBe("株式会社サンプル");
    expect(created?.searchWords).toEqual(["さんぷる", "sample"]);
  });

  it("rejects an empty partner name on create and update", async () => {
    const usecases = useCases(
      createFakePartnerRepository([
        { id: "partner-1" as PartnerId, name: "既存", searchWords: [] },
      ]),
    );
    await expect(
      usecases.create({ tenantId: tenant, name: "  ", searchWords: [] }),
    ).rejects.toThrow(PartnerNameRequiredError);
    await expect(
      usecases.update({
        tenantId: tenant,
        partnerId: "partner-1" as PartnerId,
        name: "  ",
        searchWords: [],
      }),
    ).rejects.toThrow(PartnerNameRequiredError);
  });

  it("renames a partner", async () => {
    const usecases = useCases(
      createFakePartnerRepository([
        { id: "partner-1" as PartnerId, name: "旧名", searchWords: [] },
      ]),
    );
    await usecases.update({
      tenantId: tenant,
      partnerId: "partner-1" as PartnerId,
      name: "新名",
      searchWords: ["shinmei"],
    });
    const list = await usecases.list(tenant);
    expect(list[0]?.name).toBe("新名");
    expect(list[0]?.searchWords).toEqual(["shinmei"]);
  });
});
