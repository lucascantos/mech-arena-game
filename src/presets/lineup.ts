import type { Fighter } from "../sim/fighter";
import type { World } from "../sim/world";
import { buildFighter } from "./buildFighter";
import type { MechPreset } from "./presets";

/** Team colors, in spawn order. */
const COLORS = ["#e5534b", "#4c8ed9", "#57ab5a", "#c69026", "#b083f0", "#39c5cf", "#e0823d", "#d16ba5"];

/** Suffixes for repeated presets in one lineup. */
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

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
  const seen = new Map<string, number>();
  return presets.map((preset, i) => {
    const count = (seen.get(preset.id) ?? 0) + 1;
    seen.set(preset.id, count);
    const name = count > 1 ? `${preset.name} ${ROMAN[count - 1] ?? count}` : preset.name;
    const angle = Math.PI + (i / presets.length) * Math.PI * 2;
    const pos = { x: cx + Math.cos(angle) * world.width * RING_X, y: cy + Math.sin(angle) * world.height * RING_Y };
    const at = { id: i + 1, team: i + 1, color: COLORS[i % COLORS.length], pos, name };
    return world.addFighter(buildFighter(preset, at));
  });
}
