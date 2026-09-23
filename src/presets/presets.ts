import { AGGRESSIVE, BALANCED, CAUTIOUS, type Personality } from "../ai/personality";
import { BIPEDAL, QUADPOD, TREADS, type Legs } from "../sim/parts/legs";
import { HEAVY_TORSO, LIGHT_TORSO, MEDIUM_TORSO, type Torso } from "../sim/parts/torso";
import { ENERGY_RIFLE, MACHINE_GUN, ROCKET_LAUNCHER, SHOTGUN } from "../sim/weapons/catalog";
import type { WeaponStats } from "../sim/weapons/weaponStats";

/**
 * A ready-made mech build. New part slots (head, arms...) get added here as
 * they're introduced.
 */
export interface MechPreset {
  /** Key used to pick it, e.g. in the URL (?red=brawler). */
  id: string;
  name: string;
  legs: Legs;
  torso: Torso;
  /** Up to the torso's weapon capacity (Light 1, Medium 2, Heavy 3). */
  weapons: WeaponStats[];
  /** How the bot plays when an AI drives this build. */
  personality: Personality;
}

export const PRESETS: MechPreset[] = [
  {
    id: "brawler",
    name: "Brawler",
    legs: BIPEDAL,
    torso: MEDIUM_TORSO,
    weapons: [SHOTGUN, MACHINE_GUN],
    personality: AGGRESSIVE,
  },
  {
    id: "artillery",
    name: "Artillery",
    legs: QUADPOD,
    torso: HEAVY_TORSO,
    weapons: [ENERGY_RIFLE, ROCKET_LAUNCHER, MACHINE_GUN],
    personality: CAUTIOUS,
  },
  {
    id: "juggernaut",
    name: "Juggernaut",
    legs: TREADS,
    torso: HEAVY_TORSO,
    weapons: [SHOTGUN, ROCKET_LAUNCHER, MACHINE_GUN],
    personality: AGGRESSIVE,
  },
  {
    id: "marksman",
    name: "Marksman",
    legs: BIPEDAL,
    torso: MEDIUM_TORSO,
    weapons: [ENERGY_RIFLE, MACHINE_GUN],
    personality: CAUTIOUS,
  },
  {
    id: "gatling-fort",
    name: "Gatling Fort",
    legs: QUADPOD,
    torso: MEDIUM_TORSO,
    weapons: [MACHINE_GUN, MACHINE_GUN],
    personality: BALANCED,
  },
  {
    id: "skirmisher",
    name: "Skirmisher",
    legs: BIPEDAL,
    torso: LIGHT_TORSO,
    weapons: [SHOTGUN],
    personality: AGGRESSIVE,
  },
  {
    // Lightest build carrying the heaviest weapon: fast and fragile, one rocket launcher.
    id: "glass-cannon",
    name: "Glass Cannon",
    legs: BIPEDAL,
    torso: LIGHT_TORSO,
    weapons: [ROCKET_LAUNCHER],
    personality: CAUTIOUS,
  },
];

export function findPreset(id: string | null | undefined): MechPreset | undefined {
  return PRESETS.find((p) => p.id === id?.toLowerCase());
}
