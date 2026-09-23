import type { Fighter } from "../fighter";
import type { Vec2 } from "../vec";
import type { World } from "../world";

/**
 * Anything that goes in a mech's single back slot, used with the right mouse
 * button: back weapons (multi-lock missiles, grenade launcher, laser cannon)
 * or a defensive unit (pulse shield). Each unit decides what holding and
 * releasing the button does.
 */
export interface BackUnit {
  readonly name: string;
  readonly shortName: string;
  /** Adds to the mech's weight. */
  readonly weight: number;
  /** Right-button state, fed every tick (false while the mech can't act). */
  trigger(held: boolean, owner: Fighter, world: World): void;
  /** Timers (reload, recharge...). Called every tick. */
  update(owner: Fighter): void;
  reset(): void;
  /** Short HUD text, e.g. "6/8", "CHARGE 60%", "SHIELD 120". */
  readonly status: string;
  /** Multiplier on the owner's move speed right now (a raised shield slows you). */
  readonly moveMultiplier: number;
  /** True while the main weapon can't fire (e.g. shield raised). */
  readonly blocksMainWeapon: boolean;
  /**
   * Takes incoming damage traveling in direction `dir` and returns what gets
   * through (a raised shield soaks hits from the front).
   */
  absorb(owner: Fighter, dir: Vec2, damage: number): number;
  /** Timers a joined player needs to mirror the host's copy (online play). */
  netState(): number[];
  syncFromNet(state: number[]): void;
}

/** A back unit type, so presets can list them: `back: PulseShield`. */
export type BackUnitClass = new () => BackUnit;
