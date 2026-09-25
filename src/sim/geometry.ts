import type { Vec2 } from "./vec";

/** An axis-aligned rectangle by its corners (x0,y0 top-left). */
export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Where a moving point (from `a` to `b`) first enters a box, as a fraction of
 * the path in [0, 1], or null if it never touches it. Swept so fast bullets
 * can't tunnel through a box between two ticks.
 */
export function segmentHitsBox(a: Vec2, b: Vec2, center: Vec2, half: Vec2): number | null {
  let tMin = 0;
  let tMax = 1;
  for (const axis of ["x", "y"] as const) {
    const lo = center[axis] - half[axis];
    const hi = center[axis] + half[axis];
    const d = b[axis] - a[axis];
    if (Math.abs(d) < 1e-9) {
      if (a[axis] < lo || a[axis] > hi) return null;
      continue;
    }
    let t1 = (lo - a[axis]) / d;
    let t2 = (hi - a[axis]) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }
  return tMin;
}

/** Distance from a point to the nearest edge of a box (0 if inside). */
export function distanceToBox(p: Vec2, center: Vec2, half: Vec2): number {
  const dx = Math.max(Math.abs(p.x - center.x) - half.x, 0);
  const dy = Math.max(Math.abs(p.y - center.y) - half.y, 0);
  return Math.hypot(dx, dy);
}
