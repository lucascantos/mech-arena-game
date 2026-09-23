import { Dummy, type DummyBehavior } from "../ai/dummy";
import { buildFighter } from "../presets/buildFighter";
import { findPreset, type MechPreset } from "../presets/presets";
import { secondsToTicks } from "../sim/constants";
import type { Controller } from "../sim/controller";
import type { Fighter } from "../sim/fighter";
import { MachineGun } from "../sim/weapons/catalog";
import type { World } from "../sim/world";

/** Anything destroyed on the training ground comes back after this long. */
const RESPAWN_TICKS = secondsToTicks(3);
const PLAYER_POS = { x: 1200, y: 1050 };
/** Two rows of targets in front of the player (looking up): near and far. */
const ROWS = [800, 600];
const DUMMY_COLOR = "#8b949e";

/** Dummies all face down, toward the player's side. */
const DOWN = { x: 0, y: 1 };
/** A turret needs an automatic weapon so it can keep firing straight ahead. */
const TURRET: MechPreset = { ...findPreset("brawler")!, name: "Turret", weapons: [MachineGun] };
const LAYOUT: { behavior: DummyBehavior; x: number; name: string }[] = [
  { behavior: "idle", x: 950, name: "Standing" },
  { behavior: "strafe", x: 1200, name: "Strafing" },
  { behavior: "turret", x: 1450, name: "Turret" },
];

/**
 * Training Ground: you (with a random preset) against rows of dummies doing
 * very basic things. No rounds or countdown; anything destroyed, you
 * included, respawns after RESPAWN_TICKS.
 */
export function setupTraining(world: World, player: MechPreset): { you: Fighter; controllers: Map<number, Controller> } {
  const you = world.addFighter(buildFighter(player, { id: 1, team: 1, color: "#e5534b", pos: PLAYER_POS }));
  you.facing = { x: 0, y: -1 };
  const controllers = new Map<number, Controller>();
  let id = 2;
  ROWS.forEach((y, row) => {
    for (const d of LAYOUT) {
      const preset = d.behavior === "turret" ? TURRET : findPreset("brawler")!;
      const name = `${d.name} ${row === 0 ? "(near)" : "(far)"}`;
      const f = world.addFighter(buildFighter(preset, { id, team: 2, color: DUMMY_COLOR, pos: { x: d.x, y }, name }));
      f.facing = DOWN;
      controllers.set(id++, new Dummy(d.behavior, DOWN));
    }
  });
  return { you, controllers };
}

/** Brings destroyed fighters back after RESPAWN_TICKS. Call once per tick. */
export class Respawner {
  private readonly deadFor = new Map<number, number>();

  /** `youId`: when you respawn, the kill cam is sent back to you. */
  constructor(private readonly youId: number) {}

  update(world: World): void {
    for (const f of world.fighters) {
      if (f.alive) {
        this.deadFor.delete(f.id);
        continue;
      }
      const ticks = (this.deadFor.get(f.id) ?? 0) + 1;
      this.deadFor.set(f.id, ticks);
      if (ticks >= RESPAWN_TICKS) {
        f.respawn();
        if (f.id === this.youId) world.emit({ kind: "roundStart" }); // kill cam returns to you
        this.deadFor.delete(f.id);
      }
    }
  }
}
