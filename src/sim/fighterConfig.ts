import type { Head } from "./parts/head";
import type { Legs } from "./parts/legs";
import type { Torso } from "./parts/torso";
import type { Vec2 } from "./vec";

/** What a fighter is built from; parts default to the medium ones. */
export interface FighterConfig {
  id: number;
  name: string;
  team: number;
  color: string;
  pos: Vec2;
  legs?: Legs;
  torso?: Torso;
  head?: Head;
}
