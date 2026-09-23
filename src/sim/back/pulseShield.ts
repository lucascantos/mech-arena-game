import { DT, secondsToTicks } from "../constants";
import type { Fighter } from "../fighter";
import { dot, type Vec2 } from "../vec";
import type { BackUnit } from "./backUnit";

/** Energy the shield can soak before it breaks. */
const MAX_ENERGY = 150;
/** Energy per second recovered while lowered... */
const RECHARGE = 45;
/** ...after it has been down this long. */
const RECHARGE_DELAY = 1;
/** A broken shield can't be raised for this long, then comes back full. */
const BREAK_LOCKOUT = 5;
/** Half-width of the protected front arc, in degrees. */
export const SHIELD_HALF_ARC = 60;
/** Moving with the shield up is slower. */
const RAISED_SPEED = 0.6;

/**
 * Hold right click to raise an energy shield in front of the mech: hits from
 * the front ±60° are soaked by its energy. While up you move slower and can't
 * use your main weapon. Breaking it locks it out for 5s.
 */
export class PulseShield implements BackUnit {
  readonly name = "Pulse Shield";
  readonly shortName = "PS";
  readonly weight = 12;
  energy = MAX_ENERGY;
  raised = false;
  /** Ticks until a broken shield can be used again. */
  private lockout = 0;
  private sinceLowered = 0;

  get maxEnergy(): number {
    return MAX_ENERGY;
  }

  get broken(): boolean {
    return this.lockout > 0;
  }

  get status(): string {
    if (this.broken) return `BROKEN ${(this.lockout * DT).toFixed(1)}s`;
    return `${this.raised ? "UP " : ""}${Math.round(this.energy)}/${MAX_ENERGY}`;
  }

  get moveMultiplier(): number {
    return this.raised ? RAISED_SPEED : 1;
  }

  get blocksMainWeapon(): boolean {
    return this.raised;
  }

  trigger(held: boolean): void {
    this.raised = held && !this.broken && this.energy > 0;
    if (this.raised) this.sinceLowered = 0;
  }

  update(owner: Fighter): void {
    if (!owner.alive) this.raised = false;
    if (this.lockout > 0 && --this.lockout === 0) this.energy = MAX_ENERGY;
    if (this.raised) return;
    if (this.broken || ++this.sinceLowered < secondsToTicks(RECHARGE_DELAY)) return;
    this.energy = Math.min(MAX_ENERGY, this.energy + RECHARGE * DT);
  }

  /** Soaks hits coming at the front while raised; breaks when the energy runs out. */
  absorb(owner: Fighter, dir: Vec2, damage: number): number {
    if (!this.raised || dot(dir, owner.facing) > -Math.cos((SHIELD_HALF_ARC * Math.PI) / 180)) return damage;
    const soaked = Math.min(this.energy, damage);
    this.energy -= soaked;
    if (this.energy <= 0) {
      this.raised = false;
      this.lockout = secondsToTicks(BREAK_LOCKOUT);
    }
    return damage - soaked;
  }

  reset(): void {
    this.energy = MAX_ENERGY;
    this.raised = false;
    this.lockout = 0;
    this.sinceLowered = 0;
  }

  netState(): number[] {
    return [Math.round(this.energy), this.lockout, this.raised ? 1 : 0];
  }

  syncFromNet([energy, lockout, raised]: number[]): void {
    this.energy = energy;
    this.lockout = lockout;
    this.raised = raised === 1;
  }
}
