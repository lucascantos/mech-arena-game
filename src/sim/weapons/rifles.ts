import { BurstWeapon } from "./burstWeapon";
import { ChargeWeapon } from "./chargeWeapon";
import { ExplosiveWeapon } from "./explosiveWeapon";
import { Weapon } from "./weapon";

/** Light and very fast, but wild and weak past close range. */
export class SubmachineGun extends Weapon {
  constructor() {
    super({
      name: "SMG",
      shortName: "SMG",
      mount: "hand",
      damageType: "bullet",
      damage: 3,
      fireMode: "auto",
      fireRate: 16,
      magazine: 50,
      reloadTime: 1.6,
      pellets: 1,
      spread: 8,
      recoil: 0.8,
      maxRecoil: 10,
      recoilRecovery: 30,
      projectileSpeed: 950,
      projectileSize: 4,
      range: 1000,
      falloffStart: 250,
      falloffMin: 0.3,
      knockback: 8,
      selfStagger: 0,
      weight: 6,
    });
  }
}

/** Three quick, accurate rounds per click. Good all-rounder at mid range. */
export class BurstRifle extends BurstWeapon {
  constructor() {
    super({
      name: "Burst Rifle",
      shortName: "BR",
      mount: "hand",
      damageType: "bullet",
      damage: 9,
      fireMode: "semi",
      fireRate: 2.2,
      magazine: 30,
      reloadTime: 2.2,
      pellets: 1,
      spread: 2,
      recoil: 1.5,
      maxRecoil: 8,
      recoilRecovery: 18,
      projectileSpeed: 1300,
      projectileSize: 5,
      range: 1500,
      falloffStart: 700,
      falloffMin: 0.5,
      knockback: 20,
      selfStagger: 0,
      weight: 11,
      burstCount: 3,
      burstInterval: 0.06,
    });
  }
}

/** Hold to charge a very fast slug; a full charge hits hard. Everyone sees the aiming line while you charge. */
export class LinearRifle extends ChargeWeapon {
  constructor() {
    super({
      name: "Linear Rifle",
      shortName: "LR",
      mount: "hand",
      damageType: "bullet",
      damage: 40,
      fireMode: "semi",
      fireRate: 2,
      magazine: 5,
      reloadTime: 2.4,
      pellets: 1,
      spread: 0.5,
      recoil: 2,
      maxRecoil: 4,
      recoilRecovery: 10,
      projectileSpeed: 2400,
      projectileSize: 6,
      range: 1800,
      falloffStart: 1000,
      falloffMin: 0.7,
      knockback: 120,
      selfStagger: 0,
      weight: 16,
      chargeTime: 0.8,
      minPower: 0.35,
      chargingSpeed: 0.85,
    });
  }
}

/** Slow energy orbs that burst on impact: splash damage without the weight of a launcher. */
export class PlasmaRifle extends ExplosiveWeapon {
  constructor() {
    super({
      name: "Plasma Rifle",
      shortName: "PR",
      mount: "hand",
      damageType: "energy",
      damage: 12,
      fireMode: "auto",
      fireRate: 3,
      magazine: 12,
      reloadTime: 2.5,
      pellets: 1,
      spread: 3,
      recoil: 2,
      maxRecoil: 8,
      recoilRecovery: 12,
      projectileSpeed: 800,
      projectileSize: 9,
      range: 1300,
      falloffStart: 1300,
      falloffMin: 1,
      knockback: 60,
      selfStagger: 0,
      weight: 16,
      blastRadius: 40,
      fuse: 2,
    });
  }
}
