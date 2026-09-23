import { DT } from "../constants";
import type { Fighter } from "../fighter";
import { segmentHitsBox } from "../geometry";
import { add, length, lerp, normalize, scale, type Vec2 } from "../vec";
import type { DamageType } from "../weapons/weaponStats";
import type { World } from "../world";

/** What every projectile starts with, handed over by the weapon that fired it. */
export interface ProjectileSpec {
  ownerId: number;
  team: number;
  pos: Vec2;
  vel: Vec2;
  /** Bounding box size (square). */
  size: number;
  damage: number;
  damageType: DamageType;
  knockback: number;
  /** Distance it can travel before it expires. */
  range: number;
}

/**
 * A plain bullet: flies straight, damages the first enemy it touches, and
 * disappears at max range or the arena wall. Subclasses change what happens
 * on impact (Rocket explodes) or how it flies (Missile steers).
 */
export class Projectile {
  readonly id: number;
  readonly ownerId: number;
  readonly team: number;
  readonly size: number;
  readonly damage: number;
  readonly damageType: DamageType;
  readonly knockback: number;
  pos: Vec2;
  prevPos: Vec2;
  vel: Vec2;
  rangeLeft: number;
  alive = true;

  constructor(world: World, spec: ProjectileSpec) {
    this.id = world.nextEntityId();
    this.ownerId = spec.ownerId;
    this.team = spec.team;
    this.size = spec.size;
    this.damage = spec.damage;
    this.damageType = spec.damageType;
    this.knockback = spec.knockback;
    this.pos = { ...spec.pos };
    this.prevPos = { ...spec.pos };
    this.vel = spec.vel;
    this.rangeLeft = spec.range;
  }

  /** How close a shot must pass to be dangerous (used by bots to decide whether to dodge). */
  get threatRadius(): number {
    return this.size / 2;
  }

  /** Moves one tick and resolves hits, walls and expiry. */
  update(world: World): void {
    this.prevPos = this.pos;
    this.steer(world);
    const step = scale(this.vel, DT);
    const next = add(this.pos, step);

    const hit = this.firstFighterHit(world, next);
    if (hit) {
      this.impact(world, lerp(this.pos, next, hit.t), hit.fighter);
      return;
    }

    this.pos = next;
    const expired = this.advanceLifetime(length(step));
    const outside = next.x < 0 || next.y < 0 || next.x > world.width || next.y > world.height;
    if (outside || expired) {
      const point = { x: Math.min(world.width, Math.max(0, next.x)), y: Math.min(world.height, Math.max(0, next.y)) };
      this.impact(world, point, null);
    }
  }

  /** Changes `vel` before moving. Straight by default. */
  protected steer(_world: World): void {}

  /** Uses up range (and, in subclasses, fuse). Returns true when the projectile should end. */
  protected advanceLifetime(distance: number): boolean {
    this.rangeLeft -= distance;
    return this.rangeLeft <= 0;
  }

  /** The projectile ends at `point`; `target` is the fighter it touched, if any. */
  protected impact(world: World, point: Vec2, target: Fighter | null): void {
    this.alive = false;
    this.pos = point;
    world.emit({ kind: "impact", pos: point, damageType: this.damageType });
    const dealt = target ? this.hit(world, target, this.damage, normalize(this.vel), this.knockback, point) : 0;
    if (dealt > 0) world.emit({ kind: "projectileHit", ownerId: this.ownerId });
  }

  /** Applies damage and knockback to one fighter; returns the damage actually dealt. */
  protected hit(world: World, f: Fighter, damage: number, dir: Vec2, knockback: number, at: Vec2): number {
    const dealt = f.takeDamage(damage);
    if (dealt <= 0) return 0;
    f.applyKnockback(scale(dir, knockback));
    world.emit({ kind: "damage", targetId: f.id, sourceId: this.ownerId, amount: dealt, pos: at });
    if (!f.alive) world.emit({ kind: "kill", victimId: f.id, killerId: this.ownerId });
    return dealt;
  }

  /** Closest enemy along this tick's path. Invulnerable fighters are passed through. */
  private firstFighterHit(world: World, to: Vec2): { fighter: Fighter; t: number } | null {
    let best: { fighter: Fighter; t: number } | null = null;
    const pad = this.size / 2;
    for (const f of world.fighters) {
      if (!f.alive || f.team === this.team || f.invulnerable) continue;
      const half = { x: f.size.x / 2 + pad, y: f.size.y / 2 + pad };
      const t = segmentHitsBox(this.pos, to, f.pos, half);
      if (t !== null && (!best || t < best.t)) best = { fighter: f, t };
    }
    return best;
  }
}
