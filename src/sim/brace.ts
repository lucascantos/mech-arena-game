import { secondsToTicks } from "./constants";
import type { Fighter } from "./fighter";
import type { Weapon } from "./weapons/weapon";
import type { World } from "./world";

export type BracePhase = "windup" | "recovery";

/**
 * Planting to fire a heavy weapon. Starts automatically when a weapon that
 * needs bracing is fired on legs that can't fire it on the move.
 *
 * windup: rooted, can still turn to aim; a dodge cancels it (shot lost).
 * Then the shot fires. recovery: rooted, can't act at all.
 */
export class Brace {
  phase: BracePhase = "windup";
  private ticksLeft: number;
  private readonly windupTicks: number;
  private readonly recoveryTicks: number;

  constructor(readonly weapon: Weapon) {
    const brace = weapon.stats.brace!;
    this.windupTicks = Math.max(1, secondsToTicks(brace.windup));
    this.recoveryTicks = Math.max(1, secondsToTicks(brace.recovery));
    this.ticksLeft = this.windupTicks;
  }

  /** Dodging out is only allowed before the shot goes off. */
  get cancellable(): boolean {
    return this.phase === "windup";
  }

  /** 0 → 1 over the current phase. */
  get progress(): number {
    const total = this.phase === "windup" ? this.windupTicks : this.recoveryTicks;
    return 1 - this.ticksLeft / total;
  }

  /** Advances one tick. Returns false once the brace is over. */
  update(owner: Fighter, world: World): boolean {
    if (--this.ticksLeft > 0) return true;
    if (this.phase === "windup") {
      this.weapon.discharge(owner, world);
      this.phase = "recovery";
      this.ticksLeft = this.recoveryTicks;
      return true;
    }
    return false;
  }
}
