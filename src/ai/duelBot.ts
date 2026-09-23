import type { Controller } from "../sim/controller";
import type { Fighter } from "../sim/fighter";
import { emptyInput, type Input } from "../sim/input";
import { Rng } from "../sim/rng";
import { add, dist, normalize, perp, scale, sub, vec, type Vec2 } from "../sim/vec";
import type { World } from "../sim/world";
import { Gunner } from "./gunner";
import type { Personality } from "./personality";
import { ThreatSense } from "./threats";

type Mode = "approach" | "circle" | "retreat";

/** How close to a wall before the bot steers back toward the center. */
const WALL_MARGIN = 120;

/**
 * A 1v1 bot. Picks a mode every so often (approach, circle, retreat), strafes
 * around its target, shoots with the weapon that suits the range and dodges
 * incoming shots. It only ever outputs an Input, exactly like a human would.
 */
export class DuelBot implements Controller {
  private readonly rng: Rng;
  private readonly gunner: Gunner;
  private readonly threats: ThreatSense;
  private mode: Mode = "circle";
  private modeTicksLeft = 0;
  private strafeSign = 1;

  constructor(private readonly personality: Personality, seed: number) {
    this.rng = new Rng(seed);
    this.gunner = new Gunner(this.rng, personality);
    this.threats = new ThreatSense(this.rng, personality);
  }

  readInput(self: Fighter, world: World): Input {
    const input = emptyInput();
    const target = this.pickTarget(self, world);
    if (!self.alive || !target) return input;

    const dir = normalize(sub(target.pos, self.pos));
    const range = dist(self.pos, target.pos);

    if (--this.modeTicksLeft <= 0) {
      this.chooseMode(range);
      input.selectSlot = this.gunner.chooseSlot(self, range);
    }
    // Swap right away if the current weapon runs dry mid-fight.
    if (self.weapon?.isReloading) input.selectSlot = this.gunner.chooseSlot(self, range);

    const aim = this.gunner.aim(self, target);
    input.aimX = aim.x;
    input.aimY = aim.y;
    input.fire = this.gunner.trigger(self, range);
    input.reload = this.gunner.wantsReload(self, this.mode === "retreat");

    let move = normalize(add(this.steer(dir, range), this.wallAvoidance(self, world)));
    const dodge = this.threats.update(self, target, world);
    if (dodge) {
      move = dodge;
      input.defend = true;
    } else if (this.mode === "approach" && range < this.personality.preferredRange + 60) {
      // Gap-closer: dash in when committed and just outside range.
      if (this.rng.chance(0.03 * this.personality.aggression)) input.defend = true;
    }

    input.moveX = move.x;
    input.moveY = move.y;
    return input;
  }

  private pickTarget(self: Fighter, world: World): Fighter | undefined {
    let best: Fighter | undefined;
    let bestDist = Infinity;
    for (const f of world.fighters) {
      if (f === self || !f.alive || f.team === self.team) continue;
      const d = dist(self.pos, f.pos);
      if (d < bestDist) [best, bestDist] = [f, d];
    }
    return best;
  }

  private chooseMode(range: number): void {
    const p = this.personality;
    const roll = this.rng.next();
    if (range > p.preferredRange * 1.8 || roll < p.aggression * 0.5) this.mode = "approach";
    else if (range < p.preferredRange * 0.6 && roll > p.aggression) this.mode = "retreat";
    else this.mode = "circle";

    if (this.rng.chance(p.fickleness)) this.strafeSign *= -1;
    this.modeTicksLeft = this.rng.int(30, 90);
  }

  /** Desired movement direction for the current mode. */
  private steer(dir: Vec2, range: number): Vec2 {
    const side = scale(perp(dir), this.strafeSign);
    switch (this.mode) {
      case "approach":
        return add(dir, scale(side, 0.35));
      case "retreat":
        return add(scale(dir, -1), scale(side, 0.5));
      case "circle": {
        // Strafe, while nudging back toward the preferred range.
        const error = (range - this.personality.preferredRange) / this.personality.preferredRange;
        return add(side, scale(dir, Math.max(-1, Math.min(1, error * 2))));
      }
    }
  }

  private wallAvoidance(self: Fighter, world: World): Vec2 {
    const push = vec();
    if (self.pos.x < WALL_MARGIN) push.x += 1;
    if (self.pos.x > world.width - WALL_MARGIN) push.x -= 1;
    if (self.pos.y < WALL_MARGIN) push.y += 1;
    if (self.pos.y > world.height - WALL_MARGIN) push.y -= 1;
    // Cornered while strafing: flip direction so we slide out instead of grinding.
    if ((push.x !== 0 || push.y !== 0) && this.rng.chance(0.02)) this.strafeSign *= -1;
    return scale(push, 1.5);
  }
}
