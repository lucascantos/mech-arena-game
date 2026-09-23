import { secondsToTicks } from "../constants";
import type { Fighter } from "../fighter";
import type { World } from "../world";
import { Weapon } from "./weapon";
import type { WeaponStats } from "./weaponStats";

export interface BurstWeaponStats extends WeaponStats {
  /** Rounds per trigger pull. */
  burstCount: number;
  /** Seconds between rounds inside a burst (fireRate sets the pause between bursts). */
  burstInterval: number;
}

/**
 * One pull fires a quick burst of rounds; the rest of the burst keeps firing
 * even if the trigger is let go. What each round is comes from
 * `createProjectile` like any weapon.
 */
export class BurstWeapon<S extends BurstWeaponStats = BurstWeaponStats> extends Weapon<S> {
  /** Rounds still to come in the current burst. */
  private burstLeft = 0;
  private burstTicks = 0;

  trigger(held: boolean, owner: Fighter, world: World): void {
    if (this.burstLeft === 0) return super.trigger(held, owner, world);
    this.triggerWasHeld = held;
    if (--this.burstTicks <= 0) this.discharge(owner, world);
  }

  /** Each round of a burst goes through here: the first starts the burst, the rest count it down. */
  protected discharge(owner: Fighter, world: World, shots = 1): void {
    super.discharge(owner, world, shots);
    this.burstLeft = this.burstLeft > 0 ? this.burstLeft - 1 : this.stats.burstCount - 1;
    if (this.ammo === 0 || this.isReloading) this.burstLeft = 0;
    this.burstTicks = Math.max(1, secondsToTicks(this.stats.burstInterval));
  }

  holster(): void {
    super.holster();
    this.burstLeft = 0;
  }

  reset(): void {
    super.reset();
    this.burstLeft = 0;
  }
}
