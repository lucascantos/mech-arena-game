import { Dodge } from "../sim/abilities/defenses/dodge";
import { Fighter } from "../sim/fighter";
import type { Vec2 } from "../sim/vec";
import { Weapon } from "../sim/weapons/weapon";
import type { MechPreset } from "./presets";

/** Who/where the fighter is in this match; the preset says what it is. */
export interface Placement {
  id: number;
  team: number;
  color: string;
  pos: Vec2;
}

/**
 * Assembles a fighter from a preset. Every build gets a Dodge for now.
 * Throws if the preset has more weapons than its torso can carry.
 */
export function buildFighter(preset: MechPreset, at: Placement): Fighter {
  const fighter = new Fighter({ ...at, name: preset.name, legs: preset.legs, torso: preset.torso });
  for (const stats of preset.weapons) fighter.equipWeapon(new Weapon(stats));
  return fighter.setDefense(new Dodge());
}
