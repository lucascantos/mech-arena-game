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
  /** Torso + head + weapons. */
  weight: number;
  /** Multiplier on move speed and dash distance from weight (see mobility()). */
  mobility: number;
  size: Vec2;
  weaponCapacity: number;
  moveSpeed: number;
  acceleration: number;
  turnRate: number;
  recoilMultiplier: number;
  knockbackMultiplier: number;
  dashSpeedMultiplier: number;
  /** Energy pool size. */
  maxEnergy: number;
  /** Energy one dash costs; grows with weight, so lighter builds dash more. */
  dashCost: number;
  /** Energy refilled per second (legs × torso recovery). */
  energyRegen: number;
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

/** Weight at which mobility is exactly 1 (about a Medium torso with two light guns). */
const BASE_WEIGHT = 60;
/** Mobility lost (or gained) per unit of weight above (or below) BASE_WEIGHT. */
const WEIGHT_SLOPE = 0.005;
const MIN_MOBILITY = 0.6;
const MAX_ENERGY = 100;
/** Dash cost at BASE_WEIGHT; scales linearly with weight. */
const BASE_DASH_COST = 35;
/** Energy per second with recovery 1 (Bipedal + Medium torso). */
const BASE_ENERGY_REGEN = 40;
const MAX_MOBILITY = 1.2;

/** Heavier mechs move and dash slower; lighter ones faster. Clamped to [0.6, 1.2]. */
export function mobility(weight: number): number {
  return Math.min(MAX_MOBILITY, Math.max(MIN_MOBILITY, 1 + WEIGHT_SLOPE * (BASE_WEIGHT - weight)));
}

/** `carried`: weapons and back unit, each adding its weight. */
export function computeStats(parts: Parts, carried: readonly { weight: number }[] = []): FighterStats {
  const { legs, torso, head } = parts;
  const weight = torso.weight + head.weight + carried.reduce((sum, c) => sum + c.weight, 0);
  const move = mobility(weight);
  return {
    maxHp: legs.hp + torso.hp,
    weight,
    mobility: move,
    size: { x: legs.size.x + torso.sizeBonus, y: legs.size.y + torso.sizeBonus },
    weaponCapacity: torso.weaponCapacity,
    moveSpeed: legs.moveSpeed * move,
    acceleration: legs.acceleration,
    turnRate: legs.turnRate,
    recoilMultiplier: legs.recoilMultiplier,
    knockbackMultiplier: legs.knockbackMultiplier,
    dashSpeedMultiplier: legs.dashSpeedMultiplier * move, // same dash time, so less distance when heavy
    maxEnergy: MAX_ENERGY,
    dashCost: BASE_DASH_COST * (weight / BASE_WEIGHT),
    energyRegen: BASE_ENERGY_REGEN * legs.energyRecovery * torso.energyRecovery,
    firesOnTheMove: legs.firesOnTheMove,
    viewMultiplier: 1 + Math.max(0, head.viewBonus),
    lockOnRadius: head.lockOnRadius,
    radarInterval: head.radarInterval,
    critChance: head.critChance,
  };
}
