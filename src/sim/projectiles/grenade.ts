import { Rocket } from "./rocket";

/**
 * A lobbed grenade: arcs over everyone and only explodes where it lands (at
 * the end of its range, which the launcher sets to the aimed distance).
 */
export class Grenade extends Rocket {
  protected get hitsFighters(): boolean {
    return false;
  }

  /** 0 at launch, 1 on landing: how far along its arc it is (for drawing the height). */
  get flight(): number {
    return 1 - this.rangeLeft / this.range;
  }
}
