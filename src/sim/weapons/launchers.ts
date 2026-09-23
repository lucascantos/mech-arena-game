import { ExplosiveWeapon } from "./explosiveWeapon";
import { Guidance } from "./guidance";
import { HomingWeapon } from "./homingWeapon";

/** Straight rockets that explode on contact or at max range. Heavy: bipedal legs self-stagger. */
export class RocketLauncher extends ExplosiveWeapon {
  constructor() {
    super({
      name: "Rocket Launcher",
      shortName: "RL",
      damageType: "explosive",
      damage: 30,
      fireMode: "semi",
      fireRate: 0.8,
      magazine: 3,
      reloadTime: 3.0,
      pellets: 1,
      spread: 2,
      recoil: 5,
      maxRecoil: 8,
      recoilRecovery: 10,
      projectileSpeed: 520,
      projectileSize: 12,
      range: 1600,
      falloffStart: 1600,
      falloffMin: 1,
      knockback: 420,
      selfStagger: 0.6,
      weight: 20,
      blastRadius: 90,
      fuse: 3.2, // just past max range, so range decides
    });
  }
}

/**
 * Homing missiles: lock the enemy nearest the aim (within ±30°), turn toward
 * it at 160°/s, explode on contact or after 2s. Heavy: bipedal legs self-stagger.
 */
export class MissileLauncher extends HomingWeapon {
  constructor() {
    super(
      {
        name: "Missile Launcher",
        shortName: "ML",
        damageType: "explosive",
        damage: 30,
        fireMode: "semi",
        fireRate: 0.8,
        magazine: 3,
        reloadTime: 3.0,
        pellets: 1,
        spread: 2,
        recoil: 5,
        maxRecoil: 8,
        recoilRecovery: 10,
        projectileSpeed: 520,
        projectileSize: 12,
        range: 1040,
        falloffStart: 1040,
        falloffMin: 1,
        knockback: 420,
        selfStagger: 0.6,
        weight: 22,
        blastRadius: 90,
        fuse: 2.0,
      },
      new Guidance(160, 60),
    );
  }
}
