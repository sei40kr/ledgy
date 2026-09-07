import type { PartnerId } from "./ids";

/**
 * A trading partner (取引先): a customer or supplier a transaction can reference.
 * Identity plus a name and the extra terms its picker matches on.
 */
export interface Partner {
  id: PartnerId;
  name: string;
  /** Extra terms the partner picker matches on, besides the name. */
  searchWords: string[];
}
