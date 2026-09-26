import { DEFAULT_DODGE } from "../../sim/abilities/defenses/dodge";
import type { Fighter } from "../../sim/fighter";
import { BACK_UNITS, HAND_WEAPONS, HEADS, LEGS, TORSOS } from "../../presets/partCatalog";
import { BASE_DASH_COST } from "../../sim/parts/stats";

/** One number about the whole mech, shown in the picker and as a bar in the review. */
export interface Attribute {
  label: string;
  value(f: Fighter): number;
  /** The value that fills the bar (the best any build can reach). */
  max: number;
  format(v: number, f: Fighter): string;
  /** Which way is a buff (decides green/red in the part picker). */
  better: "higher" | "lower";
  /** Lower-is-better bars fill as best/value, so a full bar is still the best. */
  best?: number;
}

const top = (xs: readonly number[]) => Math.max(...xs);
const low = (xs: readonly number[]) => Math.min(...xs);
const weights = (Cs: readonly (new () => { weight: number })[]) => Cs.map((C) => new C().weight);
const dash = DEFAULT_DODGE.speed * DEFAULT_DODGE.duration;
/** Best-case mobility (the lightest builds, see stats.ts). */
const MAX_MOBILITY = 1.2;
const lightest = low(TORSOS.map((t) => t.weight)) + low(HEADS.map((h) => h.weight)) + low(weights(HAND_WEAPONS)) + low(weights(BACK_UNITS));
const heaviest = top(TORSOS.map((t) => t.weight)) + top(HEADS.map((h) => h.weight)) + 3 * top(weights(HAND_WEAPONS)) + top(weights(BACK_UNITS));
const int = (v: number) => `${Math.round(v)}`;
const pct = (v: number) => `${Math.round(v * 100)}%`;

export const HP: Attribute = { label: "HP", value: (f) => f.stats.maxHp, max: top(LEGS.map((l) => l.hp)) + top(TORSOS.map((t) => t.hp)), format: int, better: "higher" };
export const WEIGHT: Attribute = { label: "Weight", value: (f) => f.stats.weight, max: heaviest, format: int, better: "lower" };
export const SPEED: Attribute = { label: "Speed", value: (f) => f.stats.moveSpeed, max: top(LEGS.map((l) => l.moveSpeed)) * MAX_MOBILITY, format: int, better: "higher" };
export const ACCELERATION: Attribute = { label: "Acceleration", value: (f) => f.stats.acceleration, max: top(LEGS.map((l) => l.acceleration)), format: int, better: "higher" };
export const BOOST: Attribute = {
  label: "Boost power",
  value: (f) => dash * f.stats.dashSpeedMultiplier,
  max: dash * top(LEGS.map((l) => l.dashSpeedMultiplier)) * MAX_MOBILITY,
  format: int,
  better: "higher",
};
export const STABILITY: Attribute = {
  label: "Stability",
  value: (f) => 1 - f.stats.knockbackMultiplier, // share of knockback shrugged off
  max: 1 - low(LEGS.map((l) => l.knockbackMultiplier)),
  format: pct,
  better: "higher",
};
/** Dashes per full energy bar (weight), with how fast it refills (torso and legs). */
export const ENERGY: Attribute = {
  label: "Energy",
  value: (f) => f.stats.maxEnergy / f.stats.dashCost,
  max: 100 / (BASE_DASH_COST * (lightest / 60)),
  format: (v, f) => `${v.toFixed(1)} dashes · ${Math.round(f.stats.energyRegen)}/s`,
  better: "higher",
};
/** The review's energy line: just how fast it refills. */
export const ENERGY_REGEN: Attribute = {
  label: "Energy",
  value: (f) => f.stats.energyRegen,
  max: 40 * top(LEGS.map((l) => l.energyRecovery)) * top(TORSOS.map((t) => t.energyRecovery)),
  format: (v) => `${Math.round(v)}/s`,
  better: "higher",
};
export const VIEW: Attribute = {
  label: "View range",
  value: (f) => f.stats.viewMultiplier - 1,
  max: top(HEADS.map((h) => h.viewBonus)),
  format: (v) => `+${Math.round(v * 100)}%`,
  better: "higher",
};
export const RADAR: Attribute = {
  label: "Radar refresh",
  value: (f) => f.stats.radarInterval,
  max: top(HEADS.map((h) => h.radarInterval)),
  best: low(HEADS.map((h) => h.radarInterval)),
  format: (v) => `${v}s`,
  better: "lower",
};
export const CRIT: Attribute = { label: "Crit chance", value: (f) => f.stats.critChance, max: top(HEADS.map((h) => h.critChance)), format: pct, better: "higher" };
export const LOCK_ON: Attribute = { label: "Lock-on assist", value: (f) => f.stats.lockOnRadius, max: top(HEADS.map((h) => h.lockOnRadius)), format: int, better: "higher" };

/** What each part changes (speed and boost follow from weight, so only legs list them). */
export const LEGS_ATTRIBUTES = [HP, SPEED, ACCELERATION, BOOST, STABILITY];
export const TORSO_ATTRIBUTES = [HP, WEIGHT, ENERGY];
export const HEAD_ATTRIBUTES = [WEIGHT, VIEW, RADAR, CRIT, LOCK_ON];
/** The review: every mech attribute once. */
export const REVIEW_ATTRIBUTES = [HP, WEIGHT, SPEED, ACCELERATION, BOOST, STABILITY, ENERGY_REGEN, VIEW, RADAR, CRIT, LOCK_ON];

/** Bar fill, 0..1: value / max, or best / value for lower-is-better lines. */
export function fill(a: Attribute, v: number): number {
  if (a.better === "lower" && a.best !== undefined) return v <= 0 ? 1 : Math.min(1, a.best / v);
  return a.max <= 0 ? 0 : Math.max(0, Math.min(1, v / a.max));
}
