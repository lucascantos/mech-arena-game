import type { Vec2 } from "../vec";
import type { Legs } from "./legs";
import type { Torso } from "./torso";

/**
 * The final numbers a fighter plays with, combined from all its parts.
 * New parts (head, arms...) add or multiply into this.
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
}

export interface Parts {
  legs: Legs;
  torso: Torso;
}

export function computeStats(parts: Parts): FighterStats {
  const { legs, torso } = parts;
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
  };
}
