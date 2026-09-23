import type { Weapon } from "./weapon";

export { EnergyRifle, MachineGun, Shotgun } from "./guns";
export { MissileLauncher, RocketLauncher } from "./launchers";

/** A weapon class that can be equipped: `new MachineGun()` etc. Presets list these. */
export type WeaponClass = new () => Weapon;
