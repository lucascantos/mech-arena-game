import type { Vec2 } from "../vec";
import type { Head } from "./head";
import type { Legs } from "./legs";
import type { Torso } from "./torso";

/**
 * The final numbers a fighter plays with, combined from all its parts.
 * New parts (arms...) add or multiply into this.
 */
export interface FighterStats {
  maxHp: number;
  size: Vec2;
  weaponCapacity: number;
  moveSpeed: number;
  acceleration: number;
  turnRate: number;
  recoilMultiplier: number;
  knockbackMultiplier: number;
  dashSpeedMultiplier: number;
  /** Multiplier on defense cooldowns (dash recovery from legs × torso recovery). */
  cooldownMultiplier: number;
  /** Heavy weapons fire without bracing (quads, treads). */
  firesOnTheMove: boolean;
  /** Size of your view relative to the base one; never below 1. */
  viewMultiplier: number;
  /** World units around an enemy's box in which the cursor starts a lock-on. */
  lockOnRadius: number;
  /** Seconds between radar pings. */
  radarInterval: number;
  /** Chance (0–1) that a shot crits. */
  critChance: number;
}

export interface Parts {
  legs: Legs;
  torso: Torso;
  head: Head;
}

export function computeStats(parts: Parts): FighterStats {
  const { legs, torso, head } = parts;
  return {
    maxHp: legs.hp + torso.hp,
    size: { x: legs.size.x + torso.sizeBonus, y: legs.size.y + torso.sizeBonus },
    weaponCapacity: torso.weaponCapacity,
    moveSpeed: legs.moveSpeed * torso.moveSpeedMultiplier,
    acceleration: legs.acceleration,
    turnRate: legs.turnRate,
    recoilMultiplier: legs.recoilMultiplier,
    knockbackMultiplier: legs.knockbackMultiplier,
    dashSpeedMultiplier: legs.dashSpeedMultiplier,
    cooldownMultiplier: legs.dashCooldownMultiplier * torso.cooldownMultiplier,
    firesOnTheMove: legs.firesOnTheMove,
    viewMultiplier: 1 + Math.max(0, head.viewBonus),
    lockOnRadius: head.lockOnRadius,
    radarInterval: head.radarInterval,
    critChance: head.critChance,
  };
}
