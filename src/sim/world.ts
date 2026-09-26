import { buildMap, type GameMap } from "../maps/gameMap";
import { clampToArena, type ArenaCircle } from "./arena";
import type { Fighter } from "./fighter";
import { pushOut, shapeNear, type Obstacle } from "./obstacles";
import { emptyInput, type Input } from "./input";
import type { WorldEvent } from "./events";
import type { Projectile } from "./projectiles/projectile";
import { Rng } from "./rng";
import { spawnAssignment } from "./spawnRotation";
import type { Vec2 } from "./vec";

/**
 * The whole game state. Advances only through `step()`, one fixed tick at a
 * time, using nothing but the inputs it's given — so it can run identically on
 * a server later.
 */
export class World {
  tick = 0;
  /** The circular wall: the map's full circle, unless a battle royale Zone is closing it in. */
  arena: ArenaCircle;
  /** Solid things on the map (stop mechs and shots). */
  obstacles: Obstacle[] = [];
  /** Cover destroyed this round, left as rubble (drawn, not solid). */
  destroyed: Obstacle[] = [];
  /** The obstacles at round start (after spawn clearing), to restore each round. */
  private roundStart: Obstacle[] = [];
  /** The square around the arena circle. */
  readonly width: number;
  readonly height: number;
  readonly fighters: Fighter[] = [];
  /** While true (e.g. the pre-round countdown), fighters can aim but not move, shoot or dash. */
  inputLocked = false;
  /** Fixed spawn points. When set, fighters swap between them each round (see spawnRotation). */
  spawnPoints: Vec2[] = [];
  projectiles: Projectile[] = [];
  /** Events from the most recent tick. Cleared at the start of every step. */
  events: WorldEvent[] = [];
  readonly rng: Rng;
  private nextId = 1;

  constructor(
    seed: number,
    readonly map: GameMap = buildMap("training"),
  ) {
    this.rng = new Rng(seed);
    this.width = this.height = map.radius * 2;
    this.arena = this.fullArena();
    this.restoreCover(map.obstacles);
  }

  fullArena(): ArenaCircle {
    return { x: this.map.radius, y: this.map.radius, r: this.map.radius };
  }

  get center(): Vec2 {
    return { x: this.arena.x, y: this.arena.y };
  }

  /** Removes obstacles on or near the spawn points, so nobody starts inside a wall. */
  clearSpawns(clearance: number): void {
    this.restoreCover(this.roundStart.filter((o) => !this.spawnPoints.some((p) => shapeNear(o.shape, p, clearance))));
  }

  /** Takes a destroyed obstacle out of play (it stays as rubble until the round ends). */
  destroyObstacle(o: Obstacle): void {
    this.obstacles = this.obstacles.filter((x) => x !== o);
    this.destroyed.push(o);
    this.emit({ kind: "coverDestroyed", pos: { x: o.shape.x, y: o.shape.y }, look: o.look });
  }

  /** Online: mirrors the host's destroyed cover (by id). */
  syncDestroyed(ids: readonly number[]): void {
    const gone = new Set(ids);
    this.obstacles = this.roundStart.filter((o) => !gone.has(o.id!));
    this.destroyed = this.roundStart.filter((o) => gone.has(o.id!));
  }

  /** Puts `cover` back in play, intact, with fresh HP and ids. */
  private restoreCover(cover: readonly Obstacle[]): void {
    this.roundStart = cover.map((o, id) => ({ ...o, id, hp: o.durability?.hp }));
    this.obstacles = [...this.roundStart];
    this.destroyed = [];
  }

  addFighter(fighter: Fighter): Fighter {
    this.fighters.push(fighter);
    return fighter;
  }

  getFighter(id: number): Fighter | undefined {
    return this.fighters.find((f) => f.id === id);
  }

  /** Unique id for a new entity (projectiles for now). */
  nextEntityId(): number {
    return this.nextId++;
  }

  addProjectile(p: Projectile): void {
    this.projectiles.push(p);
  }

  emit(event: WorldEvent): void {
    this.events.push(event);
  }

  /** Advances the simulation by one tick. Missing inputs count as "nothing pressed". */
  step(inputs: ReadonlyMap<number, Input>): void {
    this.events = [];
    for (const f of this.fighters) {
      const input = inputs.get(f.id) ?? emptyInput();
      f.applyInput(this.inputLocked ? { ...emptyInput(), aimX: input.aimX, aimY: input.aimY } : input, this);
    }
    for (const f of this.fighters) f.update(this);
    for (const p of this.projectiles) p.update(this);
    this.projectiles = this.projectiles.filter((p) => p.alive);
    this.separateFighters();
    for (const f of this.fighters) {
      // A few passes, so a mech squeezed between two pieces of cover (or cover and the wall) settles in the gap.
      for (let pass = 0; pass < 4; pass++) {
        for (const o of this.obstacles) pushOut(f, o.shape);
        this.keepInArena(f);
      }
    }
    this.tick++;
  }

  /** Moves fighters to their spawn points for `round` (0 = first round). */
  assignSpawns(round: number): void {
    if (this.spawnPoints.length === 0) return;
    const spots = spawnAssignment(this.fighters.length, round);
    this.fighters.forEach((f, i) => (f.spawn = { ...this.spawnPoints[spots[i]] }));
  }

  /** Clears projectiles and puts every fighter back at its spawn point for `round`. */
  resetRound(round: number): void {
    this.projectiles = [];
    this.arena = this.fullArena();
    this.restoreCover(this.roundStart);
    this.assignSpawns(round);
    for (const f of this.fighters) f.respawn();
  }

  /** Pushes overlapping bounding boxes apart along the axis of least overlap. */
  private separateFighters(): void {
    const list = this.fighters.filter((f) => f.alive);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const dx = b.pos.x - a.pos.x;
        const dy = b.pos.y - a.pos.y;
        const overlapX = (a.size.x + b.size.x) / 2 - Math.abs(dx);
        const overlapY = (a.size.y + b.size.y) / 2 - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;
        if (overlapX < overlapY) {
          const push = (overlapX / 2) * (dx < 0 ? -1 : 1);
          a.pos.x -= push;
          b.pos.x += push;
        } else {
          const push = (overlapY / 2) * (dy < 0 ? -1 : 1);
          a.pos.y -= push;
          b.pos.y += push;
        }
      }
    }
  }

  /** Inside the circular wall (a closing wall pushes fighters along). */
  private keepInArena(f: Fighter): void {
    f.pos = clampToArena(this.arena, f.pos, Math.max(f.size.x, f.size.y) / 2);
  }
}
