import { describe, expect, it } from "vitest";
import { STANDARD_ACCOUNT_TITLE_PRESETS } from "./standardAccountTitles";

describe("STANDARD_ACCOUNT_TITLE_PRESETS", () => {
  it("defines roughly 50 account titles", () => {
    expect(STANDARD_ACCOUNT_TITLE_PRESETS.length).toBeGreaterThanOrEqual(45);
    expect(STANDARD_ACCOUNT_TITLE_PRESETS.length).toBeLessThanOrEqual(60);
  });

  it("uses unique names", () => {
    const names = STANDARD_ACCOUNT_TITLE_PRESETS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("covers all five categories, including the sole-proprietor account titles 事業主貸 / 事業主借 / 元入金", () => {
    const names = STANDARD_ACCOUNT_TITLE_PRESETS.map((p) => p.name);
    expect(names).toContain("事業主貸");
    expect(names).toContain("事業主借");
    expect(names).toContain("元入金");
    expect(names).toContain("売上高");
    expect(names).toContain("仕入高");
    const categories = new Set(STANDARD_ACCOUNT_TITLE_PRESETS.map((p) => p.category));
    expect(categories).toEqual(
      new Set(["asset", "liability", "equity", "revenue", "expense"]),
    );
  });

  it("gives every account title its Hepburn romanization as a search word", () => {
    for (const preset of STANDARD_ACCOUNT_TITLE_PRESETS) {
      expect(preset.searchWords.length).toBeGreaterThan(0);
      for (const word of preset.searchWords) {
        expect(word).toMatch(/^[a-z]+$/);
      }
    }
  });
});
