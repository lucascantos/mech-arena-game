import type { KeyboardController } from "../client/keyboardController";
import type { LockOn } from "../client/lockOn";
import type { Spectator } from "../client/spectator";
import type { Camera } from "../render/camera";
import type { Fighter } from "../sim/fighter";
import type { MatchView } from "../sim/match";
import type { Scoreboard } from "../sim/scoreboard";
import type { World } from "../sim/world";

/**
 * A running game as the main loop sees it: an offline Session, the host's
 * side of an online match, or a joined player's mirror of one.
 */
export interface Game {
  readonly world: World;
  /** Null in modes without rounds (Training Ground). */
  readonly match: MatchView | null;
  /** Your mech (the camera starts on it; the kill cam returns to it). */
  readonly you: Fighter;
  readonly spectator: Spectator;
  readonly scoreboard: Scoreboard;
  readonly lockOn: LockOn;
  /** The mech you're driving, or null while spectating. */
  readonly possessed: Fighter | null;
  togglePossess(): void;
  /** One fixed tick. After it, `world.events` holds this tick's events. */
  tick(keyboard: KeyboardController, camera: Camera): void;
  /** Interpolation factor for rendering, from the loop's factor. */
  renderAlpha(loopAlpha: number): number;
  /** Stops the game (and any connections). */
  close(): void;
  /** Extra line for the HUD (e.g. an online room code), if any. */
  readonly banner: string | null;
}

/** Once per tick: charge, switch or drop the lock-on from what's under your cursor. */
export function updateLockOn(game: Game, keyboard: KeyboardController, camera: Camera): void {
  const { lockOn, match, world } = game;
  if (match?.roundOver) lockOn.clear();
  const cursor = keyboard.cursor;
  const [a, b] = camera.visibleWorld();
  const visible = (p: { x: number; y: number }) => p.x >= a.x && p.x <= b.x && p.y >= a.y && p.y <= b.y;
  // No locking during the pre-round countdown (no self = nothing charges, any lock drops).
  const self = match?.inCountdown ? null : game.possessed;
  lockOn.update(world, self, cursor ? camera.screenToWorld(cursor) : null, visible);
  // Rotating view: while a lock steers the aim, the view turns with it and the mouse does nothing.
  keyboard.lockedOn = !!self && lockOn.targetId !== null;
  if (keyboard.rotating && keyboard.lockedOn) keyboard.turn.sync(self!.facing);
}
