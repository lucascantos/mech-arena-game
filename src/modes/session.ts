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
import { updateLockOn, type Game } from "./game";
import { Respawner, setupTraining } from "./training";

export type ModeId = "ffa" | "duel" | "training";

const randomPreset = (): MechPreset => PRESETS[Math.floor(Math.random() * PRESETS.length)];
const randomSeed = (): number => Math.floor(Math.random() * 2 ** 31);

/**
 * One running game: the world, its round rules (a Match, or respawns on the
 * training ground), who controls which mech, and the per-player client state
 * (kill cam, lock-on, scoreboard). "You" are always the first fighter.
 */
export class Session implements Game {
  readonly scoreboard: Scoreboard;
  readonly spectator: Spectator;
  readonly lockOn = new LockOn();
  /** Fighter you are driving (P toggles), or null while spectating. */
  possessedId: number | null;
  readonly banner: string | null = null;

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

  /**
   * A match with these presets: you are the first, the rest are bots unless
   * `controllers` (by lineup index) says otherwise, e.g. online players.
   */
  static lineup(presets: MechPreset[], spectate: boolean, controllers = new Map<number, Controller>()): Session {
    const world = new World(randomSeed());
    const fighters = spawnLineup(world, presets);
    const bots = new Map<number, Controller>(
      fighters.map((f, i) => [f.id, controllers.get(i) ?? new DuelBot(presets[i].personality, i + 1)]),
    );
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
    updateLockOn(this, keyboard, camera);
  }

  renderAlpha(loopAlpha: number): number {
    return loopAlpha;
  }

  close(): void {}
}
