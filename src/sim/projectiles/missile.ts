import type { Guidance } from "../weapons/guidance";
import type { World } from "../world";
import type { ProjectileSpec } from "./projectile";
import { Rocket } from "./rocket";

/**
 * A guided rocket. Carries its own target (locked by the launcher at launch)
 * and asks its guidance how to turn each tick. If the target dies it keeps
 * flying straight until it hits something or the fuse runs out.
 */
export class Missile extends Rocket {
  constructor(
    world: World,
    spec: ProjectileSpec,
    blastRadius: number,
    fuseTicks: number,
    private readonly guidance: Guidance,
    readonly targetId: number | undefined,
  ) {
    super(world, spec, blastRadius, fuseTicks);
  }

  protected steer(world: World): void {
    if (this.targetId === undefined) return;
    const target = world.getFighter(this.targetId);
    if (target?.alive) this.vel = this.guidance.steer(this.vel, this.pos, target);
  }
}
