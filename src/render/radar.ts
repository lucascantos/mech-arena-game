import type { Fighter } from "../sim/fighter";
import type { Vec2 } from "../sim/vec";
import { secondsToTicks } from "../sim/constants";
import type { World } from "../sim/world";


export interface Contact {
  fighterId: number;
  pos: Vec2;
  color: string;
  alive: boolean;
}

/**
 * Every few moments (the head's radar interval), snapshots where every other fighter is. The minimap and
 * the edge arrows both draw from this snapshot, so other fighters' positions
 * are up to one interval old; only your own position is live.
 */
export class Radar {
  contacts: Contact[] = [];
  private lastPing = -Infinity;
  private tick = 0;
  private focusId = -1;
  /** Ticks between pings, from the followed mech's head. */
  private interval = 60;

  /**
   * Call every frame before drawing. Pings when the interval has passed, or right
   * away when the camera switches fighters (kill cam), so the new "you" isn't
   * left in the snapshot as a stale contact.
   */
  update(world: World, focus: Fighter): void {
    this.tick = world.tick;
    this.interval = Math.max(1, secondsToTicks(focus.stats.radarInterval));
    const due = world.tick - this.lastPing >= this.interval || world.tick < this.lastPing;
    if (!due && focus.id === this.focusId) return;
    this.focusId = focus.id;
    this.lastPing = world.tick;
    this.contacts = world.fighters
      .filter((f) => f !== focus)
      .map((f) => ({ fighterId: f.id, pos: { ...f.pos }, color: f.color, alive: f.alive }));
  }

  /** 0 right at a ping → 1 just before the next one. */
  get age(): number {
    return Math.min(1, (this.tick - this.lastPing) / this.interval);
  }

  /** Contact opacity: bright at the ping, fading as the data goes stale. */
  get fade(): number {
    return 1 - 0.7 * this.age;
  }
}
