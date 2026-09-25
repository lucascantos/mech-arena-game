import { secondsToTicks } from "../../constants";
import type { Input } from "../../input";
import type { World } from "../../world";
import { normalize, scale, vec, type Vec2 } from "../../vec";
import { Defense } from "../defense";

export interface DodgeConfig {
  /** Dash speed in units per second. */
  speed: number;
  /** Dash length in seconds. */
  duration: number;
  /** Invulnerable window in seconds, starting when the dash starts. */
  iFrames: number;
}

export const DEFAULT_DODGE: DodgeConfig = {
  speed: 900,
  duration: 0.18,
  iFrames: 0.15,
};

/**
 * Quick dash in the movement direction (or the aim direction when standing
 * still). Briefly invulnerable. Costs energy (more for heavier builds)
 * instead of having a cooldown, so you can chain dashes while energy lasts.
 */
export class Dodge extends Defense {
  readonly name = "Dodge";
  private dir: Vec2 = vec();
  private readonly iFrameTicks: number;

  constructor(private readonly config: DodgeConfig = DEFAULT_DODGE) {
    super({
      activeTicks: secondsToTicks(config.duration),
      cooldownTicks: 0,
    });
    this.iFrameTicks = secondsToTicks(config.iFrames);
  }

  protected canActivate(_input: Input, _world: World): boolean {
    return this.owner.energy.canAfford(this.owner.stats.dashCost);
  }

  protected onActivate(input: Input): void {
    this.owner.energy.spend(this.owner.stats.dashCost);
    const move = normalize(vec(input.moveX, input.moveY));
    this.dir = move.x !== 0 || move.y !== 0 ? move : this.owner.facing;
  }

  protected onActiveTick(): void {
    this.owner.vel = scale(this.dir, this.config.speed * this.owner.stats.dashSpeedMultiplier);
  }

  controlsMovement(): boolean {
    return this.isActive;
  }

  blocksActions(): boolean {
    return this.isActive;
  }

  grantsInvulnerability(): boolean {
    return this.isActive && this.elapsed < this.iFrameTicks;
  }
}
