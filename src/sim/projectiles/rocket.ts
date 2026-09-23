import type { Fighter } from "../fighter";
import { distanceToBox } from "../geometry";
import { normalize, sub, type Vec2 } from "../vec";
import type { World } from "../world";
import { Projectile, type ProjectileSpec } from "./projectile";

/** Explosions deal full damage at the center and this fraction at the edge. */
const BLAST_EDGE_DAMAGE = 0.5;

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

  /** Explodes wherever it ends, whether or not it touched someone. */
  protected impact(world: World, center: Vec2, _target: Fighter | null): void {
    this.alive = false;
    this.pos = center;
    world.emit({ kind: "explosion", pos: center, radius: this.blastRadius });
    const crit = this.rollCrit(world); // one roll for the whole blast
    let dealt = 0;
    for (const f of world.fighters) {
      if (!f.alive || f.team === this.team) continue;
      const d = distanceToBox(center, f.pos, { x: f.size.x / 2, y: f.size.y / 2 });
      if (d > this.blastRadius) continue;
      const falloff = 1 - (1 - BLAST_EDGE_DAMAGE) * (d / this.blastRadius);
      const away = normalize(sub(f.pos, center));
      const dir = away.x === 0 && away.y === 0 ? normalize(this.vel) : away;
      dealt += this.hit(world, f, this.damage * this.falloff * falloff, dir, this.knockback * falloff, f.pos, crit);
    }
    if (dealt > 0) world.emit({ kind: "projectileHit", ownerId: this.ownerId });
  }
}
