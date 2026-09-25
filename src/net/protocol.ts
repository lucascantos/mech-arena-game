import type { MapId } from "../maps/gameMap";
import type { WorldEvent } from "../sim/events";
import type { Input } from "../sim/input";

/** One fighter's state: [id, x, y, vx, vy, facingX, facingY, hp, weaponSlot, energy, dash, braceTicksLeft (-1 = none), weapons, back unit]. */
export type FighterState = [
  id: number,
  x: number,
  y: number,
  vx: number,
  vy: number,
  fx: number,
  fy: number,
  hp: number,
  slot: number,
  energy: number,
  dash: [activeLeft: number, elapsed: number],
  brace: number,
  weapons: number[][],
  back: number[],
];

/** One projectile: [id, x, y, vx, vy, size, damageType (0 bullet, 1 energy, 2 explosive), targetId (-1 = none)]. */
export type ProjectileState = [id: number, x: number, y: number, vx: number, vy: number, size: number, type: number, target: number];

/** Match state: [scores as [team, wins][], countdownLeft, fightTicks, roundOver, lastWinner (-1 = none)]. */
export type MatchState = [scores: [number, number][], countdownLeft: number, fightTicks: number, roundOver: boolean, lastWinner: number];

/** Everything a joined player needs to draw one moment of the match. */
export interface Snapshot {
  t: "snap";
  tick: number;
  fighters: FighterState[];
  projectiles: ProjectileState[];
  match: MatchState;
  /** Everything that happened since the previous snapshot (hits, kills, explosions...). */
  events: WorldEvent[];
}

/** Host → player. */
export type HostMessage =
  | { t: "lobby"; players: number }
  | { t: "start"; lineup: string[]; you: number; map: MapId }
  | Snapshot;

/** Player → host: that player's input for the current tick. */
export type PlayerMessage = { t: "in"; input: Input };

export const DAMAGE_TYPES = ["bullet", "energy", "explosive"] as const;
/** The host sends a snapshot every this many ticks (60 / 2 = 30 per second). */
export const SNAPSHOT_EVERY = 2;
