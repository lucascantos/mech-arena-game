import type { Vec2 } from "./vec";
import type { DamageType } from "./weapons/weaponStats";

/** Things that happened during a tick, for the renderer (and later, sounds/network). */
export type WorldEvent =
  | { kind: "impact"; pos: Vec2; damageType: DamageType }
  | { kind: "explosion"; pos: Vec2; radius: number }
  | { kind: "damage"; targetId: number; sourceId: number; amount: number; pos: Vec2 }
  | { kind: "kill"; victimId: number; killerId: number }
  /** A weapon fired `count` projectiles (pellets count individually). */
  | { kind: "shot"; ownerId: number; count: number }
  /** A projectile damaged at least one enemy (an explosion hitting several still counts once). */
  | { kind: "projectileHit"; ownerId: number }
  | { kind: "roundOver"; winnerTeam: number | null }
  | { kind: "roundStart" };
