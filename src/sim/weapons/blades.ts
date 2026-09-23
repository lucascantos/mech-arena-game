import { MeleeWeapon } from "./meleeWeapon";

/** Lunges at the locked target and sweeps a wide arc. Big hit and shove, no ammo, 0.8s between strikes. */
export class EnergySword extends MeleeWeapon {
  constructor() {
    super({
      name: "Energy Sword",
      shortName: "ES",
      mount: "hand",
      damageType: "energy",
      damage: 55,
      fireMode: "semi",
      fireRate: 1 / 0.8,
      magazine: 1,
      reloadTime: 0,
      pellets: 1,
      spread: 0,
      recoil: 0,
      maxRecoil: 0,
      recoilRecovery: 0,
      projectileSpeed: 100000, // no projectile: aim straight at the target, no lead
      projectileSize: 0,
      range: 260, // lunge + reach: how close bots get before swinging
      falloffStart: 260,
      falloffMin: 1,
      knockback: 600,
      selfStagger: 0,
      weight: 8,
      reach: 70,
      arc: 150,
    });
  }
}
