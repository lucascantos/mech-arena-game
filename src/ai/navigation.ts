import type { Fighter } from "../sim/fighter";
import { firstObstacleHit, type Shape } from "../sim/obstacles";
import { add, dot, length, normalize, perp, scale, sub, type Vec2 } from "../sim/vec";
import type { World } from "../sim/world";
import { navGridOf } from "./navGrid";

/** How far past its own edge a bot starts steering around obstacles. */
const LOOKAHEAD = 70;

/** True if nothing solid is on the line between two points (a shot would get through). */
export function clearShot(world: World, from: Vec2, to: Vec2): boolean {
  return firstObstacleHit(world.obstacles, from, to, 3) === null;
}

/**
 * Bends a desired move direction around nearby obstacles: the part of the
 * move that goes into an obstacle is removed (so the bot slides along it), and
 * a push away grows as it gets closer. Heading straight into a face, it picks
 * a side and goes around.
 */
export function avoidObstacles(self: Fighter, move: Vec2, world: World, side: number): Vec2 {
  if (move.x === 0 && move.y === 0) return move;
  let out = move;
  const reach = Math.max(self.size.x, self.size.y) / 2 + LOOKAHEAD;
  for (const o of world.obstacles) {
    const away = sub(self.pos, nearestPoint(o.shape, self.pos));
    const d = length(away);
    if (d > reach || d < 1e-6) continue;
    const n = scale(away, 1 / d);
    const into = dot(out, n);
    if (into < 0) {
      out = sub(out, scale(n, into)); // slide along the surface
      if (length(out) < 0.3) out = add(out, scale(perp(n), side)); // dead on: go around
    }
    out = add(out, scale(n, (1 - d / reach) * 0.6));
  }
  return normalize(out);
}

function nearestPoint(s: Shape, p: Vec2): Vec2 {
  if (s.kind === "box") {
    return {
      x: Math.max(s.x - s.w / 2, Math.min(p.x, s.x + s.w / 2)),
      y: Math.max(s.y - s.h / 2, Math.min(p.y, s.y + s.h / 2)),
    };
  }
  const d = normalize(sub(p, s));
  return { x: s.x + d.x * s.r, y: s.y + d.y * s.r };
}

/** Recompute the route this often (ticks), or sooner if the goal moved a lot. */
const REPATH_TICKS = 20;
const REPATH_DISTANCE = 120;
/** How far ahead along the route to look for a waypoint with a straight, clear walk. */
const LOOK_AHEAD_POINTS = 8;

/**
 * Follows a grid route (see NavGrid) toward a goal: heads for the farthest
 * upcoming waypoint it can walk to in a straight line, so paths look direct
 * instead of stair-stepped.
 */
export class PathFollower {
  private path: Vec2[] = [];
  private goal: Vec2 | null = null;
  private age = 0;

  direction(self: Fighter, goal: Vec2, world: World): Vec2 {
    const moved = !this.goal || length(sub(goal, this.goal)) > REPATH_DISTANCE;
    if (moved || --this.age <= 0 || this.path.length === 0) {
      this.path = navGridOf(world).path(self.pos, goal);
      this.goal = goal;
      this.age = REPATH_TICKS;
    }
    while (this.path.length > 1 && length(sub(this.path[0], self.pos)) < 30) this.path.shift();
    if (this.path.length === 0) return normalize(sub(goal, self.pos));
    const pad = Math.max(self.size.x, self.size.y) / 2;
    let target = this.path[0];
    for (let i = Math.min(this.path.length, LOOK_AHEAD_POINTS) - 1; i > 0; i--) {
      if (firstObstacleHit(world.obstacles, self.pos, this.path[i], pad) === null) {
        target = this.path[i];
        break;
      }
    }
    return normalize(sub(target, self.pos));
  }
}
