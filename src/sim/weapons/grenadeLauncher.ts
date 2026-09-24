import type { Fighter } from "../fighter";
import { Grenade } from "../projectiles/grenade";
import type { Projectile, ProjectileSpec } from "../projectiles/projectile";
import type { Vec2 } from "../vec";
import type { World } from "../world";
import { ExplosiveWeapon } from "./explosiveWeapon";

/** Grenades never land closer than this (you'd be in your own blast). */
export const GRENADE_MIN_DISTANCE = 150;

/**
 * Back weapon. Lobs a grenade over everyone that lands where you aim (up to
 * its range) with a big blast. Heavy: bipedal legs self-stagger.
 */
export class GrenadeLauncher extends ExplosiveWeapon {
  constructor() {
    super({
      name: "Grenade Launcher",
      shortName: "GL",
      mount: "back",
      damageType: "explosive",
      damage: 45,
      fireMode: "semi",
      fireRate: 0.7,
      magazine: 2,
      reloadTime: 3.5,
      pellets: 1,
      spread: 1,
      recoil: 3,
      maxRecoil: 6,
      recoilRecovery: 10,
      projectileSpeed: 1000,
      projectileSize: 14,
      range: 900,
      falloffStart: 900,
      falloffMin: 1,
      knockback: 500,
      selfStagger: 0.5,
      weight: 24,
      blastRadius: 110,
      fuse: 3,
    });
  }

  /** Lands at the aimed distance, clamped between the minimum and the max range. */
  protected projectileSpec(owner: Fighter, dir: Vec2): ProjectileSpec {
    const spec = super.projectileSpec(owner, dir);
    const muzzle = owner.size.x / 2 + this.stats.projectileSize;
    const wanted = Math.max(GRENADE_MIN_DISTANCE, Math.min(this.stats.range, owner.aimDistance)) - muzzle;
    return { ...spec, range: Math.max(1, wanted) };
  }

  protected createProjectile(world: World, spec: ProjectileSpec): Projectile {
    return new Grenade(world, spec, this.stats.blastRadius, this.fuseTicks);
  }
}
