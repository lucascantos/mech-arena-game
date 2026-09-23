import { DuelBot } from "./ai/duelBot";
import { KeyboardController } from "./client/keyboardController";
import { startGameLoop } from "./client/gameLoop";
import { buildFighter } from "./presets/buildFighter";
import { findPreset, PRESETS } from "./presets/presets";
import { Renderer } from "./render/renderer";
import type { Controller } from "./sim/controller";
import type { Input } from "./sim/input";
import { Match } from "./sim/match";
import { World } from "./sim/world";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const world = new World(1337);

// Pick the matchup in the URL: ?red=brawler&blue=artillery (ids in presets.ts).
const params = new URLSearchParams(location.search);
const redPreset = findPreset(params.get("red")) ?? PRESETS[0];
const bluePreset = findPreset(params.get("blue")) ?? PRESETS[1];

const red = world.addFighter(
  buildFighter(redPreset, { id: 1, team: 1, color: "#e5534b", pos: { x: 300, y: 400 } }),
);
const blue = world.addFighter(
  buildFighter(bluePreset, { id: 2, team: 2, color: "#4c8ed9", pos: { x: 900, y: 400 } }),
);

const match = new Match(world);
const bots = new Map<number, Controller>([
  [red.id, new DuelBot(redPreset.personality, 1)],
  [blue.id, new DuelBot(bluePreset.personality, 2)],
]);
const keyboard = new KeyboardController(canvas, renderer.camera);

/** Fighter the human is currently driving (Tab toggles), or null to spectate. */
let possessedId: number | null = null;
window.addEventListener("keydown", (e) => {
  if (e.code !== "Tab") return;
  e.preventDefault();
  keyboard.clearQueued();
  possessedId = possessedId === null ? red.id : null;
});

startGameLoop(
  () => {
    const inputs = new Map<number, Input>();
    for (const f of world.fighters) {
      const controller = f.id === possessedId ? keyboard : bots.get(f.id);
      if (controller) inputs.set(f.id, controller.readInput(f, world));
    }
    world.step(inputs);
    match.update();
    renderer.effects.ingest(world.events);
  },
  (alpha, fps) => {
    const possessed = possessedId === null ? null : (world.getFighter(possessedId) ?? null);
    renderer.render(world, match, alpha, { possessed, fps });
  },
);
