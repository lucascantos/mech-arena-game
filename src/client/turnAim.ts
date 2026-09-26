import { DT } from "../sim/constants";
import type { Vec2 } from "../sim/vec";

/** Radians of turn per pixel of mouse movement. */
const SENSITIVITY = 0.0035;
/** Aim point distance ahead of the mech (world units): mouse up/down moves it, within these limits. */
const MIN_DISTANCE = 80;
/** Up to near the top of the screen: the mech sits 3/4 of the way down a base 800-high view (heads that see farther scale it). */
const MAX_DISTANCE = 560;
const DISTANCE_PER_PIXEL = 1;
/** Locked on: the view doesn't turn while the target is within this angle of straight ahead... */
const LOCK_DEAD_ZONE = (8 * Math.PI) / 180;
/** ...and beyond it, eases toward the target at this rate (per second, exponential). */
const LOCK_FOLLOW = 5;

/**
 * FPS-style aiming for the rotating camera: the view turns so where you look
 * is up. Mouse left/right turns; up/down slides the crosshair along the line
 * ahead, from just in front of the mech to near the top of the screen.
 * Movement keys are relative to where you're looking.
 */
export class TurnAim {
  /** Where you're looking (radians, world), or NaN until taken from the mech. */
  yaw = NaN;
  distance = 350;
  /** The followed mech's view size (its head), so the crosshair can reach the top of a bigger view. */
  viewMultiplier = 1;

  mouse(dx: number, dy: number): void {
    if (Number.isNaN(this.yaw)) return;
    this.yaw += dx * SENSITIVITY;
    const max = MAX_DISTANCE * this.viewMultiplier;
    this.distance = Math.max(MIN_DISTANCE, Math.min(max, this.distance - dy * DISTANCE_PER_PIXEL));
  }

  /**
   * One tick of following a locked target in direction `toTarget`: no turn
   * inside the dead zone, else an eased turn by how far it's outside it, so
   * the view stays calm while the lock's aim jitters around a strafing target.
   */
  follow(toTarget: Vec2): void {
    const want = Math.atan2(toTarget.y, toTarget.x);
    if (Number.isNaN(this.yaw)) return void (this.yaw = want);
    const diff = Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw));
    const outside = Math.abs(diff) - LOCK_DEAD_ZONE;
    if (outside > 0) this.yaw += Math.sign(diff) * outside * (1 - Math.exp(-LOCK_FOLLOW * DT));
  }

  /** Takes the view direction from the mech (when the FPS view starts). */
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
