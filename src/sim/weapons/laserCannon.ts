import { Beam } from "../projectiles/beam";
import type { Projectile, ProjectileSpec } from "../projectiles/projectile";
import type { World } from "../world";
import { ChargeWeapon } from "./chargeWeapon";

/**
 * Back weapon. Hold to charge (everyone can see the aiming line), release to
 * fire a beam that pierces every enemy on its line; a tap has a quarter of
 * the power. Heavy: bipedal legs self-stagger.
 */
export class LaserCannon extends ChargeWeapon {
  constructor() {
    super({
      name: "Laser Cannon",
      shortName: "LC",
      mount: "back",
      damageType: "energy",
      damage: 70,
      fireMode: "semi",
      fireRate: 1,
      magazine: 3,
      reloadTime: 4,
      pellets: 1,
      spread: 0,
      recoil: 0,
      maxRecoil: 0,
      recoilRecovery: 10,
      projectileSpeed: 100000, // effectively instant: beams are hitscan (only the direction is used)
      projectileSize: 16,
      range: 1500,
      falloffStart: 1500,
      falloffMin: 1,
      knockback: 380,
      selfStagger: 0.4,
      weight: 22,
      chargeTime: 1.2,
      minPower: 0.25,
      chargingSpeed: 0.7,
    });
  }

  protected createProjectile(world: World, spec: ProjectileSpec): Projectile {
    return new Beam(world, spec);
  }
}
