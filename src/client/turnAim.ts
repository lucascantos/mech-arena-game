import type { Vec2 } from "../sim/vec";

/** Radians of turn per pixel of mouse movement. */
const SENSITIVITY = 0.0035;
/** Aim point distance ahead of the mech (world units): mouse up/down moves it, within these limits. */
const MIN_DISTANCE = 100;
/** Kept under half the view height, so the mech (below the centered crosshair) stays on screen. */
const MAX_DISTANCE = 320;
const DISTANCE_PER_PIXEL = 1;

/**
 * FPS-style aiming for the rotating camera: the crosshair sits in the middle
 * of the screen and the mouse turns the view (left/right) or moves the aim
 * point nearer/farther (down/up). The camera keeps the aim point centered.
 * Movement keys are relative to where you're looking.
 */
export class TurnAim {
  /** Where you're looking (radians, world), or NaN until taken from the mech. */
  yaw = NaN;
  distance = 250;

  mouse(dx: number, dy: number): void {
    if (Number.isNaN(this.yaw)) return;
    this.yaw += dx * SENSITIVITY;
    this.distance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, this.distance - dy * DISTANCE_PER_PIXEL));
  }

  /** Takes the view direction from the mech (at the start, and while a lock-on turns it). */
  sync(facing: Vec2): void {
    this.yaw = Math.atan2(facing.y, facing.x);
  }

  /** The aim point (the crosshair) for a mech at `pos`. */
  aimPoint(pos: Vec2): Vec2 {
    return { x: pos.x + Math.cos(this.yaw) * this.distance, y: pos.y + Math.sin(this.yaw) * this.distance };
  }

  /** World movement for `forward` (W/S) and `right` (D/A) relative to where you're looking. */
  move(forward: number, right: number): Vec2 {
    const [c, s] = [Math.cos(this.yaw), Math.sin(this.yaw)];
    return { x: c * forward - s * right, y: s * forward + c * right };
  }

  reset(): void {
    this.yaw = NaN;
  }
}
