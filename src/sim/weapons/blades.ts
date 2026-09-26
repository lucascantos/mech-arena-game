import { MeleeWeapon } from "./meleeWeapon";

/** Lunges at the locked target and sweeps a wide arc: combos of up to 3 quick swings; the next combo is ready 1s after the last swing. */
export class EnergySword extends MeleeWeapon {
  constructor() {
    super({
      name: "Energy Sword",
      shortName: "ES",
      mount: "hand",
      damageType: "energy",
      damage: 55,
      fireMode: "semi",
      fireRate: 5,
      magazine: 3, // swings per combo
      reloadTime: 1, // next combo ready 1s after the last swing
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
