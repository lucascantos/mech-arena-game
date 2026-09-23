import { DuelBot } from "./ai/duelBot";
import { AGGRESSIVE, CAUTIOUS } from "./ai/personality";
import { KeyboardController } from "./client/keyboardController";
import { startGameLoop } from "./client/gameLoop";
import { Renderer } from "./render/renderer";
import { Dodge } from "./sim/abilities/defenses/dodge";
import type { Controller } from "./sim/controller";
import { Fighter } from "./sim/fighter";
import type { Input } from "./sim/input";
import { Match } from "./sim/match";
import { ENERGY_RIFLE, MACHINE_GUN, ROCKET_LAUNCHER, SHOTGUN } from "./sim/weapons/catalog";
import { Weapon } from "./sim/weapons/weapon";
import { World } from "./sim/world";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const world = new World(1337);

// Loadouts: any fighter can carry any weapon.
const red = world.addFighter(
  new Fighter({ id: 1, name: "Red", team: 1, color: "#e5534b", pos: { x: 300, y: 400 } }),
)
  .equipWeapon(new Weapon(SHOTGUN))
  .equipWeapon(new Weapon(MACHINE_GUN))
  .setDefense(new Dodge());
const blue = world.addFighter(
  new Fighter({ id: 2, name: "Blue", team: 2, color: "#4c8ed9", pos: { x: 900, y: 400 } }),
)
  .equipWeapon(new Weapon(ENERGY_RIFLE))
  .equipWeapon(new Weapon(ROCKET_LAUNCHER))
  .setDefense(new Dodge());

const match = new Match(world);
const bots = new Map<number, Controller>([
  [red.id, new DuelBot(AGGRESSIVE, 1)],
  [blue.id, new DuelBot(CAUTIOUS, 2)],
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
