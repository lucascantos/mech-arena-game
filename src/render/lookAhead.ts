import type { Vec2 } from "../sim/vec";

/**
 * Lock-on strength: how far the camera leans from the player toward the
 * player–cursor centroid. 1 = exactly the centroid (very twitchy), 0 = off.
 */
const LOOK_WEIGHT = 0.4;
/** Cursor within this many CSS px of the screen center doesn't move the camera. */
const DEAD_ZONE = 140;
/** How quickly the lean follows the mouse (per second, exponential). Lower = lazier. */
const LOOK_SHARPNESS = 3;
/** The lean never pushes the player closer than this to a screen edge (CSS px). */
const MARGIN = 90;

/**
 * The lock-on lean, kept separate from following the player so each can have
 * its own feel: the camera tracks the player tightly, while the lean drifts
 * slowly toward where the cursor points.
 *
 * Why the cursor's offset from the screen center: centering on player + d
 * (d = that offset in world units) would put the cursor at player + 2d, whose
 * midpoint with the player is player + d, the exact centroid. It depends only
 * on the mouse, not on where the camera is, so a still mouse can't make the
 * camera drift. LOOK_WEIGHT scales it down, and the dead zone ignores small
 * offsets near the center.
 */
export class LookAhead {
  /** Current lean in world units, added to the player's position. */
  private offset: Vec2 = { x: 0, y: 0 };

  /** Eases toward the lean for this cursor (or back to none) and returns it in world units. */
  update(cursor: Vec2 | null, width: number, height: number, scale: number, dt: number): Vec2 {
    const desired = cursor ? this.desired(cursor, width, height, scale) : { x: 0, y: 0 };
    const t = 1 - Math.exp(-LOOK_SHARPNESS * dt);
    this.offset = {
      x: this.offset.x + (desired.x - this.offset.x) * t,
      y: this.offset.y + (desired.y - this.offset.y) * t,
    };
    return this.offset;
  }

  private desired(cursor: Vec2, width: number, height: number, scale: number): Vec2 {
    const cx = cursor.x - width / 2;
    const cy = cursor.y - height / 2;
    const dist = Math.hypot(cx, cy);
    if (dist <= DEAD_ZONE) return { x: 0, y: 0 };
    // Only the part beyond the dead zone counts, so the lean starts from zero instead of jumping.
    const k = ((dist - DEAD_ZONE) / dist) * LOOK_WEIGHT;
    const dx = clamp(cx * k, width / 2 - MARGIN);
    const dy = clamp(cy * k, height / 2 - MARGIN);
    return { x: dx / scale, y: dy / scale };
  }
}

/** Clamps `v` to [-limit, limit]. */
function clamp(v: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, v));
}
