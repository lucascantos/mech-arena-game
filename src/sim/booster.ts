import { DT } from "./constants";
import type { Fighter } from "./fighter";
import type { Input } from "./input";
import { approach, normalize, rotateToward, scale, vec, type Vec2 } from "./vec";
import type { World } from "./world";

const DEG = Math.PI / 180;

/**
 * Boosting (hold the boost key): the mech drives along its boost heading at
 * boost speed, burning energy, instead of walking. The heading starts toward
 * the steering point (the mouse cursor, not the crosshair) and turns toward
 * it at the build's boost turn rate, so light, nimble builds carve sharp
 * turns and heavy ones swing wide. Dashing mid-boost snaps the heading
 * straight to the steering point. Aiming stays independent.
 */
export class Booster {
  /** Direction of travel while boosting; null when not boosting. */
  heading: Vec2 | null = null;

  get active(): boolean {
    return this.heading !== null;
  }

  /** The input a dash should use: while boosting it goes toward the steering point (boosting ignores the movement keys). */
  dashInput(input: Input): Input {
    const want = this.steerDir(input);
    return want ? { ...input, moveX: want.x, moveY: want.y } : input;
  }

  /** A dash went off mid-boost: the heading snaps straight to the steering point. */
  snap(input: Input): void {
    this.heading = this.steerDir(input) ?? this.heading;
  }

  /** Direction to the steering point while boosting, or null. */
  private steerDir(input: Input): Vec2 | null {
    const want = normalize(vec(input.steerX, input.steerY));
    return this.heading && input.boost && (want.x !== 0 || want.y !== 0) ? want : null;
  }

  /** One tick: sets the owner's velocity and returns true while boosting; false = walk as usual. */
  steer(f: Fighter, input: Input, world: World): boolean {
    const want = normalize(vec(input.steerX, input.steerY));
    const hasWant = want.x !== 0 || want.y !== 0;
    const cost = f.stats.boostDrain * DT;
    if (!input.boost || !f.energy.canAfford(cost) || (!this.heading && !hasWant)) {
      this.heading = null;
      return false;
    }
    f.energy.spend(cost);
    this.heading = !this.heading ? want : hasWant ? rotateToward(this.heading, want, f.stats.boostTurnRate * DEG * DT) : this.heading;
    const speed = f.stats.boostSpeed * f.loadout.moveMultiplier;
    f.vel = approach(f.vel, scale(this.heading, speed), f.stats.acceleration * world.map.grip * DT);
    return true;
  }
}
