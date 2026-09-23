import { secondsToTicks } from "../sim/constants";
import type { Fighter } from "../sim/fighter";
import type { Input } from "../sim/input";
import { distanceToBox } from "../sim/geometry";
import { dist, type Vec2 } from "../sim/vec";
import type { World } from "../sim/world";

/** How long the cursor must stay on an enemy to lock it. */
const LOCK_TICKS = secondsToTicks(0.5);
/** The lock disengages when the target gets farther than this from you (world units). */
export const LOCK_RANGE = 800;

/**
 * Lock-on: keep the cursor on (or near, within your head's lock-on radius)
 * an enemy for LOCK_TICKS to lock it.
 * While locked the camera frames you and your target instead of following
 * the cursor. Dwelling on another enemy switches targets. The lock
 * disengages as soon as the target leaves your view, when it dies or gets
 * too far away, when you right-click, or when you stop controlling a living
 * mech.
 *
 * While locked, your aim points straight at the target (see `aim`); the cursor
 * is only used to pick or switch targets.
 */
export class LockOn {
  /** Locked enemy, if any. */
  targetId: number | null = null;
  /** Enemy under the cursor that is being locked, if any. */
  candidateId: number | null = null;
  private dwell = 0;

  /** 0 → 1 while dwelling on the candidate. */
  get progress(): number {
    return Math.min(1, this.dwell / LOCK_TICKS);
  }

  clear(): void {
    this.targetId = null;
    this.candidateId = null;
    this.dwell = 0;
  }

  /**
   * Call once per sim tick. `self` is your mech (null when you're not
   * controlling one); `cursorWorld` is the world point under the cursor;
   * `visible` says whether a world point is inside your view.
   */
  update(world: World, self: Fighter | null, cursorWorld: Vec2 | null, visible: (p: Vec2) => boolean): void {
    if (!self?.alive) return this.clear();

    const target = this.targetId === null ? undefined : world.getFighter(this.targetId);
    // Drops the moment the target leaves your view, dies, or gets too far away.
    if (target && (!target.alive || !visible(target.pos) || dist(self.pos, target.pos) > LOCK_RANGE)) this.targetId = null;

    const hovered = cursorWorld ? this.enemyAt(world, self, cursorWorld, visible) : undefined;
    if (!hovered || hovered.id === this.targetId) {
      this.candidateId = null;
      this.dwell = 0;
      return;
    }
    if (hovered.id !== this.candidateId) {
      this.candidateId = hovered.id;
      this.dwell = 0;
    }
    if (++this.dwell >= LOCK_TICKS) {
      this.targetId = hovered.id;
      this.candidateId = null;
      this.dwell = 0;
    }
  }

  /**
   * Your input with its aim replaced by the direction to the locked target
   * (no leading: where it is, not where it's going). Unchanged without a lock.
   */
  aim(world: World, self: Fighter, input: Input): Input {
    const target = this.targetId === null ? undefined : world.getFighter(this.targetId);
    if (!target?.alive) return input;
    return { ...input, aimX: target.pos.x - self.pos.x, aimY: target.pos.y - self.pos.y };
  }

  /** The visible, in-range living enemy whose (padded) box is closest to the cursor. */
  private enemyAt(world: World, self: Fighter, p: Vec2, visible: (p: Vec2) => boolean): Fighter | undefined {
    let best: Fighter | undefined;
    let bestD = Infinity;
    for (const f of world.fighters) {
      if (f === self || !f.alive || f.team === self.team || !visible(f.pos)) continue;
      if (dist(self.pos, f.pos) > LOCK_RANGE) continue;
      const d = distanceToBox(p, f.pos, { x: f.size.x / 2, y: f.size.y / 2 });
      if (d <= self.stats.lockOnRadius && d < bestD) [best, bestD] = [f, d]; // the head sets how close counts
    }
    return best;
  }
}
