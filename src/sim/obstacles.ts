import type { Fighter } from "./fighter";
import { segmentHitsBox } from "./geometry";
import type { Vec2 } from "./vec";

/** A solid shape: an axis-aligned box (by its center) or a circle. */
export type Shape = { kind: "box"; x: number; y: number; w: number; h: number } | { kind: "circle"; x: number; y: number; r: number };

/** What an obstacle looks like; the map's theme decides the colors. */
export type ObstacleLook = "building" | "car" | "barrier" | "tree" | "hedge" | "rock" | "ice" | "pillar" | "wall" | "statue";

/** Something solid on the map: stops mechs and shots, but not sight (the view is top-down). */
export interface Obstacle {
  shape: Shape;
  look: ObstacleLook;
}

/** Where the segment a→b first touches the shape grown by `pad`, as a fraction of the path, or null. */
export function segmentHitsShape(a: Vec2, b: Vec2, s: Shape, pad = 0): number | null {
  if (s.kind === "box") return segmentHitsBox(a, b, { x: s.x, y: s.y }, { x: s.w / 2 + pad, y: s.h / 2 + pad });
  const r = s.r + pad;
  const [dx, dy] = [b.x - a.x, b.y - a.y];
  const [fx, fy] = [a.x - s.x, a.y - s.y];
  const c = fx * fx + fy * fy - r * r;
  if (c <= 0) return 0; // starts inside
  const qa = dx * dx + dy * dy;
  if (qa < 1e-9) return null;
  const qb = 2 * (fx * dx + fy * dy);
  const disc = qb * qb - 4 * qa * c;
  if (disc < 0) return null;
  const t = (-qb - Math.sqrt(disc)) / (2 * qa);
  return t >= 0 && t <= 1 ? t : null;
}

/** The first obstacle on the segment a→b (shots use `pad` = their half size), or null. */
export function firstObstacleHit(obstacles: readonly Obstacle[], a: Vec2, b: Vec2, pad = 0): number | null {
  let best: number | null = null;
  for (const o of obstacles) {
    const t = segmentHitsShape(a, b, o.shape, pad);
    if (t !== null && (best === null || t < best)) best = t;
  }
  return best;
}

/** True if a circle at `p` with radius `r` overlaps the shape (for keeping spawn points clear). */
export function shapeNear(s: Shape, p: Vec2, r: number): boolean {
  if (s.kind === "circle") return Math.hypot(p.x - s.x, p.y - s.y) < s.r + r;
  const dx = Math.max(Math.abs(p.x - s.x) - s.w / 2, 0);
  const dy = Math.max(Math.abs(p.y - s.y) - s.h / 2, 0);
  return Math.hypot(dx, dy) < r;
}

/** Moves a fighter (its bounding box) out of the shape, along the shortest way out. */
export function pushOut(f: Fighter, s: Shape): void {
  const hw = f.size.x / 2;
  const hh = f.size.y / 2;
  if (s.kind === "box") {
    const overlapX = hw + s.w / 2 - Math.abs(f.pos.x - s.x);
    const overlapY = hh + s.h / 2 - Math.abs(f.pos.y - s.y);
    if (overlapX <= 0 || overlapY <= 0) return;
    if (overlapX < overlapY) f.pos.x += f.pos.x < s.x ? -overlapX : overlapX;
    else f.pos.y += f.pos.y < s.y ? -overlapY : overlapY;
    return;
  }
  // Circle: nearest point of the box to its center.
  const nx = Math.max(f.pos.x - hw, Math.min(s.x, f.pos.x + hw));
  const ny = Math.max(f.pos.y - hh, Math.min(s.y, f.pos.y + hh));
  let [dx, dy] = [nx - s.x, ny - s.y];
  let d = Math.hypot(dx, dy);
  if (d >= s.r) return;
  if (d < 1e-6) {
    // Center inside the box: push along the line between centers.
    [dx, dy] = [s.x - f.pos.x, s.y - f.pos.y];
    d = Math.hypot(dx, dy) || 1;
    const depth = s.r + Math.min(hw, hh);
    f.pos.x -= (dx / d) * depth;
    f.pos.y -= (dy / d) * depth;
    return;
  }
  // Move the box away from the circle's center until its nearest point is on the rim.
  f.pos.x += (dx / d) * (s.r - d);
  f.pos.y += (dy / d) * (s.r - d);
}
