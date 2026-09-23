import { Ability } from "./ability";

/**
 * Base class for every defensive ability (dodge, block, parry, shield, ...).
 * A fighter equips one defense; input `defend` triggers it.
 */
export abstract class Defense extends Ability {
  readonly kind = "defense" as const;
}
