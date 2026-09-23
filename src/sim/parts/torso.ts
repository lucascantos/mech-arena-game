/**
 * Torso part. Decides how much the mech can carry and how much it can take,
 * at the cost of weight (speed), recovery (cooldowns) and a bigger hitbox.
 */
export interface Torso {
  name: string;
  shortName: string;
  /** HP the torso contributes; added to the legs' HP. */
  hp: number;
  /** How many weapons can be equipped. */
  weaponCapacity: number;
  /** Multiplier on move speed (weight). */
  moveSpeedMultiplier: number;
  /** Multiplier on defense cooldowns (e.g. dodge). */
  cooldownMultiplier: number;
  /** Added to both sides of the bounding box. */
  sizeBonus: number;
}

/** Fast and quick to recover, but fragile and carries one weapon. */
export const LIGHT_TORSO: Torso = {
  name: "Light",
  shortName: "LT",
  hp: 120,
  weaponCapacity: 1,
  moveSpeedMultiplier: 1.12,
  cooldownMultiplier: 0.75,
  sizeBonus: -6,
};

export const MEDIUM_TORSO: Torso = {
  name: "Medium",
  shortName: "MD",
  hp: 200,
  weaponCapacity: 2,
  moveSpeedMultiplier: 1,
  cooldownMultiplier: 1,
  sizeBonus: 0,
};

/** Tough and carries three weapons, but slow, sluggish and a big target. */
export const HEAVY_TORSO: Torso = {
  name: "Heavy",
  shortName: "HV",
  hp: 300,
  weaponCapacity: 3,
  moveSpeedMultiplier: 0.85,
  cooldownMultiplier: 1.3,
  sizeBonus: 8,
};
