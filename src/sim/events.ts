import type { Vec2 } from "./vec";
import type { DamageType } from "./weapons/weaponStats";

/** Things that happened during a tick, for the renderer (and later, sounds/network). */
export type WorldEvent =
  | { kind: "impact"; pos: Vec2; damageType: DamageType }
  | { kind: "explosion"; pos: Vec2; radius: number; damageType: DamageType }
  | { kind: "damage"; targetId: number; sourceId: number; amount: number; pos: Vec2; crit: boolean }
  | { kind: "kill"; victimId: number; killerId: number }
  /** A weapon fired `count` projectiles (pellets count individually). */
  | { kind: "shot"; ownerId: number; count: number }
  /** A projectile damaged at least one enemy (an explosion hitting several still counts once). */
  | { kind: "projectileHit"; ownerId: number }
  /** A hitscan beam (laser cannon) from `from` to where it stopped. */
  | { kind: "beam"; ownerId: number; from: Vec2; to: Vec2; width: number }
  /** A melee sweep: an arc of `arc` degrees and `radius` around `pos`, centered on `dir`. */
  | { kind: "slash"; ownerId: number; pos: Vec2; dir: Vec2; radius: number; arc: number }
  | { kind: "roundOver"; winnerTeam: number | null }
  | { kind: "roundStart" };
