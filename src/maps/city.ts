import type { Obstacle, Shape } from "../sim/obstacles";
import type { Rng } from "../sim/rng";
import type { Decor, MapLayout } from "./gameMap";
import { box, circle, fitsInArena, flat, scatter, solid, WALL_CLEARANCE } from "./layout";

/** Half the width of the highway band across the middle. */
const HIGHWAY = 130;
/** Building grid: one block per cell, streets in between. */
const CELL = 260;

/**
 * Abandoned City, in three parts: a highway across the middle (median
 * barriers with gaps, wrecked cars on the lanes), a park to the north (trees,
 * hedges, a pond: soft, scattered cover) and city blocks to the south (a grid
 * of buildings with streets between them, a few empty lots).
 */
export function buildCity(radius: number, rng: Rng): MapLayout {
  const c = radius;
  const obstacles: Obstacle[] = [];
  const decor: Decor[] = [];
  const placed: Shape[] = [];

  // Highway: road, lane markings, a broken median, wrecks.
  decor.push(flat(box(c, c, radius * 2, HIGHWAY * 2), "road"));
  for (let x = 0; x < radius * 2; x += 120) {
    decor.push(flat(box(x, c - HIGHWAY / 2, 50, 5), "lane"), flat(box(x, c + HIGHWAY / 2, 50, 5), "lane"));
  }
  for (let x = 90; x < radius * 2; x += 280) {
    const s = box(x, c, 190, 16);
    if (fitsInArena(s, radius, WALL_CLEARANCE)) (obstacles.push(solid(s, "barrier")), placed.push(s));
  }
  const cars = scatter(Math.round(radius / 40), () => {
    const lane = rng.chance(0.5) ? -1 : 1;
    return box(rng.range(0, radius * 2), c + lane * rng.range(45, 95), 78, 38);
  }, radius, 40, placed);
  for (const s of cars) obstacles.push(solid(s, "car"));

  // Park (north): grass, a pond, hedges and trees.
  const north = (s: Shape) => s.y < c - HIGHWAY - 50;
  decor.push(flat(box(c, (c - HIGHWAY) / 2, radius * 2, c - HIGHWAY), "grass"));
  decor.push(flat(circle(c - radius * 0.25, c - radius * 0.55, radius * 0.13), "pond"));
  placed.push(circle(c - radius * 0.25, c - radius * 0.55, radius * 0.13 + 20));
  const hedges = scatter(Math.round(radius / 60), () => {
    const long = rng.range(110, 200);
    return rng.chance(0.5) ? box(rng.range(0, 2 * c), rng.range(0, c), long, 22) : box(rng.range(0, 2 * c), rng.range(0, c), 22, long);
  }, radius, 110, placed, north);
  for (const s of hedges) obstacles.push(solid(s, "hedge"));
  const trees = scatter(Math.round((radius * radius) / 9000), () => circle(rng.range(0, 2 * c), rng.range(0, c), rng.range(22, 36)), radius, 70, placed, north);
  for (const s of trees) obstacles.push(solid(s, "tree"));

  // City blocks (south): a grid of buildings; some lots are empty plazas.
  const top = c + HIGHWAY + 60;
  for (let y = top + CELL / 2; y < radius * 2; y += CELL) {
    for (let x = c - Math.floor(radius / CELL) * CELL; x < radius * 2; x += CELL) {
      const w = rng.range(150, 190);
      const h = rng.range(150, 190);
      const s = box(x, y, w, h);
      if (!fitsInArena(s, radius, WALL_CLEARANCE)) continue;
      if (rng.chance(0.2)) {
        decor.push(flat(s, "plaza"));
        continue;
      }
      obstacles.push(solid(s, "building"));
    }
  }
  return {
    grip: 1,
    theme: { floor: "#1b1f24", grid: "#22272e", outside: "#0b0d10", wall: "#4a525e" },
    obstacles,
    decor,
  };
}
