import type { WorldEvent } from "./projectile";
import type { World } from "./world";

export interface FighterRecord {
  kills: number;
  deaths: number;
  damageDealt: number;
  damageTaken: number;
  /** Projectiles fired (each shotgun pellet counts). */
  shotsFired: number;
  /** Projectiles that damaged at least one enemy. */
  shotsHit: number;
}

/** Hit ratio in [0, 1], or null before the first shot. */
export function accuracy(r: FighterRecord): number | null {
  return r.shotsFired > 0 ? r.shotsHit / r.shotsFired : null;
}

/**
 * Per-fighter stats for the whole match, built purely from world events so
 * it can run anywhere the sim runs (client now, server later).
 */
export class Scoreboard {
  private readonly records = new Map<number, FighterRecord>();

  constructor(world: World) {
    for (const f of world.fighters) this.records.set(f.id, emptyRecord());
  }

  get(fighterId: number): FighterRecord {
    let r = this.records.get(fighterId);
    if (!r) this.records.set(fighterId, (r = emptyRecord()));
    return r;
  }

  /** Call with each tick's events. */
  ingest(events: WorldEvent[]): void {
    for (const e of events) {
      switch (e.kind) {
        case "shot":
          this.get(e.ownerId).shotsFired += e.count;
          break;
        case "projectileHit":
          this.get(e.ownerId).shotsHit++;
          break;
        case "damage":
          this.get(e.sourceId).damageDealt += e.amount;
          this.get(e.targetId).damageTaken += e.amount;
          break;
        case "kill":
          this.get(e.killerId).kills++;
          this.get(e.victimId).deaths++;
          break;
      }
    }
  }
}

function emptyRecord(): FighterRecord {
  return { kills: 0, deaths: 0, damageDealt: 0, damageTaken: 0, shotsFired: 0, shotsHit: 0 };
}
