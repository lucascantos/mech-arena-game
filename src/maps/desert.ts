import type { Obstacle, Shape } from "../sim/obstacles";
import type { Rng } from "../sim/rng";
import type { Decor, MapLayout } from "./gameMap";
import { circle, flat, pointInArena, scatter, solid } from "./layout";

/**
 * Desert: wide open sand. Cover is rare: a handful of rock clusters (one to
 * three boulders each), far apart, so fights are about range and speed and
 * who gets to the rocks first. Dunes are just ground color.
 */
export function buildDesert(radius: number, rng: Rng): MapLayout {
  const obstacles: Obstacle[] = [];
  const decor: Decor[] = [];
  for (let i = 0; i < Math.round((radius * radius) / 120000); i++) {
    const p = pointInArena(rng, radius);
    decor.push(flat(circle(p.x, p.y, rng.range(140, 320)), "dune"));
  }
  const clusters: Shape[] = [];
  const anchors = scatter(Math.round((radius * radius) / 60000), () => {
    const p = pointInArena(rng, radius * 0.9);
    return circle(p.x, p.y, 130);
  }, radius, 280, clusters);
  for (const a of anchors) {
    if (a.kind !== "circle") continue;
    const count = rng.int(1, 3);
    for (let k = 0; k < count; k++) {
      const angle = rng.range(0, Math.PI * 2);
      const d = k === 0 ? 0 : rng.range(50, 90);
      obstacles.push(solid(circle(a.x + Math.cos(angle) * d, a.y + Math.sin(angle) * d, rng.range(35, 75)), "rock"));
    }
  }
  return {
    grip: 1,
    theme: { floor: "#3a3022", grid: "#41362a", outside: "#1d160d", wall: "#6b5a45" },
    obstacles,
    decor,
  };
}
