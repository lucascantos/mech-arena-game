import { DuelBot } from "../ai/duelBot";
import type { KeyboardController } from "../client/keyboardController";
import type { Game } from "../modes/game";
import { randomBattleMap } from "../maps/gameMap";
import { Session } from "../modes/session";
import { PRESETS, type MechPreset } from "../presets/presets";
import type { Camera } from "../render/camera";
import type { Controller } from "../sim/controller";
import type { WorldEvent } from "../sim/events";
import type { Link, Room } from "./link";
import { SNAPSHOT_EVERY, type HostMessage, type PlayerMessage } from "./protocol";
import { RemoteController } from "./remoteController";
import { takeSnapshot } from "./snapshot";

const MATCH_SIZE = 8;
const randomPreset = (): MechPreset => PRESETS[Math.floor(Math.random() * PRESETS.length)];

/** The host's room before the match: who has joined. */
export class HostLobby {
  private readonly players: Link[] = [];
  private started = false;
  onChange: (players: number) => void = () => {};

  constructor(readonly room: Room) {
    room.onJoin((link) => {
      if (this.started || this.players.length >= MATCH_SIZE - 1) return link.close();
      this.players.push(link);
      link.onClose(() => this.drop(link));
      this.announce();
    });
  }

  /** Players in the room, counting the host. */
  get count(): number {
    return this.players.length + 1;
  }

  /** 8P FFA: host, everyone who joined, bots for the rest. Random mechs for all. */
  start(): HostSession {
    this.started = true;
    const presets = Array.from({ length: MATCH_SIZE }, randomPreset);
    const remotes = this.players.map((_, i) => new RemoteController(new DuelBot(presets[i + 1].personality, i + 2)));
    const controllers = new Map<number, Controller>(remotes.map((r, i) => [i + 1, r]));
    const map = randomBattleMap();
    const session = Session.lineup(presets, false, controllers, map);
    const lineup = presets.map((p) => p.id);
    this.players.forEach((link, i) => {
      link.onMessage((m) => (m as PlayerMessage).t === "in" && remotes[i].push((m as PlayerMessage).input));
      link.onClose(() => remotes[i].disconnect());
      send(link, { t: "start", lineup, you: i + 2, map }); // fighter ids are lineup index + 1
    });
    return new HostSession(session, this.room, this.players);
  }

  close(): void {
    this.players.forEach((l) => l.close());
    this.room.close();
  }

  private drop(link: Link): void {
    if (this.started) return; // mid-match, a bot takes over their mech instead
    const i = this.players.indexOf(link);
    if (i >= 0) this.players.splice(i, 1);
    this.announce();
  }

  private announce(): void {
    this.players.forEach((l) => send(l, { t: "lobby", players: this.count }));
    this.onChange(this.count);
  }
}

/** The host's side of an online match: an ordinary Session that also streams snapshots. */
export class HostSession implements Game {
  private pending: WorldEvent[] = [];

  constructor(
    private readonly session: Session,
    private readonly room: Room,
    private readonly links: Link[],
  ) {}

  get world() { return this.session.world; }
  get match() { return this.session.match; }
  get you() { return this.session.you; }
  get spectator() { return this.session.spectator; }
  get scoreboard() { return this.session.scoreboard; }
  get lockOn() { return this.session.lockOn; }
  get possessed() { return this.session.possessed; }
  get banner(): string { return `Hosting room ${this.room.code}`; }

  togglePossess(): void {
    this.session.togglePossess();
  }

  tick(keyboard: KeyboardController, camera: Camera): void {
    this.session.tick(keyboard, camera);
    this.pending.push(...this.world.events);
    if (this.world.tick % SNAPSHOT_EVERY !== 0) return;
    const snap = takeSnapshot(this.world, this.session.match, this.pending);
    this.pending = [];
    this.links.forEach((l) => send(l, snap));
  }

  renderAlpha(loopAlpha: number): number {
    return loopAlpha;
  }

  close(): void {
    this.links.forEach((l) => l.close());
    this.room.close();
  }
}

function send(link: Link, message: HostMessage): void {
  link.send(message);
}
