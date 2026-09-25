import type { Obstacle, Shape } from "../sim/obstacles";
import { Rng } from "../sim/rng";
import { buildArena } from "./gladiatorArena";
import { buildCity } from "./city";
import { buildDesert } from "./desert";
import { buildGlacier } from "./glacier";

/** Radius of a standard map: a circle with about the floor area of the old 2400 × 1600 arena. */
export const STANDARD_RADIUS = 1100;

export type MapId = "training" | "city" | "desert" | "glacier" | "arena";

/** Maps you can pick for a match (the training ground is its own mode). */
export const BATTLE_MAPS: { id: MapId; name: string; detail: string }[] = [
  { id: "city", name: "Abandoned City", detail: "A park, city blocks and a highway: lanes, corners and cover" },
  { id: "desert", name: "Desert", detail: "Wide open sand with a few rocks for cover" },
  { id: "glacier", name: "Glacier", detail: "An ice island in the sea: slippery footing, long slides" },
  { id: "arena", name: "Arena", detail: "A gladiator pit with pillars and low walls" },
];

/** Flat, non-solid ground detail (roads, grass, dunes...), drawn under everything. */
export type DecorLook = "grass" | "road" | "lane" | "pond" | "dune" | "crack" | "plaza" | "ring";

export interface Decor {
  shape: Shape;
  look: DecorLook;
}

/** Colors of the ground, the area outside the wall (water, stands...) and the wall itself. */
export interface MapTheme {
  floor: string;
  grid: string;
  outside: string;
  wall: string;
}

export interface GameMap {
  id: MapId;
  name: string;
  /** The arena is a circle of this radius; the world is the square around it. */
  radius: number;
  /** Multiplier on acceleration and on how fast knockback fades (1 = normal ground; ice is lower). */
  grip: number;
  theme: MapTheme;
  obstacles: Obstacle[];
  decor: Decor[];
}

/** What a map generator adds on top of the id, name and radius. */
export type MapLayout = Omit<GameMap, "id" | "name" | "radius">;

/**
 * Builds a map at `radius` (bigger for battle royale). Layouts are generated
 * from a fixed seed per map, so a map comes out the same every time and on
 * every machine; features are placed by density, so bigger maps get more.
 */
export function buildMap(id: MapId, radius = STANDARD_RADIUS): GameMap {
  const rng = new Rng(SEEDS[id]);
  const name = id === "training" ? "Training Ground" : BATTLE_MAPS.find((m) => m.id === id)!.name;
  return { id, name, radius, ...LAYOUTS[id](radius, rng) };
}

const SEEDS: Record<MapId, number> = { training: 1, city: 1301, desert: 2702, glacier: 3803, arena: 4904 };

const LAYOUTS: Record<MapId, (radius: number, rng: Rng) => MapLayout> = {
  training: () => ({ grip: 1, theme: { floor: "#161b22", grid: "#1f2630", outside: "#0b0e13", wall: "#3a4452" }, obstacles: [], decor: [] }),
  city: buildCity,
  desert: buildDesert,
  glacier: buildGlacier,
  arena: buildArena,
};

export const randomBattleMap = (): MapId => BATTLE_MAPS[Math.floor(Math.random() * BATTLE_MAPS.length)].id;
