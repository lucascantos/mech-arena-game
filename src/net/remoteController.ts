import type { Controller } from "../sim/controller";
import type { Fighter } from "../sim/fighter";
import { emptyInput, type Input } from "../sim/input";
import type { World } from "../sim/world";

/**
 * Drives a mech from inputs a joined player sends over the network. Taps
 * (dodge, reload, weapon switch) are kept until the next tick reads them, even
 * if several messages arrive between ticks. If the player disconnects, a bot
 * takes over their mech so the match can go on.
 */
export class RemoteController implements Controller {
  private latest: Input = emptyInput();
  private connected = true;

  constructor(private readonly fallback: Controller) {}

  push(input: Input): void {
    this.latest = {
      ...input,
      defend: this.latest.defend || input.defend,
      reload: this.latest.reload || input.reload,
      selectSlot: input.selectSlot >= 0 ? input.selectSlot : this.latest.selectSlot,
    };
  }

  disconnect(): void {
    this.connected = false;
  }

  readInput(self: Fighter, world: World): Input {
    if (!this.connected) return this.fallback.readInput(self, world);
    const input = this.latest;
    this.latest = { ...input, defend: false, reload: false, selectSlot: -1 }; // taps count once
    return input;
  }
}
