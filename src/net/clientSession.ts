import type { KeyboardController } from "../client/keyboardController";
import { LockOn } from "../client/lockOn";
import { Spectator } from "../client/spectator";
import { updateLockOn, type Game } from "../modes/game";
import { spawnLineup } from "../presets/lineup";
import { findPreset, type MechPreset } from "../presets/presets";
import type { Camera } from "../render/camera";
import type { WorldEvent } from "../sim/events";
import type { Fighter } from "../sim/fighter";
import { Scoreboard } from "../sim/scoreboard";
import { World } from "../sim/world";
import type { Link } from "./link";
import { SNAPSHOT_EVERY, type HostMessage, type PlayerMessage, type Snapshot } from "./protocol";
import { applySnapshot, MatchMirror } from "./snapshot";

/**
 * A joined player's side of an online match. The host runs the real match;
 * this keeps a copy of the world that follows the host's snapshots, sends
 * your input every tick, and runs the parts that are yours alone (camera,
 * lock-on, kill cam, scoreboard).
 */
export class ClientSession implements Game {
  readonly world = new World(0);
  readonly match = new MatchMirror();
  readonly you: Fighter;
  readonly spectator: Spectator;
  readonly scoreboard: Scoreboard;
  readonly lockOn = new LockOn();
  readonly banner = "Online match";
  private readonly inbox: Snapshot[] = [];
  private ticksSinceSnapshot = 0;
  private closed = false;
  /** Set when the host goes away. */
  hostLeft = false;

  constructor(
    private readonly link: Link,
    lineup: string[],
    youId: number,
  ) {
    spawnLineup(this.world, lineup.map((id) => findPreset(id)).filter((p): p is MechPreset => !!p));
    this.you = this.world.getFighter(youId)!;
    this.spectator = new Spectator(youId);
    this.scoreboard = new Scoreboard(this.world);
    link.onMessage((m) => (m as HostMessage).t === "snap" && this.inbox.push(m as Snapshot));
    link.onClose(() => (this.hostLeft = true));
  }

  get possessed(): Fighter {
    return this.you;
  }

  /** Online you always drive your own mech. */
  togglePossess(): void {}

  tick(keyboard: KeyboardController, camera: Camera): void {
    const input = this.lockOn.aim(this.world, this.you, keyboard.readInput(this.you));
    const message: PlayerMessage = { t: "in", input };
    if (!this.closed) this.link.send(message);

    // Apply every snapshot that arrived (in order), keeping all their events.
    const events: WorldEvent[] = [];
    this.ticksSinceSnapshot++;
    for (const snap of this.inbox.splice(0)) {
      applySnapshot(this.world, this.match, snap);
      events.push(...snap.events);
      this.ticksSinceSnapshot = 0;
    }
    this.world.events = events;
    this.spectator.ingest(events, this.world);
    this.scoreboard.ingest(events);
    updateLockOn(this, keyboard, camera);
  }

  /** Snapshots come every SNAPSHOT_EVERY ticks; interpolate across that whole gap. */
  renderAlpha(loopAlpha: number): number {
    return Math.min(1, (this.ticksSinceSnapshot + loopAlpha) / SNAPSHOT_EVERY);
  }

  close(): void {
    this.closed = true;
    this.link.close();
  }
}
