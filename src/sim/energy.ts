import { DT, secondsToTicks } from "./constants";

/** Regeneration pauses this long after spending energy. */
const REGEN_DELAY_TICKS = secondsToTicks(0.4);

/**
 * A mech's energy pool. Actions (dashes for now) spend it; it refills over
 * time at a rate set by the mech's parts, after a short pause following each
 * spend, so spamming actions drains it.
 */
export class Energy {
  current: number;
  private pauseLeft = 0;

  constructor(public max: number) {
    this.current = max;
  }

  /** 0 → 1. */
  get fraction(): number {
    return this.max > 0 ? this.current / this.max : 0;
  }

  canAfford(cost: number): boolean {
    return this.current >= cost;
  }

  /** Spends `cost` if there's enough; returns whether it was spent. */
  spend(cost: number): boolean {
    if (!this.canAfford(cost)) return false;
    this.current -= cost;
    this.pauseLeft = REGEN_DELAY_TICKS;
    return true;
  }

  /** Refills at `regenPerSecond` once the post-spend pause is over. */
  update(regenPerSecond: number): void {
    if (this.pauseLeft > 0) {
      this.pauseLeft--;
      return;
    }
    this.current = Math.min(this.max, this.current + regenPerSecond * DT);
  }

  refill(): void {
    this.current = this.max;
    this.pauseLeft = 0;
  }
}
