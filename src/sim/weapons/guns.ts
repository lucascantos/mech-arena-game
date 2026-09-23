import { Weapon } from "./weapon";

/** Lots of weak bullets. Recoil builds up fast during long bursts. Loses damage past mid range. */
export class MachineGun extends Weapon {
  constructor() {
    super({
      name: "Machine Gun",
      shortName: "MG",
      mount: "hand",
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
      range: 1300,
      falloffStart: 400,
      falloffMin: 0.4,
      knockback: 15,
      selfStagger: 0,
      weight: 10,
    });
  }
}

/** A wide burst of pellets. Devastating up close, weak at range (heavy falloff). */
export class Shotgun extends Weapon {
  constructor() {
    super({
      name: "Shotgun",
      shortName: "SG",
      mount: "hand",
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
      range: 1300,
      falloffStart: 200,
      falloffMin: 0.2,
      knockback: 35,
      selfStagger: 0,
      weight: 12,
    });
  }
}

/** Fast, accurate energy bolts that keep most of their damage at long range. */
export class EnergyRifle extends Weapon {
  constructor() {
    super({
      name: "Energy Rifle",
      shortName: "ER",
      mount: "hand",
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
      range: 1800,
      falloffStart: 900,
      falloffMin: 0.6,
      knockback: 40,
      selfStagger: 0,
      weight: 14,
    });
  }
}
