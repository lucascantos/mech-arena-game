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

/** Assembles a fighter from a preset. Every build gets a Dodge for now. */
export function buildFighter(preset: MechPreset, at: Placement): Fighter {
  return new Fighter({ ...at, name: preset.name, legs: preset.legs })
    .equipWeapon(new Weapon(preset.weapon1))
    .equipWeapon(new Weapon(preset.weapon2))
    .setDefense(new Dodge());
}
