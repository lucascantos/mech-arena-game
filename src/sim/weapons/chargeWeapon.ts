import { secondsToTicks } from "../constants";
import type { Fighter } from "../fighter";
import type { ProjectileSpec } from "../projectiles/projectile";
import type { Vec2 } from "../vec";
import type { World } from "../world";
import { Weapon } from "./weapon";
import type { WeaponStats } from "./weaponStats";

export interface ChargeWeaponStats extends WeaponStats {
  /** Seconds of holding for a full-power shot. */
  chargeTime: number;
  /** Fraction of full power a tap (no charge) has. */
  minPower: number;
  /** Move speed multiplier while charging. */
  chargingSpeed: number;
}

/**
 * A weapon you hold to charge and release to fire. Damage, knockback and
 * shot size scale with the charge. What it fires is up to the subclass
 * (LaserCannon fires beams; a charged rocket would just build a Rocket).
 */
export class ChargeWeapon<S extends ChargeWeaponStats = ChargeWeaponStats> extends Weapon<S> {
  /** Ticks held so far. */
  charge = 0;

  /** 0 (tap) to 1 (fully charged). */
  get chargeFraction(): number {
    return Math.min(1, this.charge / secondsToTicks(this.stats.chargeTime));
  }

  /** Multiplier on the shot: minPower on a tap, 1 when fully charged. */
  get power(): number {
    return this.stats.minPower + (1 - this.stats.minPower) * this.chargeFraction;
  }

  get status(): string {
    return this.charge > 0 ? `CHARGE ${Math.round(this.chargeFraction * 100)}%` : super.status;
  }

  get moveMultiplier(): number {
    return this.charge > 0 ? this.stats.chargingSpeed : 1;
  }

  /** Charges while held and ready; fires on release (kept for later if you can't act, e.g. mid-dash). */
  trigger(held: boolean, owner: Fighter, world: World): void {
    this.triggerWasHeld = held;
    if (held) {
      if (this.ammo <= 0 && !this.isReloading) this.startReload();
      else if (this.ready) this.charge = Math.min(this.charge + 1, secondsToTicks(this.stats.chargeTime));
      return;
    }
    if (this.charge > 0 && this.ready && owner.canAct()) {
      this.discharge(owner, world);
      this.charge = 0;
    }
  }

  protected projectileSpec(owner: Fighter, dir: Vec2): ProjectileSpec {
    const spec = super.projectileSpec(owner, dir);
    const p = this.power;
    return { ...spec, damage: spec.damage * p, knockback: spec.knockback * p, size: spec.size * (0.5 + p) };
  }

  reset(): void {
    super.reset();
    this.charge = 0;
  }

  holster(): void {
    super.holster();
    this.charge = 0;
  }

  netState(): number[] {
    return [...super.netState(), this.charge];
  }

  syncFromNet(state: number[]): void {
    super.syncFromNet(state);
    this.charge = state[3] ?? 0;
  }
}
