import type { Vec2 } from "../sim/vec";
import { LookAhead } from "./lookAhead";

const PADDING = 40;
/**
 * How far the player can see in follow mode: world units from the center of
 * the screen to the nearest screen edge. The zoom adapts to the window so this
 * distance is the same on every screen size (no advantage from a big monitor).
 */
export const VIEW_DISTANCE = 480;
/** How quickly the camera catches up to its target (per second, exponential). */
const FOLLOW_SHARPNESS = 10;
export type CameraMode = "follow" | "overview";

/** Converts between screen and world space, either fitting the arena or following a target. */
export class Camera {
  mode: CameraMode = "follow";
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  /** World point at the center of the screen in follow mode. */
  private center: Vec2 | null = null;
  private readonly lookAhead = new LookAhead();

  /** Fits the whole arena on screen. `width`/`height` are CSS pixels. */
  fit(width: number, height: number, worldW: number, worldH: number): void {
    this.scale = Math.min((width - PADDING * 2) / worldW, (height - PADDING * 2) / worldH);
    this.offsetX = (width - worldW * this.scale) / 2;
    this.offsetY = (height - worldH * this.scale) / 2;
  }

  /**
   * Eases toward `target` at a fixed view distance, without showing past the
   * arena edges (unless the arena is smaller than the view on that axis).
   * With a `cursor` (screen px), the camera also leans toward it (lock-on);
   * see LookAhead.
   */
  follow(
    width: number,
    height: number,
    worldW: number,
    worldH: number,
    target: Vec2,
    dt: number,
    cursor: Vec2 | null = null,
  ): void {
    this.scale = Math.min(width, height) / (VIEW_DISTANCE * 2);
    const lean = this.lookAhead.update(cursor, width, height, this.scale, dt);
    target = { x: target.x + lean.x, y: target.y + lean.y };
    const t = this.center ? 1 - Math.exp(-FOLLOW_SHARPNESS * dt) : 1;
    const prev = this.center ?? target;
    const desired = {
      x: clampAxis(target.x, width / this.scale, worldW),
      y: clampAxis(target.y, height / this.scale, worldH),
    };
    this.center = { x: prev.x + (desired.x - prev.x) * t, y: prev.y + (desired.y - prev.y) * t };
    this.offsetX = width / 2 - this.center.x * this.scale;
    this.offsetY = height / 2 - this.center.y * this.scale;
  }

  /** Applies the world transform to a context already scaled for devicePixelRatio. */
  apply(ctx: CanvasRenderingContext2D): void {
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);
  }

  screenToWorld(p: Vec2): Vec2 {
    return { x: (p.x - this.offsetX) / this.scale, y: (p.y - this.offsetY) / this.scale };
  }
}

/** Keeps the view inside [0, world] on one axis; centers it if the world is smaller. */
function clampAxis(center: number, viewSize: number, worldSize: number): number {
  if (viewSize >= worldSize) return worldSize / 2;
  return Math.min(worldSize - viewSize / 2, Math.max(viewSize / 2, center));
}
