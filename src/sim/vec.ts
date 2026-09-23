export interface Vec2 {
  x: number;
  y: number;
}

export const vec = (x = 0, y = 0): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const length =(a: Vec2): number => Math.hypot(a.x, a.y);
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);
export const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

/** Unit vector in the same direction, or the zero vector if `a` has no length. */
export function normalize(a: Vec2): Vec2 {
  const len = length(a);
  return len > 1e-9 ? { x: a.x / len, y: a.y / len } : { x: 0, y: 0 };
}

/** Rotates the vector 90° (a sideways direction, used for strafing). */
export const perp = (a: Vec2): Vec2 => ({ x: -a.y, y: a.x });

/** Moves `from` toward `to` by at most `maxDelta` (for acceleration). */
export function approach(from: Vec2, to: Vec2, maxDelta: number): Vec2 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy);
  if (d <= maxDelta || d < 1e-9) return { ...to };
  return { x: from.x + (dx / d) * maxDelta, y: from.y + (dy / d) * maxDelta };
}

/** Rotates unit vector `from` toward unit vector `to` by at most `maxRadians`. */
export function rotateToward(from: Vec2, to: Vec2, maxRadians: number): Vec2 {
  const a = Math.atan2(from.y, from.x);
  const b = Math.atan2(to.y, to.x);
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) <= maxRadians) return { ...to };
  const angle = a + Math.sign(diff) * maxRadians;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

/** Clamps the vector's length to at most 1 (keeps diagonal input from being faster). */
export function clampUnit(a: Vec2): Vec2 {
  const len = length(a);
  return len > 1 ? { x: a.x / len, y: a.y / len } : a;
}
