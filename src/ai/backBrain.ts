import { PulseShield } from "../sim/back/pulseShield";
import { Weapon } from "../sim/weapons/weapon";
import type { Fighter } from "../sim/fighter";
import { GrenadeLauncher, GRENADE_MIN_DISTANCE } from "../sim/weapons/grenadeLauncher";
import { ChargeWeapon } from "../sim/weapons/chargeWeapon";
import { MultiLockLauncher } from "../sim/weapons/multiLockLauncher";
import type { Rng } from "../sim/rng";

/** Longest a bot paints multi-locks before letting go. */
const MAX_PAINT_TICKS = 90;

/**
 * The right-click half of a bot: when to hold its back unit. Laser: charge
 * fully, then release. Multi-lock: paint until every missile has a lock (or
 * it's been a while), then release. Grenades and other back weapons (e.g.
 * the missile launcher): fire when the target is in range. Shield: raise it
 * while the main weapon can't do anything (reloading or out of range), and
 * lower it before it breaks.
 */
export class BackBrain {
  private heldTicks = 0;
  private tapToggle = false;

  constructor(private readonly rng: Rng) {}

  /** Right-button state for this tick; `target` is null when nobody is in view. */
  hold(self: Fighter, target: Fighter | null, range: number, preferred: number): boolean {
    const held = target ? this.decide(self, range, preferred) : false;
    this.heldTicks = held ? this.heldTicks + 1 : 0;
    return held;
  }

  private decide(self: Fighter, range: number, preferred: number): boolean {
    const unit = self.back;
    if (unit instanceof PulseShield) {
      if (unit.broken || unit.energy < unit.maxEnergy * (unit.raised ? 0.2 : 0.5)) return false;
      const idle = self.weapon?.isReloading || range > preferred * 1.4;
      return !!idle;
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
