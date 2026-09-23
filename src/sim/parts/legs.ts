import type { Vec2 } from "../vec";

/**
 * Leg part. Legs decide how a mech moves and how steady it is: speed,
 * acceleration, turning, dash, and how much recoil/knockback it shrugs off.
 */
export interface Legs {
  name: string;
  shortName: string;
  /** HP the legs contribute (durability); added to the torso's HP. */
  hp: number;
  /** Bounding box. Heavier legs are bigger targets. */
  size: Vec2;
  /** Top speed, units per second. */
  moveSpeed: number;
  /** How fast velocity changes toward the desired velocity, units/s². Low = slides. */
  acceleration: number;
  /** Max aim rotation, degrees per second. */
  turnRate: number;
  /** Multiplier on weapon recoil bloom. Lower = more stable. */
  recoilMultiplier: number;
  /** Multiplier on knockback received. Lower = more stable. */
  knockbackMultiplier: number;
  /** Multiplier on dodge dash speed. */
  dashSpeedMultiplier: number;
  /** Multiplier on dodge cooldown. */
  dashCooldownMultiplier: number;
}

/** All-rounder: fast and balanced, no major specialization. */
export const BIPEDAL: Legs = {
  name: "Bipedal",
  shortName: "BIP",
  hp: 100,
  size: { x: 48, y: 48 },
  moveSpeed: 280,
  acceleration: 2400,
  turnRate: 720,
  recoilMultiplier: 1,
  knockbackMultiplier: 1,
  dashSpeedMultiplier: 1,
  dashCooldownMultiplier: 1,
};

/** Ranged / artillery: very stable, but slow to get going and slow to turn. */
export const QUADPOD: Legs = {
  name: "Quadpod",
  shortName: "QUAD",
  hp: 140,
  size: { x: 54, y: 54 },
  moveSpeed: 230,
  acceleration: 700,
  turnRate: 300,
  recoilMultiplier: 0.35,
  knockbackMultiplier: 0.5,
  dashSpeedMultiplier: 0.85,
  dashCooldownMultiplier: 1.3,
};

/** Tank: very durable and stable, slow movement. */
export const TREADS: Legs = {
  name: "Treads",
  shortName: "TANK",
  hp: 250,
  size: { x: 62, y: 62 },
  moveSpeed: 170,
  acceleration: 1400,
  turnRate: 420,
  recoilMultiplier: 0.5,
  knockbackMultiplier: 0.25,
  dashSpeedMultiplier: 0.7,
  dashCooldownMultiplier: 1.6,
};
