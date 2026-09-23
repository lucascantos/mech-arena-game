import { secondsToTicks } from "./constants";
import type { Weapon } from "./weapons/weapon";

/**
 * Self-stagger after firing a heavy weapon on legs that can't absorb it on
 * the move. The shot goes out instantly; then the mech is rooted and can't
 * act (no moving, shooting, switching or dodging) until it recovers.
 */
export class Brace {
  private ticksLeft: number;
  private readonly totalTicks: number;

  constructor(readonly weapon: Weapon) {
    this.totalTicks = Math.max(1, secondsToTicks(weapon.stats.selfStagger));
    this.ticksLeft = this.totalTicks;
  }

  /** 0 right after the shot → 1 when recovered. */
  get progress(): number {
    return 1 - this.ticksLeft / this.totalTicks;
  }

  /** Advances one tick. Returns false once recovered. */
  update(): boolean {
    return --this.ticksLeft > 0;
  }
}
