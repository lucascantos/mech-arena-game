import { AGGRESSIVE, BALANCED, CAUTIOUS, type Personality } from "../ai/personality";
import { BIPEDAL, QUADPOD, TREADS, type Legs } from "../sim/parts/legs";
import { HEAVY_TORSO, LIGHT_TORSO, MEDIUM_TORSO, type Torso } from "../sim/parts/torso";
import { EnergyRifle, MachineGun, MissileLauncher, Shotgun, type WeaponClass } from "../sim/weapons/catalog";

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
  weapons: WeaponClass[];
  /** How the bot plays when an AI drives this build. */
  personality: Personality;
}

export const PRESETS: MechPreset[] = [
  {
    id: "brawler",
    name: "Brawler",
    legs: BIPEDAL,
    torso: MEDIUM_TORSO,
    weapons: [Shotgun, MachineGun],
    personality: AGGRESSIVE,
  },
  {
    id: "artillery",
    name: "Artillery",
    legs: QUADPOD,
    torso: HEAVY_TORSO,
    weapons: [EnergyRifle, MissileLauncher, MachineGun],
    personality: CAUTIOUS,
  },
  {
    id: "juggernaut",
    name: "Juggernaut",
    legs: TREADS,
    torso: HEAVY_TORSO,
    weapons: [Shotgun, MissileLauncher, MachineGun],
    personality: AGGRESSIVE,
  },
  {
    id: "marksman",
    name: "Marksman",
    legs: BIPEDAL,
    torso: MEDIUM_TORSO,
    weapons: [EnergyRifle, MachineGun],
    personality: CAUTIOUS,
  },
  {
    id: "gatling-fort",
    name: "Gatling Fort",
    legs: QUADPOD,
    torso: MEDIUM_TORSO,
    weapons: [MachineGun, MachineGun],
    personality: BALANCED,
  },
  {
    id: "skirmisher",
    name: "Skirmisher",
    legs: BIPEDAL,
    torso: LIGHT_TORSO,
    weapons: [Shotgun],
    personality: AGGRESSIVE,
  },
  {
    // Lightest build carrying the heaviest weapon: fast and fragile, one missile launcher.
    id: "glass-cannon",
    name: "Glass Cannon",
    legs: BIPEDAL,
    torso: LIGHT_TORSO,
    weapons: [MissileLauncher],
    personality: CAUTIOUS,
  },
];

export function findPreset(id: string | null | undefined): MechPreset | undefined {
  return PRESETS.find((p) => p.id === id?.toLowerCase());
}
