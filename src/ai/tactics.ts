import type { Fighter } from "../sim/fighter";
import { idealRange } from "./gunner";

/** A bot needs this much more speed than its target to dictate the distance. */
const FASTER_BY = 1.15;
/** Weapon sweet spots must differ by this factor for range to matter. */
const OUTRANGES_BY = 1.25;
/** When kiting, stay this far beyond the enemy's sweet spot. */
const KITE_BUFFER = 1.35;

/**
 * kite: faster and outranging, stay just outside their effective range.
 * dive: faster but outranged, close in to our own range fast.
 * hold: not faster, so speed can't decide the fight; use the personality.
 */
export type Tactic = { kind: "kite" | "dive"; range: number } | { kind: "hold" };

/**
 * Decides how speed and range should shape this fight. Uses only what a
 * player could see: the target's parts (which set its speed) and the weapon
 * in its hands.
 */
export function chooseTactic(self: Fighter, target: Fighter): Tactic {
  if (self.stats.moveSpeed < target.stats.moveSpeed * FASTER_BY) return { kind: "hold" };
  const mine = self.weapons.filter((w) => w.ammo > 0 || w === self.weapon);
  if (mine.length === 0 || !target.weapon) return { kind: "hold" };

  const mySweet = Math.max(...mine.map((w) => idealRange(w, target.size.x)));
  const myReach = Math.max(...mine.map((w) => w.stats.range)) * 0.85;
  const theirSweet = idealRange(target.weapon, self.size.x);

  if (mySweet > theirSweet * OUTRANGES_BY) {
    return { kind: "kite", range: Math.min(myReach, Math.max(mySweet, theirSweet * KITE_BUFFER)) };
  }
  if (theirSweet > mySweet * OUTRANGES_BY) return { kind: "dive", range: mySweet * 0.8 };
  return { kind: "hold" };
}
