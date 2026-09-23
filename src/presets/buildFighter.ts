import { Dodge } from "../sim/abilities/defenses/dodge";
import { Fighter } from "../sim/fighter";
import type { Vec2 } from "../sim/vec";
import type { MechPreset } from "./presets";

/** Who/where the fighter is in this match; the preset says what it is. */
export interface Placement {
  id: number;
  team: number;
  color: string;
  pos: Vec2;
  /** Overrides the preset's name (e.g. to tell duplicates apart). */
  name?: string;
}

/**
 * Assembles a fighter from a preset. Every build gets a Dodge for now.
 * Throws if the preset has more weapons than its torso can carry.
 */
export function buildFighter(preset: MechPreset, at: Placement): Fighter {
  const fighter = new Fighter({ ...at, name: at.name ?? preset.name, legs: preset.legs, torso: preset.torso, head: preset.head });
  for (const WeaponType of preset.weapons) fighter.equipWeapon(new WeaponType());
  fighter.setBackUnit(new preset.back());
  return fighter.setDefense(new Dodge());
}
