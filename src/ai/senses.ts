import { secondsToTicks } from "../sim/constants";
import type { Fighter } from "../sim/fighter";
import type { Projectile } from "../sim/projectiles/projectile";
import { dist, type Vec2 } from "../sim/vec";
import { canSee } from "../sim/vision";
import type { World } from "../sim/world";

/** A radar blip: where an enemy was at the last ping. */
export interface Contact {
  id: number;
  pos: Vec2;
}

/**
 * What a bot is allowed to know: the same things a human sees. Enemies and
 * shots inside its view (sized by its head) are seen exactly; everyone else
 * only shows up as radar contacts, refreshed at the head's radar interval, so
 * off-screen positions are stale just like on a human's minimap.
 */
export class Senses {
  /** Living enemies inside the view this tick. */
  visibleEnemies: Fighter[] = [];
  /** Last radar ping: living enemies and where they were. */
  contacts: Contact[] = [];
  private lastPing = -Infinity;

  /** Call once per tick before deciding anything. */
  update(self: Fighter, world: World): void {
    this.visibleEnemies = world.fighters.filter(
      (f) => f !== self && f.alive && f.team !== self.team && canSee(self, world, f.pos),
    );
    const interval = Math.max(1, secondsToTicks(self.stats.radarInterval));
    if (world.tick - this.lastPing >= interval || world.tick < this.lastPing) {
      this.lastPing = world.tick;
      this.contacts = world.fighters
        .filter((f) => f !== self && f.alive && f.team !== self.team)
        .map((f) => ({ id: f.id, pos: { ...f.pos } }));
    }
  }

  /** Nearest enemy the bot can actually see. */
  nearestVisible(self: Fighter): Fighter | undefined {
    return nearest(self.pos, this.visibleEnemies, (f) => f.pos);
  }

  /** Nearest last-known enemy position from the radar (enemies seen dying since are dropped). */
  nearestContact(self: Fighter, world: World): Contact | undefined {
    const alive = this.contacts.filter((c) => world.getFighter(c.id)?.alive);
    return nearest(self.pos, alive, (c) => c.pos);
  }

  /** Enemy shots inside the view. */
  visibleProjectiles(self: Fighter, world: World): Projectile[] {
    return world.projectiles.filter((p) => p.team !== self.team && canSee(self, world, p.pos));
  }
}

function nearest<T>(from: Vec2, items: T[], pos: (t: T) => Vec2): T | undefined {
  let best: T | undefined;
  let bestD = Infinity;
  for (const item of items) {
    const d = dist(from, pos(item));
    if (d < bestD) [best, bestD] = [item, d];
  }
  return best;
}
