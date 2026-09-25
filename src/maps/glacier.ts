import type { Obstacle, Shape } from "../sim/obstacles";
import type { Rng } from "../sim/rng";
import type { Decor, MapLayout } from "./gameMap";
import { box, flat, pointInArena, scatter, circle, solid } from "./layout";

/** Ice: a third of the usual grip, so mechs slide and knockback carries. */
const ICE_GRIP = 0.35;

/**
 * Glacier: an ice island ringed by sea (the water is scenery; the wall is the
 * shoreline). Slippery everywhere. Cover is ice boulders and a few ice ridges;
 * cracks are just ground detail.
 */
export function buildGlacier(radius: number, rng: Rng): MapLayout {
  const obstacles: Obstacle[] = [];
  const decor: Decor[] = [];
  const placed: Shape[] = [];
  for (let i = 0; i < Math.round((radius * radius) / 50000); i++) {
    const p = pointInArena(rng, radius * 0.95);
    const long = rng.range(80, 220);
    decor.push(flat(rng.chance(0.5) ? box(p.x, p.y, long, 3) : box(p.x, p.y, 3, long), "crack"));
  }
  const ridges = scatter(Math.round(radius / 180), () => {
    const p = pointInArena(rng, radius * 0.85);
    const long = rng.range(150, 260);
    return rng.chance(0.5) ? box(p.x, p.y, long, 30) : box(p.x, p.y, 30, long);
  }, radius, 200, placed);
  for (const s of ridges) obstacles.push(solid(s, "ice"));
  const boulders = scatter(Math.round((radius * radius) / 50000), () => {
    const p = pointInArena(rng, radius * 0.9);
    return circle(p.x, p.y, rng.range(30, 60));
  }, radius, 160, placed);
  for (const s of boulders) obstacles.push(solid(s, "ice"));
  return {
    grip: ICE_GRIP,
    theme: { floor: "#2b3d4f", grid: "#324658", outside: "#0c2740", wall: "#9fc3d9" },
    obstacles,
    decor,
  };
}
