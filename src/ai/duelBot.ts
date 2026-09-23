import type { Controller } from "../sim/controller";
import type { Fighter } from "../sim/fighter";
import { emptyInput, type Input } from "../sim/input";
import { Rng } from "../sim/rng";
import { add, dist, normalize, perp, scale, sub, vec, type Vec2 } from "../sim/vec";
import type { World } from "../sim/world";
import { BackBrain } from "./backBrain";
import { Gunner } from "./gunner";
import type { Personality } from "./personality";
import { Senses } from "./senses";
import { chooseTactic, holdRange, sightLimit, type Tactic } from "./tactics";
import { ThreatSense } from "./threats";

type Mode = "approach" | "circle" | "retreat";

/** How close to a wall before the bot steers back toward the center. */
const WALL_MARGIN = 120;

/**
 * A bot. Picks a mode every so often (approach, circle, retreat), strafes
 * around its target, shoots with the weapon that suits the range and dodges
 * incoming shots. It only ever outputs an Input, exactly like a human would,
 * and it only knows what a human would: what's inside its view, plus stale
 * radar contacts (see Senses). With nobody in view it hunts the nearest
 * radar contact. When it's faster than its target it uses that speed: it
 * kites a shorter-ranged enemy or dives a longer-ranged one (see tactics).
 */
export class DuelBot implements Controller {
  private readonly rng: Rng;
  private readonly gunner: Gunner;
  private readonly backBrain: BackBrain;
  private readonly threats: ThreatSense;
  private readonly senses = new Senses();
  private mode: Mode = "circle";
  private modeTicksLeft = 0;
  private strafeSign = 1;

  constructor(private readonly personality: Personality, seed: number) {
    this.rng = new Rng(seed);
    this.gunner = new Gunner(this.rng, personality);
    this.backBrain = new BackBrain(this.rng);
    this.threats = new ThreatSense(this.rng, personality);
  }

  readInput(self: Fighter, world: World): Input {
    const input = emptyInput();
    if (!self.alive) return input;
    this.senses.update(self, world);
    const target = this.senses.nearestVisible(self);
    if (!target) return this.hunt(self, world, input);

    const dir = normalize(sub(target.pos, self.pos));
    const range = dist(self.pos, target.pos);
    // Faster: kite or dive (speed decides). Otherwise hold the primary weapon's best distance.
    const tactic = chooseTactic(self, target);
    const plan: Exclude<Tactic, { kind: "hold" }> =
      tactic.kind === "hold"
        ? { kind: "kite", range: holdRange(self, target, world, this.personality.aggression) }
        : { ...tactic, range: Math.min(tactic.range, sightLimit(self, target, world)) };
    const preferred = plan.range;

    if (--this.modeTicksLeft <= 0) {
      this.maybeFlipStrafe();
      input.selectSlot = this.gunner.chooseSlot(self, range);
    }
    this.followTactic(plan, range);
    // Swap right away if the current weapon runs dry mid-fight.
    if (self.weapon?.isReloading) input.selectSlot = this.gunner.chooseSlot(self, range);

    const aim = this.gunner.aim(self, target);
    input.aimX = aim.x * range; // aim at the target's distance too (grenades land there)
    input.aimY = aim.y * range;
    input.fire = this.gunner.trigger(self, range);
    input.back = this.backBrain.hold(self, target, range, preferred);
    input.target = target.id; // bots "lock on" to what they fight (a sword lunges at it)
    input.reload = this.gunner.wantsReload(self, this.mode === "retreat");

    let move = normalize(add(this.steer(dir, range, preferred), this.wallAvoidance(self, world)));
    const dodge = this.threats.update(self, target, this.senses.visibleProjectiles(self, world), world);
    if (dodge) {
      move = dodge;
      input.defend = true;
    } else if (plan.kind === "dive" && this.mode === "approach" && range < preferred + 250) {
      // Diving a longer-ranged enemy: burn dashes to get inside its range.
      if (this.rng.chance(0.08)) input.defend = true;
    } else if (this.mode === "approach" && range < preferred + 60) {
      // Gap-closer: dash in when committed and just outside range.
      if (this.rng.chance(0.03 * this.personality.aggression)) input.defend = true;
    }

    input.moveX = move.x;
    input.moveY = move.y;
    return input;
  }

  /**
   * Nobody in view: head for the nearest radar contact (or the arena center
   * without one), facing where it's going, reloading on the way, and still
   * dodging any shot it can see. Never fires blind.
   */
  private hunt(self: Fighter, world: World, input: Input): Input {
    const contact = this.senses.nearestContact(self, world);
    const goal = contact?.pos ?? vec(world.width / 2, world.height / 2);
    const toGoal = sub(goal, self.pos);
    const arrived = Math.hypot(toGoal.x, toGoal.y) < 60;
    let move = arrived ? vec() : normalize(add(normalize(toGoal), this.wallAvoidance(self, world)));
    const dodge = this.threats.update(self, null, this.senses.visibleProjectiles(self, world), world);
    if (dodge) [move, input.defend] = [dodge, true];
    input.moveX = move.x;
    input.moveY = move.y;
    const look = arrived ? self.facing : normalize(toGoal);
    input.aimX = look.x;
    input.aimY = look.y;
    input.reload = this.gunner.wantsReload(self, true);
    return input;
  }

  /** Pick the mode from the distance every tick: back off, close in, or circle at the planned range. */
  private followTactic(tactic: Exclude<Tactic, { kind: "hold" }>, range: number): void {
    if (range < tactic.range * 0.85) this.mode = tactic.kind === "kite" ? "retreat" : "circle";
    else if (range > tactic.range * 1.15) this.mode = "approach";
    else this.mode = "circle";
  }

  /** Every so often, maybe switch strafe direction (fickle bots switch more). */
  private maybeFlipStrafe(): void {
    if (this.rng.chance(this.personality.fickleness)) this.strafeSign *= -1;
    this.modeTicksLeft = this.rng.int(30, 90);
  }

  /** Desired movement direction for the current mode, orbiting at `preferred` distance. */
  private steer(dir: Vec2, range: number, preferred: number): Vec2 {
    const side = scale(perp(dir), this.strafeSign);
    switch (this.mode) {
      case "approach":
        return add(dir, scale(side, 0.35));
      case "retreat":
        return add(scale(dir, -1), scale(side, 0.5));
      case "circle": {
        // Strafe, while nudging back toward the preferred range.
        const error = (range - preferred) / preferred;
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
