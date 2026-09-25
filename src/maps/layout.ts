import type { Obstacle, ObstacleLook, Shape } from "../sim/obstacles";
import type { Rng } from "../sim/rng";
import type { Decor, DecorLook } from "./gameMap";

/** Helpers for map generators. The arena is centered at (radius, radius). */
export const box = (x: number, y: number, w: number, h: number): Shape => ({ kind: "box", x, y, w, h });
export const circle = (x: number, y: number, r: number): Shape => ({ kind: "circle", x, y, r });
export const solid = (shape: Shape, look: ObstacleLook): Obstacle => ({ shape, look });
export const flat = (shape: Shape, look: DecorLook): Decor => ({ shape, look });

/** True if the whole shape is inside the arena circle, at least `margin` from the wall. */
export function fitsInArena(s: Shape, radius: number, margin: number): boolean {
  const reach = s.kind === "circle" ? s.r : Math.hypot(s.w / 2, s.h / 2);
  return Math.hypot(s.x - radius, s.y - radius) + reach <= radius - margin;
}

/** Mechs must fit between cover and the wall, so nothing is placed closer to the wall than this. */
export const WALL_CLEARANCE = 110;

/** Empty space between two shapes (0 if they touch). */
function gap(a: Shape, b: Shape): number {
  if (a.kind === "circle" && b.kind === "circle") return Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r;
  if (a.kind === "circle" || b.kind === "circle") {
    const [c, r] = a.kind === "circle" ? [a, a.r] : [b as Shape, (b as { r: number }).r];
    const bx = a.kind === "box" ? a : (b as Extract<Shape, { kind: "box" }>);
    const dx = Math.max(Math.abs(c.x - bx.x) - bx.w / 2, 0);
    const dy = Math.max(Math.abs(c.y - bx.y) - bx.h / 2, 0);
    return Math.hypot(dx, dy) - r;
  }
  const dx = Math.max(Math.abs(a.x - b.x) - (a.w + b.w) / 2, 0);
  const dy = Math.max(Math.abs(a.y - b.y) - (a.h + b.h) / 2, 0);
  return Math.hypot(dx, dy);
}

/**
 * Tries `tries` random shapes from `make`, keeping those that fit in the
 * arena, pass `where` and stay `spacing` away from everything in `placed`.
 */
export function scatter(
  tries: number,
  make: () => Shape,
  radius: number,
  spacing: number,
  placed: Shape[],
  where: (s: Shape) => boolean = () => true,
): Shape[] {
  const out: Shape[] = [];
  for (let i = 0; i < tries; i++) {
    const s = make();
    if (!fitsInArena(s, radius, WALL_CLEARANCE) || !where(s)) continue;
    if (placed.some((p) => gap(p, s) < spacing)) continue;
    placed.push(s);
    out.push(s);
  }
  return out;
}

/** A random point in the arena disk (uniform over its area). */
export function pointInArena(rng: Rng, radius: number): { x: number; y: number } {
  const a = rng.range(0, Math.PI * 2);
  const d = Math.sqrt(rng.range(0, 1)) * radius;
  return { x: radius + Math.cos(a) * d, y: radius + Math.sin(a) * d };
}
