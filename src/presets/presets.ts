import { AGGRESSIVE, BALANCED, CAUTIOUS, type Personality } from "../ai/personality";
import { HUNTER_HEAD, SCOUT_HEAD, STANDARD_HEAD, type Head } from "../sim/parts/head";
import { BIPEDAL, QUADPOD, TREADS, type Legs } from "../sim/parts/legs";
import { HEAVY_TORSO, LIGHT_TORSO, MEDIUM_TORSO, type Torso } from "../sim/parts/torso";
import type { BackUnitClass } from "../sim/back/backUnit";
import { PulseShield } from "../sim/back/pulseShield";
import {
  BurstRifle, EnergyRifle, EnergySword, GatlingGun, GrenadeLauncher, LaserCannon, LinearRifle, MachineGun, MissileLauncher, MultiLockLauncher,
  PlasmaRifle, Shotgun, SubmachineGun, type WeaponClass,
} from "../sim/weapons/catalog";

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
  head: Head;
  /** Up to the torso's weapon capacity (Light 1, Medium 2, Heavy 3). */
  weapons: WeaponClass[];
  /** The single back-slot unit, used with right click. */
  back: BackUnitClass;
  /** How the bot plays when an AI drives this build. */
  personality: Personality;
}

export const PRESETS: MechPreset[] = [
  {
    id: "brawler",
    name: "Brawler",
    legs: BIPEDAL,
    torso: MEDIUM_TORSO,
    head: STANDARD_HEAD,
    weapons: [Shotgun, MachineGun],
    back: PulseShield,
    personality: AGGRESSIVE,
  },
  {
    id: "artillery",
    name: "Artillery",
    legs: QUADPOD,
    torso: HEAVY_TORSO,
    head: SCOUT_HEAD,
    weapons: [EnergyRifle, MachineGun],
    back: GrenadeLauncher,
    personality: CAUTIOUS,
  },
  {
    id: "juggernaut",
    name: "Juggernaut",
    legs: TREADS,
    torso: HEAVY_TORSO,
    head: STANDARD_HEAD,
    weapons: [Shotgun, MachineGun],
    back: MultiLockLauncher,
    personality: AGGRESSIVE,
  },
  {
    id: "marksman",
    name: "Marksman",
    legs: BIPEDAL,
    torso: MEDIUM_TORSO,
    head: SCOUT_HEAD,
    weapons: [EnergyRifle, MachineGun],
    back: LaserCannon,
    personality: CAUTIOUS,
  },
  {
    id: "gatling-fort",
    name: "Gatling Fort",
    legs: QUADPOD,
    torso: MEDIUM_TORSO,
    head: STANDARD_HEAD,
    weapons: [MachineGun, MachineGun],
    back: GatlingGun,
    personality: BALANCED,
  },
  {
    id: "skirmisher",
    name: "Skirmisher",
    legs: BIPEDAL,
    torso: LIGHT_TORSO,
    head: HUNTER_HEAD,
    weapons: [Shotgun],
    back: PulseShield,
    personality: AGGRESSIVE,
  },
  {
    // Lightest build carrying the heaviest weapon: fast and fragile, a missile launcher on its back.
    id: "glass-cannon",
    name: "Glass Cannon",
    legs: BIPEDAL,
    torso: LIGHT_TORSO,
    head: HUNTER_HEAD,
    weapons: [MachineGun],
    back: MissileLauncher,
    personality: CAUTIOUS,
  },
  {
    // Light and twitchy: SMG spray behind a shield.
    id: "striker",
    name: "Striker",
    legs: BIPEDAL,
    torso: LIGHT_TORSO,
    head: HUNTER_HEAD,
    weapons: [SubmachineGun],
    back: PulseShield,
    personality: AGGRESSIVE,
  },
  {
    // Mid-range rifleman: bursts to pressure, charged slugs to punish.
    id: "ranger",
    name: "Ranger",
    legs: BIPEDAL,
    torso: MEDIUM_TORSO,
    head: SCOUT_HEAD,
    weapons: [BurstRifle, LinearRifle],
    back: MissileLauncher,
    personality: BALANCED,
  },
  {
    // Slow splash-damage tank.
    id: "plasma-tank",
    name: "Plasma Tank",
    legs: TREADS,
    torso: HEAVY_TORSO,
    head: STANDARD_HEAD,
    weapons: [PlasmaRifle, BurstRifle, SubmachineGun],
    back: GrenadeLauncher,
    personality: BALANCED,
  },
  {
    // Closes in behind missiles, then cuts.
    id: "ronin",
    name: "Ronin",
    legs: BIPEDAL,
    torso: MEDIUM_TORSO,
    head: HUNTER_HEAD,
    weapons: [EnergySword, SubmachineGun],
    back: MultiLockLauncher,
    personality: AGGRESSIVE,
  },
];

export function findPreset(id: string | null | undefined): MechPreset | undefined {
  return PRESETS.find((p) => p.id === id?.toLowerCase());
}
