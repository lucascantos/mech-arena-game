import { Ability } from "../abilities/ability";
import { DEFAULT_DODGE } from "../abilities/defenses/dodge";
import { DT, secondsToTicks } from "../constants";
import { dealDamage } from "../damage";
import type { Fighter } from "../fighter";
import { distanceToBox } from "../geometry";
import { dist, dot, normalize, scale, sub, type Vec2 } from "../vec";
import type { World } from "../world";
import { Weapon } from "./weapon";
import type { WeaponStats } from "./weaponStats";

export interface MeleeWeaponStats extends WeaponStats {
  /** How far past the mech's edge the strike reaches. */
  reach: number;
  /** Full width of the sweep in degrees, centered on the strike direction. */
  arc: number;
}

/** A lunge stops this far short of the target's box, so the strike lands at the edge instead of ramming it. */
const LUNGE_GAP = 20;
const DEG = Math.PI / 180;

/**
 * A weapon that strikes instead of shooting: no ammo, just a cooldown
 * (fireRate). Each click lunges toward the locked target (up to a dash's
 * distance, shorter the closer it already is; in place with no lock), then
 * sweeps an arc in front, hitting every enemy inside it.
 */
export class MeleeWeapon<S extends MeleeWeaponStats = MeleeWeaponStats> extends Weapon<S> {
  readonly lunge = new Lunge(this);

  get ability(): Ability {
    return this.lunge;
  }

  get status(): string {
    return this.shotCooldown > 0 || this.lunge.isActive ? "RECOVERING" : "READY";
  }

  trigger(held: boolean, owner: Fighter, world: World): void {
    const pressed = held && !this.triggerWasHeld;
    this.triggerWasHeld = held;
    if (!pressed || this.shotCooldown > 0 || this.lunge.isActive) return;
    this.shotCooldown = Math.max(1, secondsToTicks(1 / this.stats.fireRate));
    world.emit({ kind: "shot", ownerId: owner.id, count: 1 });

    const target = world.getFighter(owner.lockTarget);
    const locked = target?.alive && target.team !== owner.team ? target : undefined;
    const dir = locked ? normalize(sub(locked.pos, owner.pos)) : owner.facing;
    const gap = locked ? dist(owner.pos, locked.pos) - (owner.size.x + locked.size.x) / 2 - LUNGE_GAP : 0;
    const dashDistance = DEFAULT_DODGE.speed * DEFAULT_DODGE.duration * owner.stats.dashSpeedMultiplier;
    this.lunge.start(owner, dir, Math.max(0, Math.min(dashDistance, gap)), locked?.id);
  }

  /** The strike at the end of the lunge: every enemy within reach inside the arc, facing `dir`. */
  strike(owner: Fighter, world: World, dir: Vec2): void {
    const reach = owner.size.x / 2 + this.stats.reach;
    const minCos = Math.cos((this.stats.arc / 2) * DEG);
    world.emit({ kind: "slash", ownerId: owner.id, pos: owner.pos, dir, radius: reach, arc: this.stats.arc });
    let dealt = 0;
    for (const f of world.fighters) {
      if (!f.alive || f.team === owner.team || f.invulnerable) continue;
      if (distanceToBox(owner.pos, f.pos, { x: f.size.x / 2, y: f.size.y / 2 }) > reach) continue;
      const to = normalize(sub(f.pos, owner.pos));
      if (dot(to, dir) < minCos) continue;
      const crit = owner.stats.critChance > 0 && world.rng.chance(owner.stats.critChance);
      dealt += dealDamage(world, f, owner.id, this.stats.damage, to, this.stats.knockback, f.pos, crit);
    }
    if (dealt > 0) world.emit({ kind: "projectileHit", ownerId: owner.id });
  }

  reset(): void {
    super.reset();
    this.lunge.reset();
  }
}

/**
 * The move part of a melee attack: a quick dash-length burst (same duration
 * as a dodge, so a shorter lunge is also a slower one), then the strike. The
 * mech can't act or steer during it, but it isn't invulnerable.
 */
class Lunge extends Ability {
  readonly name = "Lunge";
  private dir: Vec2 = { x: 1, y: 0 };
  private speed = 0;
  private targetId: number | undefined;

  constructor(private readonly weapon: MeleeWeapon) {
    super({ activeTicks: Math.max(1, secondsToTicks(DEFAULT_DODGE.duration)), cooldownTicks: 0 });
  }

  start(owner: Fighter, dir: Vec2, distance: number, targetId: number | undefined): void {
    this.attach(owner);
    this.dir = dir;
    this.speed = distance / (this.timing.activeTicks * DT);
    this.targetId = targetId;
    this.begin();
  }

  protected onActivate(): void {}

  protected onActiveTick(): void {
    this.owner.vel = scale(this.dir, this.speed);
    this.owner.facing = this.dir;
  }

  /** Strikes toward the target where it is now (it may have moved), or straight ahead. */
  protected onEnd(world: World): void {
    this.owner.vel = scale(this.dir, Math.min(this.speed, this.owner.stats.moveSpeed));
    const target = this.targetId === undefined ? undefined : world.getFighter(this.targetId);
    const dir = target?.alive ? normalize(sub(target.pos, this.owner.pos)) : this.dir;
    this.owner.facing = dir;
    if (this.owner.alive) this.weapon.strike(this.owner, world, dir);
  }

  controlsMovement(): boolean {
    return this.isActive;
  }

  blocksActions(): boolean {
    return this.isActive;
  }
}
