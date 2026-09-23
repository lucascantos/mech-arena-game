import type { Fighter } from "../sim/fighter";
import type { Vec2 } from "../sim/vec";
import type { World } from "../sim/world";

/** Sim ticks between pings (1 second at 60 Hz). */
const PING_TICKS = 60;

export interface Contact {
  fighterId: number;
  pos: Vec2;
  color: string;
  alive: boolean;
}

/**
 * Once per second, snapshots where every other fighter is. The minimap and
 * the edge arrows both draw from this snapshot, so other fighters' positions
 * are always up to a second old; only your own position is live.
 */
export class Radar {
  contacts: Contact[] = [];
  private lastPing = -Infinity;
  private tick = 0;
  private focusId = -1;

  /**
   * Call every frame before drawing. Pings when a second has passed, or right
   * away when the camera switches fighters (kill cam), so the new "you" isn't
   * left in the snapshot as a stale contact.
   */
  update(world: World, focus: Fighter): void {
    this.tick = world.tick;
    const due = world.tick - this.lastPing >= PING_TICKS || world.tick < this.lastPing;
    if (!due && focus.id === this.focusId) return;
    this.focusId = focus.id;
    this.lastPing = world.tick;
    this.contacts = world.fighters
      .filter((f) => f !== focus)
      .map((f) => ({ fighterId: f.id, pos: { ...f.pos }, color: f.color, alive: f.alive }));
  }

  /** 0 right at a ping → 1 just before the next one. */
  get age(): number {
    return Math.min(1, (this.tick - this.lastPing) / PING_TICKS);
  }

  /** Contact opacity: bright at the ping, fading as the data goes stale. */
  get fade(): number {
    return 1 - 0.7 * this.age;
  }
}
