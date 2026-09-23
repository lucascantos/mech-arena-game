import { AGGRESSIVE, BALANCED, CAUTIOUS, type Personality } from "../ai/personality";
import { BIPEDAL, QUADPOD, TREADS, type Legs } from "../sim/parts/legs";
import { ENERGY_RIFLE, MACHINE_GUN, ROCKET_LAUNCHER, SHOTGUN } from "../sim/weapons/catalog";
import type { WeaponStats } from "../sim/weapons/weaponStats";

/**
 * A ready-made mech build. New part slots (torso, head, arms...) get added
 * here as they're introduced.
 */
export interface MechPreset {
  /** Key used to pick it, e.g. in the URL (?red=brawler). */
  id: string;
  name: string;
  legs: Legs;
  weapon1: WeaponStats;
  weapon2: WeaponStats;
  /** How the bot plays when an AI drives this build. */
  personality: Personality;
}

export const PRESETS: MechPreset[] = [
  {
    id: "brawler",
    name: "Brawler",
    legs: BIPEDAL,
    weapon1: SHOTGUN,
    weapon2: MACHINE_GUN,
    personality: AGGRESSIVE,
  },
  {
    id: "artillery",
    name: "Artillery",
    legs: QUADPOD,
    weapon1: ENERGY_RIFLE,
    weapon2: ROCKET_LAUNCHER,
    personality: CAUTIOUS,
  },
  {
    id: "juggernaut",
    name: "Juggernaut",
    legs: TREADS,
    weapon1: SHOTGUN,
    weapon2: ROCKET_LAUNCHER,
    personality: AGGRESSIVE,
  },
  {
    id: "marksman",
    name: "Marksman",
    legs: BIPEDAL,
    weapon1: ENERGY_RIFLE,
    weapon2: MACHINE_GUN,
    personality: CAUTIOUS,
  },
  {
    id: "gatling-fort",
    name: "Gatling Fort",
    legs: QUADPOD,
    weapon1: MACHINE_GUN,
    weapon2: MACHINE_GUN,
    personality: BALANCED,
  },
];

export function findPreset(id: string | null | undefined): MechPreset | undefined {
  return PRESETS.find((p) => p.id === id?.toLowerCase());
}
