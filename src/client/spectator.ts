import type { Fighter } from "../sim/fighter";
import type { WorldEvent } from "../sim/events";
import { dist } from "../sim/vec";
import type { World } from "../sim/world";

/**
 * Decides who the camera follows. Starts on "you"; when the followed fighter
 * is killed, switches to its killer (a kill cam that chains from killer to
 * killer). Each new round it returns to you.
 */
export class Spectator {
  private followId: number;
  /** Who killed whom this round, to skip past killers that are already dead. */
  private readonly killedBy = new Map<number, number>();
  /** Who killed the player this round, for the HUD. */
  killerOfHome: Fighter | null = null;

  constructor(private readonly homeId: number) {
    this.followId = homeId;
  }

  /** Call with each tick's events. */
  ingest(events: WorldEvent[], world: World): void {
    for (const e of events) {
      if (e.kind === "roundStart") {
        this.followId = this.homeId;
        this.killedBy.clear();
        this.killerOfHome = null;
      } else if (e.kind === "kill") {
        this.killedBy.set(e.victimId, e.killerId);
        if (e.victimId === this.homeId) this.killerOfHome = world.getFighter(e.killerId) ?? null;
        if (e.victimId === this.followId) this.followId = this.nextToFollow(e.victimId, world);
      }
    }
  }

  following(world: World): Fighter | undefined {
    return world.getFighter(this.followId);
  }

  /**
   * The victim's killer. If the killer is already dead too (e.g. its last shot
   * landed after it died), follow the chain of killers; if that runs out, pick
   * the living fighter closest to where the victim fell.
   */
  private nextToFollow(victimId: number, world: World): number {
    const seen = new Set<number>([victimId]);
    let id = this.killedBy.get(victimId);
    while (id !== undefined && !seen.has(id)) {
      if (world.getFighter(id)?.alive) return id;
      seen.add(id);
      id = this.killedBy.get(id);
    }
    const victim = world.getFighter(victimId);
    let best: Fighter | undefined;
    for (const f of world.fighters) {
      if (!f.alive || !victim) continue;
      if (!best || dist(f.pos, victim.pos) < dist(best.pos, victim.pos)) best = f;
    }
    return best?.id ?? victimId;
  }
}
