import { DT } from "./constants";
import type { World } from "./world";

/** How fast the arena shrinks: fraction of the full map (per side) per second. */
const SHRINK_RATE = 0.05;

/**
 * Battle royale: the arena walls close in as mechs fall. With everyone alive
 * the arena is the whole map; with two left it's `minScale` of it (per side);
 * in between it scales with how many are still standing. The walls slide in
 * at SHRINK_RATE (a shrinking circle), pushing anyone in the way, and
 * never move back out during a round.
 */
export class Zone {
  /** Current size, as a fraction of the full map per side. */
  private scale = 1;

  constructor(
    private readonly startCount: number,
    private readonly minScale: number,
  ) {}

  /** Call once per tick, after the world steps. */
  update(world: World): void {
    const alive = world.fighters.filter((f) => f.alive).length;
    if (alive >= this.startCount) this.scale = 1; // a new round: the world reset the walls
    const t = Math.max(0, Math.min(1, (alive - 2) / Math.max(1, this.startCount - 2)));
    const target = this.minScale + (1 - this.minScale) * t;
    this.scale = Math.max(target, this.scale - SHRINK_RATE * DT);
    world.arena = { ...world.fullArena(), r: world.map.radius * this.scale };
  }
}
