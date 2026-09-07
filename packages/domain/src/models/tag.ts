import type { TagId } from "./ids";

/**
 * A tag (タグ) a transaction can be labelled with. Identity plus a name and the
 * extra terms its picker matches on. Managed like a partner.
 */
export interface Tag {
  id: TagId;
  name: string;
  /** Extra terms the tag picker matches on, besides the name. */
  searchWords: string[];
}
