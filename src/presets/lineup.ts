import type { Fighter } from "../sim/fighter";
import { spawnAssignment, spawnSlots } from "../sim/spawnRotation";
import type { World } from "../sim/world";
import { buildFighter } from "./buildFighter";
import type { MechPreset } from "./presets";

/** Team colors, in spawn order. */
const COLORS = ["#e5534b", "#4c8ed9", "#57ab5a", "#c69026", "#b083f0", "#39c5cf", "#e0823d", "#d16ba5"];

/** Suffixes for repeated presets in one lineup. */
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

/** Spawn ring as a fraction of the arena radius, so fighters start spread out. */
const RING = 0.72;
/** Obstacles this close to a spawn point are removed, so nobody starts inside cover. */
const SPAWN_CLEARANCE = 110;

/**
 * Adds one fighter per preset, each on its own team (free-for-all). Spawn
 * points are spaced evenly on a ring around the arena center (two fighters
 * start left/right); who gets which point changes every round, so neighbors
 * differ (see spawnRotation).
 */
export function spawnLineup(world: World, presets: MechPreset[]): Fighter[] {
  const { x: cx, y: cy, r } = world.arena;
  const slots = spawnSlots(presets.length);
  world.spawnPoints = Array.from({ length: slots }, (_, k) => {
    const angle = Math.PI + (k / slots) * Math.PI * 2;
    return { x: cx + Math.cos(angle) * r * RING, y: cy + Math.sin(angle) * r * RING };
  });
  world.clearSpawns(SPAWN_CLEARANCE);
  const spots = spawnAssignment(presets.length, 0);
  const seen = new Map<string, number>();
  return presets.map((preset, i) => {
    const count = (seen.get(preset.id) ?? 0) + 1;
    seen.set(preset.id, count);
    const name = count > 1 ? `${preset.name} ${ROMAN[count - 1] ?? count}` : preset.name;
    const pos = world.spawnPoints[spots[i]];
    const at = { id: i + 1, team: i + 1, color: COLORS[i % COLORS.length], pos, name };
    return world.addFighter(buildFighter(preset, at));
  });
}
