import { secondsToTicks } from "../../constants";
import type { Input } from "../../input";
import { normalize, scale, vec, type Vec2 } from "../../vec";
import { Defense } from "../defense";

export interface DodgeConfig {
  /** Dash speed in units per second. */
  speed: number;
  /** Dash length in seconds. */
  duration: number;
  /** Invulnerable window in seconds, starting when the dash starts. */
  iFrames: number;
  /** Cooldown after the dash ends, in seconds. */
  cooldown: number;
}

export const DEFAULT_DODGE: DodgeConfig = {
  speed: 900,
  duration: 0.18,
  iFrames: 0.15,
  cooldown: 0.8,
};

/**
 * Quick dash in the movement direction (or the aim direction when standing
 * still). Briefly invulnerable, then goes on cooldown.
 */
export class Dodge extends Defense {
  readonly name = "Dodge";
  private dir: Vec2 = vec();
  private readonly iFrameTicks: number;

  constructor(private readonly config: DodgeConfig = DEFAULT_DODGE) {
    super({
      activeTicks: secondsToTicks(config.duration),
      cooldownTicks: secondsToTicks(config.cooldown),
    });
    this.iFrameTicks = secondsToTicks(config.iFrames);
  }

  protected onActivate(input: Input): void {
    const move = normalize(vec(input.moveX, input.moveY));
    this.dir = move.x !== 0 || move.y !== 0 ? move : this.owner.facing;
  }

  protected onActiveTick(): void {
    this.owner.vel = scale(this.dir, this.config.speed);
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
