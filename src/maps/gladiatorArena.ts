import type { Obstacle } from "../sim/obstacles";
import type { Decor, MapLayout } from "./gameMap";
import { box, circle, flat, solid } from "./layout";

/**
 * Arena: a round gladiator pit with symmetric, tactical cover. A statue in
 * the middle, four low walls around it (one per side), and a ring of pillars
 * farther out. Every spawn has the same cover within reach.
 */
export function buildArena(radius: number): MapLayout {
  const c = radius;
  const obstacles: Obstacle[] = [];
  const decor: Decor[] = [
    flat(circle(c, c, radius * 0.2), "ring"),
    flat(circle(c, c, radius * 0.5), "ring"),
    flat(circle(c, c, radius * 0.8), "ring"),
  ];
  obstacles.push(solid(circle(c, c, Math.max(50, radius * 0.07)), "statue"));

  const near = radius * 0.3;
  const long = Math.max(160, radius * 0.2);
  obstacles.push(
    solid(box(c, c - near, long, 28), "wall"),
    solid(box(c, c + near, long, 28), "wall"),
    solid(box(c - near, c, 28, long), "wall"),
    solid(box(c + near, c, 28, long), "wall"),
  );

  // Pillars, between the spawn directions; more of them on a bigger arena.
  const count = radius > 1500 ? 16 : 8;
  for (let k = 0; k < count; k++) {
    const a = ((k + 0.5) / count) * Math.PI * 2;
    obstacles.push(solid(circle(c + Math.cos(a) * radius * 0.6, c + Math.sin(a) * radius * 0.6, 38), "pillar"));
  }
  return {
    grip: 1,
    theme: { floor: "#3b3326", grid: "#3f372a", outside: "#15110c", wall: "#8a7a60" },
    obstacles,
    decor,
  };
}
