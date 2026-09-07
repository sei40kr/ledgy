/**
 * Japanese consumption tax classification (消費税区分). Distinguishes sales from
 * purchases and the rate. The MVP records it from the start but never computes
 * tax from it.
 */
export type TaxCategoryCode =
  | "taxableSales10" // 課税売上 10%
  | "taxableSales8" // 課税売上 8%(軽減税率)
  | "taxablePurchase10" // 課税仕入 10%
  | "taxablePurchase8" // 課税仕入 8%(軽減税率)
  | "nonTaxable" // 非課税
  | "taxExempt" // 免税
  | "outOfScope"; // 不課税(対象外)

export const TAX_CATEGORY_CODES: TaxCategoryCode[] = [
  "taxableSales10",
  "taxableSales8",
  "taxablePurchase10",
  "taxablePurchase8",
  "nonTaxable",
  "taxExempt",
  "outOfScope",
];

/** A consumption tax classification, as a value object. */
export class TaxCategory {
  constructor(readonly code: TaxCategoryCode) {}

  equals(other: TaxCategory): boolean {
    return this.code === other.code;
  }
}
