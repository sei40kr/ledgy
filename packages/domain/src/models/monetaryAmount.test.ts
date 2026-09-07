import { describe, expect, it } from "vitest";
import { MonetaryAmount, MonetaryAmountNotIntegerError } from "./monetaryAmount";

describe("MonetaryAmount", () => {
  it("accepts integer yen, including zero and negatives", () => {
    expect(new MonetaryAmount(1000).value).toBe(1000);
    expect(new MonetaryAmount(0).value).toBe(0);
    expect(new MonetaryAmount(-500).value).toBe(-500);
  });

  it("rejects non-integers", () => {
    expect(() => new MonetaryAmount(100.5)).toThrow(MonetaryAmountNotIntegerError);
    expect(() => new MonetaryAmount(0.1)).toThrow(MonetaryAmountNotIntegerError);
  });

  it("rejects NaN, Infinity, and unsafe integers", () => {
    expect(() => new MonetaryAmount(Number.NaN)).toThrow(MonetaryAmountNotIntegerError);
    expect(() => new MonetaryAmount(Number.POSITIVE_INFINITY)).toThrow(MonetaryAmountNotIntegerError);
    expect(() => new MonetaryAmount(Number.MAX_SAFE_INTEGER + 1)).toThrow(MonetaryAmountNotIntegerError);
  });

  it("names the violated rule", () => {
    expect(() => new MonetaryAmount(1.5)).toThrow(MonetaryAmountNotIntegerError);
  });
});
