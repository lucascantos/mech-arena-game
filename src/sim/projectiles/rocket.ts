import type { Fighter } from "../fighter";
import { explode } from "../explosion";
import { normalize, type Vec2 } from "../vec";
import type { World } from "../world";
import { Projectile, type ProjectileSpec } from "./projectile";

/**
 * An explosive projectile. Flies straight and explodes on contact, at the
 * wall, at max range or when its fuse runs out, damaging every enemy in the
 * blast radius (less toward the edge) and pushing them away.
 */
export class Rocket extends Projectile {
  private fuseLeft: number;

  constructor(
    world: World,
    spec: ProjectileSpec,
    readonly blastRadius: number,
    fuseTicks: number,
  ) {
    super(world, spec);
    this.fuseLeft = fuseTicks;
  }

  get threatRadius(): number {
    return super.threatRadius + this.blastRadius;
  }

  protected advanceLifetime(distance: number): boolean {
    const outOfRange = super.advanceLifetime(distance);
    return --this.fuseLeft <= 0 || outOfRange;
  }

  /** The blast deals with cover (see impact), so the direct hit adds nothing. */
  protected hitCover(): void {}

  /** Explodes wherever it ends, whether or not it touched someone (or something). */
  protected impact(world: World, center: Vec2, _target: Fighter | null): void {
    this.alive = false;
    this.pos = center;
    const source = { id: this.ownerId, team: this.team };
    const crit = this.rollCrit(world); // one roll for the whole blast
    const dealt = explode(world, center, this.blastRadius, this.damage * this.falloff, this.knockback, source, crit, this.damageType, normalize(this.vel));
    if (dealt > 0) world.emit({ kind: "projectileHit", ownerId: this.ownerId });
  }
}
