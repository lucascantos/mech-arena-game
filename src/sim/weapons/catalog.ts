import type { Weapon } from "./weapon";

export { EnergyRifle, MachineGun, Pistol, Shotgun } from "./guns";
export { MissileLauncher, RocketLauncher } from "./launchers";
export { EnergySword } from "./blades";
export { GatlingGun } from "./gatlingGun";
export { ArmCannon, LinearRifle, Railgun, SubmachineGun } from "./rifles";

/** A weapon class that can be equipped: `new MachineGun()` etc. Presets list these. */
export type WeaponClass = new () => Weapon;

export { GrenadeLauncher } from "./grenadeLauncher";
export { LaserCannon } from "./laserCannon";
export { MultiLockLauncher } from "./multiLockLauncher";
