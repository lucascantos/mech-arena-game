import { DuelBot } from "./ai/duelBot";
import { KeyboardController } from "./client/keyboardController";
import { LockOn } from "./client/lockOn";
import { startGameLoop } from "./client/gameLoop";
import { Spectator } from "./client/spectator";
import { spawnLineup } from "./presets/lineup";
import { findPreset, type MechPreset } from "./presets/presets";
import { Renderer } from "./render/renderer";
import type { Controller } from "./sim/controller";
import type { Input } from "./sim/input";
import { Match } from "./sim/match";
import { Scoreboard } from "./sim/scoreboard";
import { World } from "./sim/world";

const DEFAULT_LINEUP = ["brawler", "artillery", "juggernaut", "skirmisher"];

const canvas = document.getElementById("game") as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const world = new World(1337);

// Pick the lineup in the URL: ?bots=brawler,artillery,juggernaut,skirmisher (ids in presets.ts).
// Two ids make a duel; more make a free-for-all.
const ids = new URLSearchParams(location.search).get("bots")?.split(",") ?? DEFAULT_LINEUP;
const presets = ids.map((id) => findPreset(id.trim())).filter((p): p is MechPreset => !!p);
const lineup = presets.length >= 2 ? presets : DEFAULT_LINEUP.map((id) => findPreset(id)!);

const fighters = spawnLineup(world, lineup);
const match = new Match(world);
const scoreboard = new Scoreboard(world);
const bots = new Map<number, Controller>(
  fighters.map((f, i) => [f.id, new DuelBot(lineup[i].personality, i + 1)]),
);
const keyboard = new KeyboardController(canvas, renderer.camera);
/** "You" are the first fighter: P takes it over, and the camera starts on it. */
const spectator = new Spectator(fighters[0].id);
const lockOn = new LockOn();

/** Fighter the human is currently driving (P toggles), or null to spectate. */
let possessedId: number | null = null;
let showScoreboard = false;
window.addEventListener("keyup", (e) => {
  if (e.code === "Tab") showScoreboard = false;
});
window.addEventListener("blur", () => (showScoreboard = false));
window.addEventListener("keydown", (e) => {
  // Hold Tab for the scoreboard (and keep the browser from moving focus).
  if (e.code === "Tab") {
    e.preventDefault();
    showScoreboard = true;
    return;
  }
  if (e.code === "KeyV" && !e.repeat) {
    renderer.camera.mode = renderer.camera.mode === "follow" ? "overview" : "follow";
    return;
  }
  if (e.code !== "KeyP" || e.repeat) return;
  keyboard.clearQueued();
  possessedId = possessedId === null ? fighters[0].id : null;
});

startGameLoop(
  () => {
    const inputs = new Map<number, Input>();
    for (const f of world.fighters) {
      if (f.id === possessedId) inputs.set(f.id, lockOn.aim(world, f, keyboard.readInput(f)));
      else {
        const bot = bots.get(f.id);
        if (bot) inputs.set(f.id, bot.readInput(f, world));
      }
    }
    world.step(inputs);
    match.update();
    renderer.effects.ingest(world.events);
    spectator.ingest(world.events, world);
    scoreboard.ingest(world.events);
    updateLockOn();
  },
  (alpha, fps) => {
    const possessed = possessedId === null ? null : (world.getFighter(possessedId) ?? null);
    const following = spectator.following(world) ?? fighters[0];
    const hud = { possessed, following, killer: spectator.killerOfHome, scoreboard, showScoreboard, fps };
    // Cursor lean and lock-on only while you're driving a living mech; spectating just follows.
    const driving = !!possessed?.alive && following === possessed;
    const view = { focus: following, cursor: driving ? keyboard.cursor : null, lock: driving ? lockOn : null };
    renderer.render(world, match, alpha, hud, view);
  },
);

/** Once per tick: charge, switch or drop the lock based on what's under your cursor. */
function updateLockOn(): void {
  const self = possessedId === null ? null : (world.getFighter(possessedId) ?? null);
  if (keyboard.takeRightClick() || match.roundOver) lockOn.clear();
  const cursor = keyboard.cursor;
  const cam = renderer.camera;
  const [a, b] = cam.visibleWorld();
  const visible = (p: { x: number; y: number }) => p.x >= a.x && p.x <= b.x && p.y >= a.y && p.y <= b.y;
  lockOn.update(world, self, cursor ? cam.screenToWorld(cursor) : null, visible);
}
