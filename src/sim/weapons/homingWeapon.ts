import type { Fighter } from "../fighter";
import { Missile } from "../projectiles/missile";
import type { Projectile, ProjectileSpec } from "../projectiles/projectile";
import type { World } from "../world";
import { ExplosiveWeapon, type ExplosiveWeaponStats } from "./explosiveWeapon";
import type { Guidance } from "./guidance";

/** Missiles can chase, so they lock targets a bit beyond their straight-line range. */
const LOCK_RANGE_FACTOR = 1.5;

/**
 * An explosive weapon whose rockets are guided. Each shot locks a target once
 * (via its Guidance); every missile from that shot then chases it on its own.
 */
export class HomingWeapon extends ExplosiveWeapon {
  private lockedTarget: number | undefined;

  constructor(
    stats: ExplosiveWeaponStats,
    readonly guidance: Guidance,
  ) {
    super(stats);
  }

  protected fire(owner: Fighter, world: World): void {
    this.lockedTarget = this.guidance.acquire(owner, world, this.stats.range * LOCK_RANGE_FACTOR);
    super.fire(owner, world);
  }

  protected createProjectile(world: World, spec: ProjectileSpec): Projectile {
    return new Missile(world, spec, this.stats.blastRadius, this.fuseTicks, this.guidance, this.lockedTarget);
  }
}
