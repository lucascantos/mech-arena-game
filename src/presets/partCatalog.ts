import type { BackUnitClass } from "../sim/back/backUnit";
import { PulseShield } from "../sim/back/pulseShield";
import { HUNTER_HEAD, SCOUT_HEAD, STANDARD_HEAD, type Head } from "../sim/parts/head";
import { BIPEDAL, QUADPOD, TREADS, type Legs } from "../sim/parts/legs";
import { HEAVY_TORSO, LIGHT_TORSO, MEDIUM_TORSO, type Torso } from "../sim/parts/torso";
import * as W from "../sim/weapons/catalog";

/** Everything a mech can be built from, in the order the hangar lists it. */
export const LEGS: readonly Legs[] = [BIPEDAL, QUADPOD, TREADS];
export const TORSOS: readonly Torso[] = [LIGHT_TORSO, MEDIUM_TORSO, HEAVY_TORSO];
export const HEADS: readonly Head[] = [STANDARD_HEAD, SCOUT_HEAD, HUNTER_HEAD];

export const HAND_WEAPONS: readonly W.WeaponClass[] = [
  W.MachineGun, W.SubmachineGun, W.Pistol, W.Shotgun, W.EnergyRifle, W.LinearRifle, W.Railgun, W.ArmCannon, W.RocketLauncher,
  W.EnergySword,
];

export const BACK_UNITS: readonly BackUnitClass[] = [
  W.GatlingGun, W.MissileLauncher, W.MultiLockLauncher, W.GrenadeLauncher, W.LaserCannon, PulseShield,
];

/** Display name of a weapon or back unit class (built once per class). */
const names = new Map<unknown, string>();
export function unitName(C: W.WeaponClass | BackUnitClass): string {
  let n = names.get(C);
  if (n === undefined) names.set(C, (n = new C().name));
  return n;
}
