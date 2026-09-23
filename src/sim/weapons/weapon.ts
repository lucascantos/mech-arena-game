import type { Ability } from "../abilities/ability";
import type { BackUnit } from "../back/backUnit";
import { Brace } from "../brace";
import { DT, secondsToTicks } from "../constants";
import type { Fighter } from "../fighter";
import { Projectile, type ProjectileSpec } from "../projectiles/projectile";
import { add, scale, vec, type Vec2 } from "../vec";
import type { World } from "../world";
import type { WeaponStats } from "./weaponStats";

const DEG = Math.PI / 180;

/**
 * An equippable weapon. Any fighter can carry any weapon, in hand or in the
 * back slot (it's also a BackUnit).
 *
 * Handles ammo, fire rate, reloading and recoil bloom, and fires plain
 * bullets. Subclasses change what gets fired by overriding
 * `createProjectile` (ExplosiveWeapon → Rocket, HomingWeapon → Missile,
 * LaserCannon → Beam...) and how the trigger works by overriding `trigger`
 * (ChargeWeapon, MultiLockLauncher). Which slot it mounts in is `stats.mount`.
 */
export class Weapon<S extends WeaponStats = WeaponStats> implements BackUnit {
  ammo: number;
  protected shotCooldown = 0;
  private reloadLeft = 0;
  /** Extra spread in degrees from recent shots. */
  private bloom = 0;
  protected triggerWasHeld = false;

  constructor(readonly stats: S) {
    this.ammo = stats.magazine;
  }

  get name(): string {
    return this.stats.name;
  }

  get shortName(): string {
    return this.stats.shortName;
  }

  get weight(): number {
    return this.stats.weight;
  }

  get status(): string {
    return this.isReloading ? `reloading ${Math.round(this.reloadProgress * 100)}%` : `${this.ammo}/${this.stats.magazine}`;
  }

  /** Weapons don't slow you (a charging laser does). */
  get moveMultiplier(): number {
    return 1;
  }

  get blocksMainWeapon(): boolean {
    return false;
  }

  /** An ability this weapon brings while in hand (a sword's lunge); none for guns. */
  get ability(): Ability | null {
    return null;
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

  /** Can fire this tick: loaded, not reloading, fire-rate cooldown over. */
  protected get ready(): boolean {
    return !this.isReloading && this.shotCooldown === 0 && this.ammo > 0;
  }

  /** Advances timers. Called every tick for the equipped weapon (and the back slot). */
  update(_owner?: Fighter): void {
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

  /** Weapons don't block anything: all damage gets through. */
  absorb(_owner: Fighter, _dir: Vec2, damage: number): number {
    return damage;
  }

  /** Timers a joined player needs to mirror the host's copy: [ammo, reloadLeft, bloom]. */
  netState(): number[] {
    return [this.ammo, this.reloadLeft, Math.round(this.bloom * 10) / 10];
  }

  /** Applies `netState()` from the host (online play). */
  syncFromNet([ammo, reloadLeft, bloom]: number[]): void {
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
    if (this.ammo <= 0 && !this.isReloading) return this.startReload();
    if (this.ready) this.discharge(owner, world);
  }

  /**
   * Fires now and pays for it: `shots` ammo, fire-rate cooldown, recoil,
   * auto-reload when empty, and the self-stagger of heavy weapons on legs
   * that can't absorb it on the move.
   */
  protected discharge(owner: Fighter, world: World, shots = 1): void {
    this.fire(owner, world);
    this.ammo = Math.max(0, this.ammo - shots);
    this.shotCooldown = Math.max(1, secondsToTicks(1 / this.stats.fireRate));
    const kick = this.stats.recoil * owner.stats.recoilMultiplier; // stable legs kick less
    this.bloom = Math.min(this.stats.maxRecoil, this.bloom + kick);
    if (this.ammo === 0) this.startReload();
    if (this.stats.selfStagger > 0 && !owner.stats.firesOnTheMove) {
      owner.brace = new Brace(this); // rooted and can't act until it recovers
      owner.vel = vec();
    }
  }

  /** Spawns `pellets` projectiles spread randomly within the current cone. */
  protected fire(owner: Fighter, world: World): void {
    const s = this.stats;
    const baseAngle = Math.atan2(owner.facing.y, owner.facing.x);
    const half = (this.currentSpread / 2) * DEG;
    world.emit({ kind: "shot", ownerId: owner.id, count: s.pellets });
    for (let i = 0; i < s.pellets; i++) {
      const angle = baseAngle + world.rng.range(-half, half);
      this.createProjectile(world, this.projectileSpec(owner, vec(Math.cos(angle), Math.sin(angle)))).launch(world);
    }
  }

  /** A projectile of this weapon leaving the owner's muzzle in direction `dir`. */
  protected projectileSpec(owner: Fighter, dir: Vec2): ProjectileSpec {
    const s = this.stats;
    return {
      ownerId: owner.id,
      team: owner.team,
      pos: add(owner.pos, scale(owner.facing, owner.size.x / 2 + s.projectileSize)),
      vel: scale(dir, s.projectileSpeed),
      size: s.projectileSize,
      damage: s.damage,
      damageType: s.damageType,
      knockback: s.knockback,
      range: s.range,
      falloffStart: s.falloffStart,
      falloffMin: s.falloffMin,
      critChance: owner.stats.critChance,
    };
  }

  /** Builds one projectile for a shot. A plain bullet here; subclasses fire rockets, missiles, grenades, beams... */
  protected createProjectile(world: World, spec: ProjectileSpec): Projectile {
    return new Projectile(world, spec);
  }
}
