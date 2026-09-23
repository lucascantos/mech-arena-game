import { DT, secondsToTicks } from "../constants";
import type { Fighter } from "../fighter";
import { add, scale, vec } from "../vec";
import { Projectile, type ProjectileSpec } from "../projectiles/projectile";
import type { World } from "../world";
import type { WeaponStats } from "./weaponStats";

const DEG = Math.PI / 180;

/**
 * An equippable weapon. Any fighter can carry any weapon.
 *
 * Handles ammo, fire rate, reloading and recoil bloom, and fires plain
 * bullets. Subclasses change what gets fired by overriding
 * `createProjectile` (ExplosiveWeapon → Rocket, HomingWeapon → Missile) or
 * the whole shot by overriding `fire` (hitscan laser, melee later).
 */
export class Weapon<S extends WeaponStats = WeaponStats> {
  ammo: number;
  private shotCooldown = 0;
  private reloadLeft = 0;
  /** Extra spread in degrees from recent shots. */
  private bloom = 0;
  private triggerWasHeld = false;

  constructor(readonly stats: S) {
    this.ammo = stats.magazine;
  }

  get isReloading(): boolean {
    return this.reloadLeft > 0;
  }

  /** 0 when a reload just started, 1 when finished. */
  get reloadProgress(): number {
    if (!this.isReloading) return 1;
    return 1 - this.reloadLeft / secondsToTicks(this.stats.reloadTime);
  }

  /** Current cone width in degrees (base spread + recoil bloom). */
  get currentSpread(): number {
    return this.stats.spread + this.bloom;
  }

  /** Advances timers. Called every tick for the equipped weapon. */
  update(): void {
    if (this.shotCooldown > 0) this.shotCooldown--;
    this.bloom = Math.max(0, this.bloom - this.stats.recoilRecovery * DT);
    if (this.reloadLeft > 0 && --this.reloadLeft === 0) this.ammo = this.stats.magazine;
  }

  startReload(): void {
    if (this.isReloading || this.ammo >= this.stats.magazine) return;
    this.reloadLeft = secondsToTicks(this.stats.reloadTime);
  }

  /** Called when the weapon is put away; a half-finished reload is lost. */
  holster(): void {
    this.reloadLeft = 0;
    this.triggerWasHeld = false;
  }

  /** Timers a joined player needs to mirror the host's copy of this weapon. */
  netState(): [ammo: number, reloadLeft: number, bloom: number] {
    return [this.ammo, this.reloadLeft, Math.round(this.bloom * 10) / 10];
  }

  /** Applies `netState()` from the host (online play). */
  syncFromNet([ammo, reloadLeft, bloom]: [number, number, number]): void {
    this.ammo = ammo;
    this.reloadLeft = reloadLeft;
    this.bloom = bloom;
  }

  reset(): void {
    this.ammo = this.stats.magazine;
    this.shotCooldown = 0;
    this.reloadLeft = 0;
    this.bloom = 0;
    this.triggerWasHeld = false;
  }

  /** Feed the trigger state every tick. Fires when allowed. */
  trigger(held: boolean, owner: Fighter, world: World): void {
    const pressed = held && !this.triggerWasHeld;
    this.triggerWasHeld = held;
    if (!held || (this.stats.fireMode === "semi" && !pressed)) return;
    if (this.isReloading || this.shotCooldown > 0) return;
    if (this.ammo <= 0) {
      this.startReload();
      return;
    }

    this.fire(owner, world);
    this.ammo--;
    this.shotCooldown = Math.max(1, secondsToTicks(1 / this.stats.fireRate));
    const kick = this.stats.recoil * owner.stats.recoilMultiplier; // stable legs kick less
    this.bloom = Math.min(this.stats.maxRecoil, this.bloom + kick);
    if (this.ammo === 0) this.startReload();
    // Heavy weapon on legs that can't absorb it on the move: the shot is out, now recover.
    if (this.stats.selfStagger > 0 && !owner.stats.firesOnTheMove) owner.startBrace(this);
  }

  /** Spawns `pellets` projectiles spread randomly within the current cone. */
  protected fire(owner: Fighter, world: World): void {
    const s = this.stats;
    const baseAngle = Math.atan2(owner.facing.y, owner.facing.x);
    const muzzle = add(owner.pos, scale(owner.facing, owner.size.x / 2 + s.projectileSize));
    const half = (this.currentSpread / 2) * DEG;

    world.emit({ kind: "shot", ownerId: owner.id, count: s.pellets });
    for (let i = 0; i < s.pellets; i++) {
      const angle = baseAngle + world.rng.range(-half, half);
      const dir = vec(Math.cos(angle), Math.sin(angle));
      world.addProjectile(
        this.createProjectile(world, {
          ownerId: owner.id,
          team: owner.team,
          pos: muzzle,
          vel: scale(dir, s.projectileSpeed),
          size: s.projectileSize,
          damage: s.damage,
          damageType: s.damageType,
          knockback: s.knockback,
          range: s.range,
          falloffStart: s.falloffStart,
          falloffMin: s.falloffMin,
          critChance: owner.stats.critChance,
        }),
      );
    }
  }

  /** Builds one projectile for a shot. A plain bullet here; subclasses fire rockets, missiles... */
  protected createProjectile(world: World, spec: ProjectileSpec): Projectile {
    return new Projectile(world, spec);
  }
}
