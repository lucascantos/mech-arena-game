import type { Fighter } from "../fighter";
import { normalize, type Vec2 } from "../vec";
import type { World } from "../world";
import { Projectile } from "./projectile";

/**
 * A slug that goes through the mechs in its way: each one it meets takes the
 * hit (once), and it keeps flying until cover, the wall or its range ends it.
 * Any weapon can fire these by building them in `createProjectile`.
 */
export class PiercingSlug extends Projectile {
  private readonly pierced = new Set<number>();

  protected ignores(f: Fighter): boolean {
    return this.pierced.has(f.id);
  }

  protected passThrough(world: World, at: Vec2, f: Fighter): boolean {
    this.pierced.add(f.id);
    world.emit({ kind: "impact", pos: at, damageType: this.damageType });
    const dealt = this.hit(world, f, this.damage * this.falloff, normalize(this.vel), this.knockback, at, this.rollCrit(world));
    if (dealt > 0) world.emit({ kind: "projectileHit", ownerId: this.ownerId });
    return true;
  }
}
