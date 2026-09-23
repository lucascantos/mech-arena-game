import { secondsToTicks } from "../constants";
import type { Projectile, ProjectileSpec } from "../projectiles/projectile";
import { Rocket } from "../projectiles/rocket";
import type { World } from "../world";
import { Weapon } from "./weapon";
import type { WeaponStats } from "./weaponStats";

/** What explosive weapons add on top of every weapon's numbers. */
export interface ExplosiveWeaponStats extends WeaponStats {
  /** Radius of the explosion; damage falls off toward the edge. */
  blastRadius: number;
  /** Seconds until a rocket detonates by itself if it hasn't hit anything. */
  fuse: number;
}

/** A weapon that fires rockets: straight, and exploding on contact, at the wall, at max range or on the fuse. */
export class ExplosiveWeapon<S extends ExplosiveWeaponStats = ExplosiveWeaponStats> extends Weapon<S> {
  protected get fuseTicks(): number {
    return Math.max(1, secondsToTicks(this.stats.fuse));
  }

  protected createProjectile(world: World, spec: ProjectileSpec): Projectile {
    return new Rocket(world, spec, this.stats.blastRadius, this.fuseTicks);
  }
}
