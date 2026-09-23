import type { Fighter } from "../fighter";
import type { Input } from "../input";
import type { World } from "../world";

export interface AbilityTiming {
  /** How long the ability stays active once triggered. */
  activeTicks: number;
  /** Wait after the active phase ends before it can be used again. */
  cooldownTicks: number;
}

/**
 * Shared lifecycle for timed abilities (Defense builds on it; weapons have their
 * own ammo/reload model). Flow: ready -> active (activeTicks) -> cooldown -> ready.
 *
 * Subclasses override the `on*` hooks and, when needed, the query methods that
 * the fighter checks every tick (movement control, invulnerability, ...).
 */
export abstract class Ability {
  abstract readonly name: string;

  protected owner!: Fighter;
  private activeLeft = 0;
  private cooldownLeft = 0;
  /** Length of the cooldown currently running (for readiness). */
  private cooldownTotal = 0;
  /** Ticks since the current activation started. */
  protected elapsed = 0;

  constructor(protected readonly timing: AbilityTiming) {}

  /** Called by the fighter when the ability is equipped. */
  attach(owner: Fighter): void {
    this.owner = owner;
  }

  get isActive(): boolean {
    return this.activeLeft > 0;
  }

  get isReady(): boolean {
    return !this.isActive && this.cooldownLeft === 0;
  }

  /** 1 when ready, 0 right after the active phase ends. Useful for UI. */
  get readiness(): number {
    if (this.isActive) return 0;
    if (this.cooldownTotal === 0) return 1;
    return 1 - this.cooldownLeft / this.cooldownTotal;
  }

  /** Starts the ability if it's ready and the owner is free to act. */
  tryActivate(input: Input, world: World): boolean {
    if (!this.isReady || !this.owner.canAct()) return false;
    if (!this.canActivate(input, world)) return false;
    this.activeLeft = this.timing.activeTicks;
    this.elapsed = 0;
    this.onActivate(input, world);
    return true;
  }

  /** Back to ready, e.g. on respawn. */
  reset(): void {
    this.activeLeft = 0;
    this.cooldownLeft = 0;
    this.elapsed = 0;
  }

  /** Advances timers by one tick. Called once per sim tick by the owner. */
  update(world: World): void {
    if (this.activeLeft > 0) {
      this.onActiveTick(world);
      this.elapsed++;
      this.activeLeft--;
      if (this.activeLeft === 0) {
        this.onEnd(world);
        this.cooldownTotal = this.cooldownLeft = this.cooldownTicks();
      }
    } else if (this.cooldownLeft > 0) {
      this.cooldownLeft--;
    }
  }

  /** Cooldown to apply when the active phase ends. Override to scale by owner stats. */
  protected cooldownTicks(): number {
    return this.timing.cooldownTicks;
  }

  /** Extra conditions for activation (e.g. needs a target). Default: always. */
  protected canActivate(_input: Input, _world: World): boolean {
    return true;
  }

  protected abstract onActivate(input: Input, world: World): void;
  protected onActiveTick(_world: World): void {}
  protected onEnd(_world: World): void {}

  /** True while this ability drives the owner's velocity instead of player movement. */
  controlsMovement(): boolean {
    return false;
  }

  /** True while this ability blocks the owner from starting other abilities. */
  blocksActions(): boolean {
    return false;
  }

  /** True while the owner should ignore incoming damage. */
  grantsInvulnerability(): boolean {
    return false;
  }
}
