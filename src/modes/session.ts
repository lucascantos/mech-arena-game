import { DuelBot } from "../ai/duelBot";
import type { KeyboardController } from "../client/keyboardController";
import { LockOn } from "../client/lockOn";
import { Spectator } from "../client/spectator";
import { spawnLineup } from "../presets/lineup";
import { PRESETS, type MechPreset } from "../presets/presets";
import type { Camera } from "../render/camera";
import type { Controller } from "../sim/controller";
import type { Fighter } from "../sim/fighter";
import type { Input } from "../sim/input";
import { Match } from "../sim/match";
import { Scoreboard } from "../sim/scoreboard";
import { World } from "../sim/world";
import { Respawner, setupTraining } from "./training";

export type ModeId = "ffa" | "duel" | "training";

const randomPreset = (): MechPreset => PRESETS[Math.floor(Math.random() * PRESETS.length)];
const randomSeed = (): number => Math.floor(Math.random() * 2 ** 31);

/**
 * One running game: the world, its round rules (a Match, or respawns on the
 * training ground), who controls which mech, and the per-player client state
 * (kill cam, lock-on, scoreboard). "You" are always the first fighter.
 */
export class Session {
  readonly scoreboard: Scoreboard;
  readonly spectator: Spectator;
  readonly lockOn = new LockOn();
  /** Fighter you are driving (P toggles), or null while spectating. */
  possessedId: number | null;

  private constructor(
    readonly world: World,
    readonly match: Match | null,
    readonly you: Fighter,
    private readonly controllers: Map<number, Controller>,
    private readonly respawner: Respawner | null,
    spectate: boolean,
  ) {
    this.scoreboard = new Scoreboard(world);
    this.spectator = new Spectator(you.id);
    this.possessedId = spectate ? null : you.id;
  }

  /** 8P FFA: 8 random mechs. Duel: 2. Training: you and the dummies. */
  static start(mode: ModeId): Session {
    if (mode === "training") {
      const world = new World(randomSeed());
      const { you, controllers } = setupTraining(world, randomPreset());
      return new Session(world, null, you, controllers, new Respawner(you.id), false);
    }
    const count = mode === "ffa" ? 8 : 2;
    return Session.lineup(Array.from({ length: count }, randomPreset), false);
  }

  /** A match with these presets, all bots except you (unless spectating). */
  static lineup(presets: MechPreset[], spectate: boolean): Session {
    const world = new World(randomSeed());
    const fighters = spawnLineup(world, presets);
    const bots = new Map<number, Controller>(fighters.map((f, i) => [f.id, new DuelBot(presets[i].personality, i + 1)]));
    return new Session(world, new Match(world), fighters[0], bots, null, spectate);
  }

  get possessed(): Fighter | null {
    return this.possessedId === null ? null : (this.world.getFighter(this.possessedId) ?? null);
  }

  togglePossess(): void {
    this.possessedId = this.possessedId === null ? this.you.id : null;
  }

  /** One sim tick: inputs (you or bots), step, round rules, stats, kill cam, lock-on. */
  tick(keyboard: KeyboardController, camera: Camera): void {
    const { world } = this;
    const inputs = new Map<number, Input>();
    for (const f of world.fighters) {
      if (f.id === this.possessedId) inputs.set(f.id, this.lockOn.aim(world, f, keyboard.readInput(f)));
      else {
        const bot = this.controllers.get(f.id);
        if (bot) inputs.set(f.id, bot.readInput(f, world));
      }
    }
    world.step(inputs);
    this.match?.update();
    this.respawner?.update(world);
    this.spectator.ingest(world.events, world);
    this.scoreboard.ingest(world.events);

    // Lock-on: charge, switch or drop based on what's under your cursor.
    if (keyboard.takeRightClick() || this.match?.roundOver) this.lockOn.clear();
    const cursor = keyboard.cursor;
    const [a, b] = camera.visibleWorld();
    const visible = (p: { x: number; y: number }) => p.x >= a.x && p.x <= b.x && p.y >= a.y && p.y <= b.y;
    // No locking during the pre-round countdown (no self = nothing charges, any lock drops).
    const self = this.match?.inCountdown ? null : this.possessed;
    this.lockOn.update(world, self, cursor ? camera.screenToWorld(cursor) : null, visible);
  }
}
