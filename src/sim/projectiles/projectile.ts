import { DT } from "../constants";
import { clampToArena, insideArena } from "../arena";
import { dealDamage } from "../damage";
import type { Fighter } from "../fighter";
import { segmentHitsBox } from "../geometry";
import { damageCover } from "../cover";
import { firstObstacle, type Obstacle } from "../obstacles";
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
  /** Full damage up to this distance traveled, then linearly less... */
  falloffStart: number;
  /** ...down to this multiplier at max range. */
  falloffMin: number;
  /** Chance (0–1) this projectile crits when it hits; the shooter's head decides it. */
  critChance: number;
}

/**
 * A plain bullet: flies straight, damages the first enemy it touches (less
 * the farther it has flown, see `falloff`), and disappears at max range or
 * the arena wall. Subclasses change what happens
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
  readonly critChance: number;
  readonly range: number;
  private readonly falloffStart: number;
  private readonly falloffMin: number;
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
    this.critChance = spec.critChance;
    this.range = spec.range;
    this.falloffStart = spec.falloffStart;
    this.falloffMin = spec.falloffMin;
    this.pos = { ...spec.pos };
    this.prevPos = { ...spec.pos };
    this.vel = spec.vel;
    this.rangeLeft = spec.range;
  }

  /** Damage multiplier from distance traveled: 1 up to falloffStart, then down to falloffMin at max range. */
  get falloff(): number {
    const traveled = this.range - this.rangeLeft;
    if (traveled <= this.falloffStart || this.range <= this.falloffStart) return 1;
    const t = Math.min(1, (traveled - this.falloffStart) / (this.range - this.falloffStart));
    return 1 - (1 - this.falloffMin) * t;
  }

  /** How close a shot must pass to be dangerous (used by bots to decide whether to dodge). */
  get threatRadius(): number {
    return this.size / 2;
  }

  /** Puts the shot into play. Travels through the world by default; a Beam resolves instantly instead. */
  launch(world: World): void {
    world.addProjectile(this);
  }

  /** Moves one tick and resolves hits, walls and expiry. */
  update(world: World): void {
    this.prevPos = this.pos;
    this.steer(world);
    const step = scale(this.vel, DT);
    const next = add(this.pos, step);

    // A wall or obstacle in the way ends the shot there (grenades fly over everything).
    const blocked = this.hitsFighters ? firstObstacle(world.obstacles, this.pos, next, this.size / 2) : null;
    const hit = this.firstFighterHit(world, next);
    if (blocked && (!hit || blocked.t < hit.t)) {
      this.rangeLeft -= length(step) * blocked.t;
      this.hitCover(world, blocked.obstacle);
      this.impact(world, lerp(this.pos, next, blocked.t), null);
      return;
    }
    if (hit) {
      this.rangeLeft -= length(step) * hit.t; // count the partial step, for exact falloff
      this.impact(world, lerp(this.pos, next, hit.t), hit.fighter);
      return;
    }

    this.pos = next;
    const expired = this.advanceLifetime(length(step));
    const outside = !insideArena(world.arena, next);
    if (outside || expired) {
      const point = clampToArena(world.arena, next);
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
    if (!target) return;
    const crit = this.rollCrit(world);
    const dealt = this.hit(world, target, this.damage * this.falloff, normalize(this.vel), this.knockback, point, crit);
    if (dealt > 0) world.emit({ kind: "projectileHit", ownerId: this.ownerId });
  }

  /** One roll per projectile hit, from the world's seeded RNG so it stays deterministic. */
  protected rollCrit(world: World): boolean {
    return this.critChance > 0 && world.rng.chance(this.critChance);
  }

  /**
   * Applies damage (×CRIT_MULTIPLIER on a crit) and knockback to one fighter;
   * returns the damage actually dealt.
   */
  protected hit(world: World, f: Fighter, damage: number, dir: Vec2, knockback: number, at: Vec2, crit: boolean): number {
    return dealDamage(world, f, this.ownerId, damage, dir, knockback, at, crit);
  }

  /** Hitting cover: a plain shot damages it directly (cars; buildings shrug it off). Explosives override this. */
  protected hitCover(world: World, o: Obstacle): void {
    damageCover(world, o, this.damage * this.falloff, false, { id: this.ownerId, team: this.team });
  }

  /** False for shots that fly over fighters (grenades) and only end at range. */
  protected get hitsFighters(): boolean {
    return true;
  }

  /** Closest enemy along this tick's path. Invulnerable fighters are passed through. */
  private firstFighterHit(world: World, to: Vec2): { fighter: Fighter; t: number } | null {
    let best: { fighter: Fighter; t: number } | null = null;
    if (!this.hitsFighters) return null;
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
