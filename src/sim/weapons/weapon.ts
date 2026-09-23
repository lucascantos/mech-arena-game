import { DT, secondsToTicks } from "../constants";
import type { Fighter } from "../fighter";
import { add, scale, vec } from "../vec";
import type { World } from "../world";
import type { WeaponStats } from "./weaponStats";

const DEG = Math.PI / 180;

/**
 * An equippable weapon. Any fighter can carry any weapon.
 *
 * Handles ammo, fire rate, reloading and recoil bloom. How the shot is
 * delivered lives in `fire()`: the default spawns projectiles. Weapons that
 * work differently (hitscan laser, homing missiles, melee) override it.
 */
export class Weapon {
  ammo: number;
  private shotCooldown = 0;
  private reloadLeft = 0;
  /** Extra spread in degrees from recent shots. */
  private bloom = 0;
  private triggerWasHeld = false;

  constructor(readonly stats: WeaponStats) {
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
    if (this.stats.brace && !owner.stats.firesOnTheMove) owner.startBrace(this);
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
      world.spawnProjectile({
        ownerId: owner.id,
        team: owner.team,
        pos: muzzle,
        vel: scale(dir, s.projectileSpeed),
        size: s.projectileSize,
        damage: s.damage,
        damageType: s.damageType,
        knockback: s.knockback,
        blastRadius: s.blastRadius,
        rangeLeft: s.range,
      });
    }
  }
}
