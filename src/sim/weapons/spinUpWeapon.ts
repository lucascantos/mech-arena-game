import { DT, secondsToTicks } from "../constants";
import type { Fighter } from "../fighter";
import type { World } from "../world";
import { Weapon } from "./weapon";
import type { WeaponStats } from "./weaponStats";

export interface SpinUpWeaponStats extends WeaponStats {
  /** Shots per second right as it starts turning (`fireRate` is the top speed). */
  minFireRate: number;
  /** Seconds of holding the trigger to reach top speed. */
  spinUpTime: number;
  /** Move speed multiplier while it's turning. */
  spinningSpeed: number;
  /** Too heavy to fire on the move: legs that can't (bipedal) stand still while it's turning. */
  rootsLightLegs: boolean;
}

/**
 * Holding the trigger spins the barrels up: the fire rate climbs from
 * `minFireRate` to `fireRate` over `spinUpTime`, and winds back down (twice
 * as fast) when you let go. Heavy ones root legs that can't fire on the
 * move for as long as they turn. What it fires comes from `createProjectile`
 * like any weapon.
 */
export class SpinUpWeapon<S extends SpinUpWeaponStats = SpinUpWeaponStats> extends Weapon<S> {
  /** 0 (still) to 1 (top speed). */
  spin = 0;
  /** The carrier's legs can't handle it on the move (set each tick from the owner). */
  private rooted = false;

  get fireRateNow(): number {
    return this.stats.minFireRate + (this.stats.fireRate - this.stats.minFireRate) * this.spin;
  }

  get status(): string {
    return this.spin > 0 && !this.isReloading ? `${super.status} spin ${Math.round(this.spin * 100)}%` : super.status;
  }

  get moveMultiplier(): number {
    if (this.spin === 0) return 1;
    return this.rooted ? 0 : this.stats.spinningSpeed;
  }

  trigger(held: boolean, owner: Fighter, world: World): void {
    const step = DT / Math.max(DT, this.stats.spinUpTime);
    const spinning = held && !this.isReloading && this.ammo > 0;
    this.spin = spinning ? Math.min(1, this.spin + step) : Math.max(0, this.spin - 2 * step);
    this.rooted = this.stats.rootsLightLegs && !owner.stats.firesOnTheMove;
    super.trigger(held, owner, world);
  }

  /** Shots come faster the more it has spun up. */
  protected discharge(owner: Fighter, world: World, shots = 1): void {
    super.discharge(owner, world, shots);
    this.shotCooldown = Math.max(1, secondsToTicks(1 / this.fireRateNow));
  }

  holster(): void {
    super.holster();
    this.spin = 0;
  }

  reset(): void {
    super.reset();
    this.spin = 0;
  }

  netState(): number[] {
    return [...super.netState(), Math.round(this.spin * 100) / 100];
  }

  syncFromNet(state: number[]): void {
    super.syncFromNet(state);
    this.spin = state[3] ?? 0;
  }
}
