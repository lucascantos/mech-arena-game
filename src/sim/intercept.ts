import { add, dot, scale, sub, type Vec2 } from "./vec";

/**
 * Where to aim so a projectile fired from `from` at `speed` meets a target at
 * `targetPos` moving with constant `targetVel`. Solves |r + v·t| = speed·t for
 * the earliest positive t. If the target can't be caught (outrunning the
 * shot), returns its current position.
 */
export function interceptPoint(from: Vec2, targetPos: Vec2, targetVel: Vec2, speed: number): Vec2 {
  const r = sub(targetPos, from);
  const a = dot(targetVel, targetVel) - speed * speed;
  const b = 2 * dot(r, targetVel);
  const c = dot(r, r);
  let t: number;
  if (Math.abs(a) < 1e-9) {
    t = b < 0 ? -c / b : -1; // target speed equals projectile speed
  } else {
    const disc = b * b - 4 * a * c;
    if (disc < 0) return targetPos;
    const sq = Math.sqrt(disc);
    const t1 = (-b - sq) / (2 * a);
    const t2 = (-b + sq) / (2 * a);
    t = Math.min(...[t1, t2].filter((x) => x > 0), Infinity);
  }
  return t > 0 && Number.isFinite(t) ? add(targetPos, scale(targetVel, t)) : targetPos;
}
