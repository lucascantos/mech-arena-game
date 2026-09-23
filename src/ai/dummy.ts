import type { Controller } from "../sim/controller";
import type { Fighter } from "../sim/fighter";
import { emptyInput, type Input } from "../sim/input";
import type { Vec2 } from "../sim/vec";

/**
 * idle: stands still.
 * strafe: walks left and right across its spot.
 * turret: stands still and keeps firing straight ahead.
 */
export type DummyBehavior = "idle" | "strafe" | "turret";

/** How far a strafing dummy walks to each side of where it started. */
const STRAFE_RANGE = 160;

/** Training-ground target: very basic, predictable movement for practicing aim and dodging. */
export class Dummy implements Controller {
  private home: Vec2 | null = null;
  private direction = 1;

  /** `facing` is the direction it looks (and a turret shoots) in. */
  constructor(
    readonly behavior: DummyBehavior,
    private readonly facing: Vec2,
  ) {}

  readInput(self: Fighter): Input {
    const input: Input = { ...emptyInput(), aimX: this.facing.x, aimY: this.facing.y };
    if (!self.alive) return input;
    this.home ??= { ...self.spawn };

    if (this.behavior === "strafe") {
      if (self.pos.x > this.home.x + STRAFE_RANGE) this.direction = -1;
      else if (self.pos.x < this.home.x - STRAFE_RANGE) this.direction = 1;
      input.moveX = this.direction;
    } else if (this.behavior === "turret") {
      input.fire = true; // automatic weapon: holds the trigger; reloads on its own when empty
    }
    return input;
  }
}
