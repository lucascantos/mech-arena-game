import { ARENA_HEIGHT, ARENA_WIDTH } from "./constants";
import type { Fighter } from "./fighter";
import { emptyInput, type Input } from "./input";
import type { WorldEvent } from "./events";
import type { Projectile } from "./projectiles/projectile";
import { Rng } from "./rng";

/**
 * The whole game state. Advances only through `step()`, one fixed tick at a
 * time, using nothing but the inputs it's given — so it can run identically on
 * a server later.
 */
export class World {
  tick = 0;
  readonly width = ARENA_WIDTH;
  readonly height = ARENA_HEIGHT;
  readonly fighters: Fighter[] = [];
  projectiles: Projectile[] = [];
  /** Events from the most recent tick. Cleared at the start of every step. */
  events: WorldEvent[] = [];
  readonly rng: Rng;
  private nextId = 1;

  constructor(seed: number) {
    this.rng = new Rng(seed);
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
    for (const f of this.fighters) f.applyInput(inputs.get(f.id) ?? emptyInput(), this);
    for (const f of this.fighters) f.update(this);
    for (const p of this.projectiles) p.update(this);
    this.projectiles = this.projectiles.filter((p) => p.alive);
    this.separateFighters();
    for (const f of this.fighters) this.keepInArena(f);
    this.tick++;
  }

  /** Puts every fighter back at its spawn and clears projectiles. */
  resetRound(): void {
    this.projectiles = [];
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

  private keepInArena(f: Fighter): void {
    const hw = f.size.x / 2;
    const hh = f.size.y / 2;
    f.pos.x = Math.min(this.width - hw, Math.max(hw, f.pos.x));
    f.pos.y = Math.min(this.height - hh, Math.max(hh, f.pos.y));
  }
}
