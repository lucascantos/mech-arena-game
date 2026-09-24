import { PulseShield } from "../sim/back/pulseShield";
import { Weapon } from "../sim/weapons/weapon";
import type { Fighter } from "../sim/fighter";
import { GrenadeLauncher, GRENADE_MIN_DISTANCE } from "../sim/weapons/grenadeLauncher";
import { ChargeWeapon } from "../sim/weapons/chargeWeapon";
import { MultiLockLauncher } from "../sim/weapons/multiLockLauncher";
import type { Rng } from "../sim/rng";
import { add, dist, scale, type Vec2 } from "../sim/vec";

/** Longest a bot paints multi-locks before letting go. */
const MAX_PAINT_TICKS = 90;

/**
 * The right-click half of a bot: when to hold its back unit. Laser: charge
 * fully, then release. Multi-lock: paint until every missile has a lock (or
 * it's been a while), then release. Grenades and other back weapons (e.g.
 * the missile launcher): fire when the target is in range; grenades are
 * aimed where the target will be when they land (see lobPoint). Shield:
 * raise it in any fight (it doesn't stop shooting), drop it before it
 * breaks, raise it again once mostly recharged.
 */
export class BackBrain {
  private heldTicks = 0;
  private tapToggle = false;

  constructor(private readonly rng: Rng) {}

  /** Right-button state for this tick; `target` is null when nobody is in view. */
  hold(self: Fighter, target: Fighter | null, range: number): boolean {
    const held = target ? this.decide(self, range) : false;
    this.heldTicks = held ? this.heldTicks + 1 : 0;
    return held;
  }

  /**
   * Where to aim a grenade: where the target will be when it lands (its
   * current drift over the flight time). Null for any other back unit.
   */
  lobPoint(self: Fighter, target: Fighter): Vec2 | null {
    const gl = self.back;
    if (!(gl instanceof GrenadeLauncher)) return null;
    const flight = dist(self.pos, target.pos) / gl.stats.projectileSpeed;
    return add(target.pos, scale(add(target.vel, target.knockback), flight));
  }

  private decide(self: Fighter, range: number): boolean {
    const unit = self.back;
    if (unit instanceof PulseShield) {
      // Shooting still works behind it: raise it in any fight, drop it before it breaks, raise again once recharged.
      return !unit.broken && unit.energy >= unit.maxEnergy * (unit.raised ? 0.2 : 0.6);
    }
    if (!(unit instanceof Weapon)) return false;
    if (unit.isReloading || unit.ammo === 0 || range > unit.stats.range * 0.9) return false;
    if (unit instanceof ChargeWeapon) return unit.chargeFraction < 1; // release (fire) once full
    if (unit instanceof MultiLockLauncher) {
      const full = unit.locks.length >= Math.min(4, unit.ammo);
      return this.heldTicks === 0 ? this.rng.chance(0.05) : !full && this.heldTicks < MAX_PAINT_TICKS;
    }
    if (unit instanceof GrenadeLauncher && range < GRENADE_MIN_DISTANCE + 60) return false; // too close to lob safely
    if (unit.stats.fireMode === "auto") return true;
    this.tapToggle = !this.tapToggle;
    return this.tapToggle && this.rng.chance(0.3);
  }
}
