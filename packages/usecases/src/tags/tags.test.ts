import {
  type Tag,
  type TagId,
  type TenantId,
} from "@account-ledgers/domain";
import { describe, expect, it } from "vitest";
import { TagNameRequiredError } from "./errors";
import type { TagRepository } from "../ports/tagRepository";
import { createTagUseCase } from "./createTag";
import { listTagsUseCase } from "./listTags";
import { updateTagUseCase } from "./updateTag";

const tenant = "t1" as TenantId;

function createFakeTagRepository(initial: Tag[] = []): TagRepository {
  const list = [...initial];
  let seq = initial.length;
  return {
    async list() {
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    },
    async add(_tenantId, tag) {
      const id = `tag-${++seq}` as TagId;
      list.push({ id, ...tag });
      return id;
    },
    async save(_tenantId, tag) {
      const index = list.findIndex((t) => t.id === tag.id);
      if (index === -1) throw new Error("not found");
      list[index] = tag;
    },
  };
}

function useCases(repo: TagRepository) {
  return {
    list: listTagsUseCase({ tags: repo }),
    create: createTagUseCase({ tags: repo }),
    update: updateTagUseCase({ tags: repo }),
  };
}

describe("tag usecases", () => {
  it("creates a tag with the search words as given", async () => {
    const usecases = useCases(createFakeTagRepository());
    const id = await usecases.create({
      tenantId: tenant,
      name: "経費",
      searchWords: ["keihi", "expense"],
    });
    const list = await usecases.list(tenant);
    const created = list.find((t) => t.id === id);
    expect(created?.name).toBe("経費");
    expect(created?.searchWords).toEqual(["keihi", "expense"]);
  });

  it("rejects an empty tag name on create and update", async () => {
    const usecases = useCases(
      createFakeTagRepository([
        { id: "tag-1" as TagId, name: "既存", searchWords: [] },
      ]),
    );
    await expect(
      usecases.create({ tenantId: tenant, name: "  ", searchWords: [] }),
    ).rejects.toThrow(TagNameRequiredError);
    await expect(
      usecases.update({
        tenantId: tenant,
        tagId: "tag-1" as TagId,
        name: "  ",
        searchWords: [],
      }),
    ).rejects.toThrow(TagNameRequiredError);
  });

  it("renames a tag", async () => {
    const usecases = useCases(
      createFakeTagRepository([
        { id: "tag-1" as TagId, name: "旧", searchWords: [] },
      ]),
    );
    await usecases.update({
      tenantId: tenant,
      tagId: "tag-1" as TagId,
      name: "新",
      searchWords: ["shin"],
    });
    const list = await usecases.list(tenant);
    expect(list[0]?.name).toBe("新");
    expect(list[0]?.searchWords).toEqual(["shin"]);
  });
});
