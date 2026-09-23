import type { Vec2 } from "../sim/vec";
import { VIEW_HEIGHT, VIEW_WIDTH } from "./view";

/**
 * Lock-on strength: how far the camera leans from the player toward the
 * player–cursor centroid. 1 = exactly the centroid (very twitchy), 0 = off.
 */
const LOOK_WEIGHT = 0.4;
/** Cursor within this many world units of the view center doesn't move the camera. */
const DEAD_ZONE = 95;
/** How quickly the lean follows the mouse (per second, exponential). Lower = lazier. */
const LOOK_SHARPNESS = 3;
/** The lean never pushes the player closer than this to the view's edge (world units). */
const MARGIN = 60;

/**
 * The lock-on lean, kept separate from following the player so each can have
 * its own feel: the camera tracks the player tightly, while the lean drifts
 * slowly toward where the cursor points. Everything is in world units, so it
 * behaves the same on every screen.
 *
 * Why the cursor's offset from the view center: centering on player + d
 * (d = that offset) would put the cursor at player + 2d, whose midpoint with
 * the player is player + d, the exact centroid. It depends only on the mouse,
 * not on where the camera is, so a still mouse can't make the camera drift.
 * LOOK_WEIGHT scales it down, and the dead zone ignores small offsets.
 */
export class LookAhead {
  /** Current lean in world units, added to the player's position. */
  private offset: Vec2 = { x: 0, y: 0 };

  /**
   * `aim` is the cursor's offset from the view center in world units, or null
   * without a cursor. Eases toward the matching lean and returns it.
   */
  update(aim: Vec2 | null, dt: number): Vec2 {
    const desired = aim ? this.desired(aim) : { x: 0, y: 0 };
    const t = 1 - Math.exp(-LOOK_SHARPNESS * dt);
    this.offset = {
      x: this.offset.x + (desired.x - this.offset.x) * t,
      y: this.offset.y + (desired.y - this.offset.y) * t,
    };
    return this.offset;
  }

  private desired(aim: Vec2): Vec2 {
    const dist = Math.hypot(aim.x, aim.y);
    if (dist <= DEAD_ZONE) return { x: 0, y: 0 };
    // Only the part beyond the dead zone counts, so the lean starts from zero instead of jumping.
    const k = ((dist - DEAD_ZONE) / dist) * LOOK_WEIGHT;
    return {
      x: clamp(aim.x * k, VIEW_WIDTH / 2 - MARGIN),
      y: clamp(aim.y * k, VIEW_HEIGHT / 2 - MARGIN),
    };
  }
}

/** Clamps `v` to [-limit, limit]. */
function clamp(v: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, v));
}
