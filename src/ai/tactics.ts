import type { Fighter } from "../sim/fighter";
import { normalize, sub } from "../sim/vec";
import { viewRect } from "../sim/vision";
import type { World } from "../sim/world";
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

/** Keep the target this deep inside the view at most (fraction of the distance to the view's edge). */
const IN_SIGHT = 0.85;

/**
 * The distance a bot holds when speed doesn't decide the fight: its primary
 * weapon's sweet spot (the first in its loadout, or what it's holding while
 * that reloads), a bit closer for aggressive bots and farther for cautious
 * ones, but never so far that the target would leave its view.
 */
export function holdRange(self: Fighter, target: Fighter, world: World, aggression: number): number {
  const primary = self.weapons[0];
  const weapon = primary && !primary.isReloading && primary.ammo > 0 ? primary : (self.weapon ?? primary);
  if (!weapon) return sightLimit(self, target, world);
  const sweet = idealRange(weapon, target.size.x) * (1.15 - 0.4 * aggression);
  return Math.min(sweet, sightLimit(self, target, world));
}

/** How far the target can be, in its current direction, while staying comfortably in view. */
export function sightLimit(self: Fighter, target: Fighter, world: World): number {
  const v = viewRect(self, world);
  const d = normalize(sub(target.pos, self.pos));
  const tx = d.x > 0 ? (v.max.x - self.pos.x) / d.x : d.x < 0 ? (v.min.x - self.pos.x) / d.x : Infinity;
  const ty = d.y > 0 ? (v.max.y - self.pos.y) / d.y : d.y < 0 ? (v.min.y - self.pos.y) / d.y : Infinity;
  return IN_SIGHT * Math.min(tx, ty);
}
