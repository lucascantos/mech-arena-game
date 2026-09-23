import type { Fighter } from "./fighter";
import type { Input } from "./input";
import type { World } from "./world";

/**
 * Something that decides a fighter's input each tick: a bot, the local
 * keyboard/mouse, or (later) a remote player's input stream.
 */
export interface Controller {
  readInput(self: Fighter, world: World): Input;
}
