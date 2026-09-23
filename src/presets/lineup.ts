import type { Fighter } from "../sim/fighter";
import type { World } from "../sim/world";
import { buildFighter } from "./buildFighter";
import type { MechPreset } from "./presets";

/** Team colors, in spawn order. */
const COLORS = ["#e5534b", "#4c8ed9", "#57ab5a", "#c69026", "#b083f0", "#39c5cf", "#e0823d", "#d16ba5"];

/** Spawn ring as a fraction of the arena size, so fighters start spread out. */
const RING_X = 0.36;
const RING_Y = 0.34;

/**
 * Adds one fighter per preset, each on its own team (free-for-all), spaced
 * evenly on a ring around the arena center. Two fighters start left/right.
 */
export function spawnLineup(world: World, presets: MechPreset[]): Fighter[] {
  const cx = world.width / 2;
  const cy = world.height / 2;
  return presets.map((preset, i) => {
    const angle = Math.PI + (i / presets.length) * Math.PI * 2;
    const pos = { x: cx + Math.cos(angle) * world.width * RING_X, y: cy + Math.sin(angle) * world.height * RING_Y };
    const at = { id: i + 1, team: i + 1, color: COLORS[i % COLORS.length], pos };
    return world.addFighter(buildFighter(preset, at));
  });
}
