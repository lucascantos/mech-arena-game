import { DT } from "../constants";
import type { Fighter } from "../fighter";
import { dist, dot, length, normalize, rotateToward, scale, sub, type Vec2 } from "../vec";
import type { World } from "../world";

const DEG = Math.PI / 180;

/**
 * How a homing weapon picks a target and how its missiles turn toward it.
 * `acquire` runs once at launch; `steer` runs on the missile every tick.
 *
 * This version turns at a constant rate. Other feels (a turn rate that ramps
 * up after launch, a lazy curve, leading the target) are subclasses that
 * override `steer`.
 */
export class Guidance {
  /**
   * @param turnRate max turn in degrees per second. With the missile's speed
   *   this sets how sharp it can curve: turn radius = speed / turnRate (radians).
   * @param lockCone full width in degrees, centered on the shooter's aim,
   *   inside which a target can be locked at launch.
   */
  constructor(
    readonly turnRate: number,
    readonly lockCone: number,
  ) {}

  /**
   * The living enemy closest to the shooter's aim direction, within the cone
   * and `maxRange`; undefined when nobody is in the cone (it then flies straight).
   */
  acquire(owner: Fighter, world: World, maxRange: number): number | undefined {
    const minCos = Math.cos((this.lockCone / 2) * DEG);
    let best: Fighter | undefined;
    let bestCos = -Infinity;
    for (const f of world.fighters) {
      if (!f.alive || f.team === owner.team) continue;
      if (dist(owner.pos, f.pos) > maxRange) continue;
      const cos = dot(owner.facing, normalize(sub(f.pos, owner.pos)));
      if (cos >= minCos && cos > bestCos) [best, bestCos] = [f, cos];
    }
    return best?.id;
  }

  /** New velocity for a missile at `pos` chasing `target`: same speed, turned by at most one tick of turn rate. */
  steer(vel: Vec2, pos: Vec2, target: Fighter): Vec2 {
    const dir = rotateToward(normalize(vel), normalize(sub(target.pos, pos)), this.turnRate * DEG * DT);
    return scale(dir, length(vel));
  }
}
