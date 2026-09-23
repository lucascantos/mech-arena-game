import { Weapon } from "./weapon";

/** Lots of weak bullets. Recoil builds up fast during long bursts. */
export class MachineGun extends Weapon {
  constructor() {
    super({
      name: "Machine Gun",
      shortName: "MG",
      damageType: "bullet",
      damage: 4,
      fireMode: "auto",
      fireRate: 12,
      magazine: 40,
      reloadTime: 2.0,
      pellets: 1,
      spread: 4,
      recoil: 1.2,
      maxRecoil: 12,
      recoilRecovery: 25,
      projectileSpeed: 1000,
      projectileSize: 5,
      range: 650,
      knockback: 15,
      selfStagger: 0,
    });
  }
}

/** A wide burst of pellets. */
export class Shotgun extends Weapon {
  constructor() {
    super({
      name: "Shotgun",
      shortName: "SG",
      damageType: "bullet",
      damage: 6,
      fireMode: "semi",
      fireRate: 1.4,
      magazine: 6,
      reloadTime: 2.2,
      pellets: 8,
      spread: 26,
      recoil: 6,
      maxRecoil: 10,
      recoilRecovery: 20,
      projectileSpeed: 900,
      projectileSize: 5,
      range: 650,
      knockback: 35,
      selfStagger: 0,
    });
  }
}

/** Fast, accurate energy bolts. */
export class EnergyRifle extends Weapon {
  constructor() {
    super({
      name: "Energy Rifle",
      shortName: "ER",
      damageType: "energy",
      damage: 14,
      fireMode: "semi",
      fireRate: 2.5,
      magazine: 8,
      reloadTime: 1.8,
      pellets: 1,
      spread: 1,
      recoil: 3,
      maxRecoil: 8,
      recoilRecovery: 12,
      projectileSpeed: 1600,
      projectileSize: 6,
      range: 900,
      knockback: 40,
      selfStagger: 0,
    });
  }
}
