import type { Vec2 } from "./vec";

/** The circular wall around the fight: center and radius. A battle royale Zone shrinks `r`. */
export interface ArenaCircle {
  x: number;
  y: number;
  r: number;
}

export function insideArena(c: ArenaCircle, p: Vec2, margin = 0): boolean {
  return Math.hypot(p.x - c.x, p.y - c.y) <= c.r - margin;
}

/** `p` pulled back inside the circle, `margin` from the wall. */
export function clampToArena(c: ArenaCircle, p: Vec2, margin = 0): Vec2 {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  const d = Math.hypot(dx, dy);
  const max = Math.max(0, c.r - margin);
  if (d <= max) return p;
  return { x: c.x + (dx / d) * max, y: c.y + (dy / d) * max };
}

/** Where the segment a→b (a inside) leaves the circle, as a fraction of the path; 1 if it stays inside. */
export function arenaExit(c: ArenaCircle, a: Vec2, b: Vec2): number {
  const [dx, dy] = [b.x - a.x, b.y - a.y];
  const [fx, fy] = [a.x - c.x, a.y - c.y];
  const qa = dx * dx + dy * dy;
  if (qa < 1e-9) return 1;
  const qb = 2 * (fx * dx + fy * dy);
  const qc = fx * fx + fy * fy - c.r * c.r;
  const disc = qb * qb - 4 * qa * qc;
  if (disc < 0) return 1;
  const t = (-qb + Math.sqrt(disc)) / (2 * qa);
  return Math.max(0, Math.min(1, t));
}
