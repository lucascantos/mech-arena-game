import type { Vec2 } from "../vec";
import type { Legs } from "./legs";

/**
 * The final numbers a fighter plays with, combined from all its parts.
 * Only legs exist today; torso/head/arms will add or multiply into this.
 */
export interface FighterStats {
  maxHp: number;
  size: Vec2;
  moveSpeed: number;
  acceleration: number;
  turnRate: number;
  recoilMultiplier: number;
  knockbackMultiplier: number;
  dashSpeedMultiplier: number;
  dashCooldownMultiplier: number;
}

export interface Parts {
  legs: Legs;
}

export function computeStats(parts: Parts): FighterStats {
  const { legs } = parts;
  return {
    maxHp: legs.hp,
    size: { ...legs.size },
    moveSpeed: legs.moveSpeed,
    acceleration: legs.acceleration,
    turnRate: legs.turnRate,
    recoilMultiplier: legs.recoilMultiplier,
    knockbackMultiplier: legs.knockbackMultiplier,
    dashSpeedMultiplier: legs.dashSpeedMultiplier,
    dashCooldownMultiplier: legs.dashCooldownMultiplier,
  };
}
