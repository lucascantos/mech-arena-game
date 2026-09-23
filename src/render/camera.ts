import type { Vec2 } from "../sim/vec";
import { clampAxis } from "../sim/vision";
import { LookAhead } from "./lookAhead";
import { VIEW_HEIGHT, VIEW_WIDTH, type ScreenRect } from "./view";

const PADDING = 40;
/** How quickly the camera catches up to its target (per second, exponential). */
const FOLLOW_SHARPNESS = 10;
export type CameraMode = "follow" | "overview";

/** Converts between screen and world space, either fitting the arena or following a target. */
export class Camera {
  mode: CameraMode = "follow";
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  /** Where the world is drawn on screen. Smaller than the canvas when letterboxed. */
  viewport: ScreenRect = { x: 0, y: 0, w: 0, h: 0 };
  /** World point at the center of the screen in follow mode. */
  private center: Vec2 | null = null;
  private readonly lookAhead = new LookAhead();

  /** Fits the whole arena on screen. `width`/`height` are CSS pixels. */
  fit(width: number, height: number, worldW: number, worldH: number): void {
    this.scale = Math.min((width - PADDING * 2) / worldW, (height - PADDING * 2) / worldH);
    this.offsetX = (width - worldW * this.scale) / 2;
    this.offsetY = (height - worldH * this.scale) / 2;
    this.viewport = { x: 0, y: 0, w: width, h: height };
  }

  /**
   * Shows a VIEW_WIDTH × VIEW_HEIGHT area of the world (times `viewMultiplier`,
   * from the followed mech's head), as large as fits
   * on screen and centered (letterboxed if the screen's shape differs), easing
   * toward `target` without showing past the arena walls. With a `cursor`
   * (screen px) the camera also leans toward it; with a locked target
   * (`lockPos`, world) it frames the midpoint of `target` and the lock
   * instead. See LookAhead.
   */
  follow(
    width: number,
    height: number,
    worldW: number,
    worldH: number,
    target: Vec2,
    dt: number,
    cursor: Vec2 | null = null,
    lockPos: Vec2 | null = null,
    viewMultiplier = 1,
  ): void {
    const viewW = VIEW_WIDTH * viewMultiplier;
    const viewH = VIEW_HEIGHT * viewMultiplier;
    this.scale = Math.min(width / viewW, height / viewH);
    const vw = viewW * this.scale;
    const vh = viewH * this.scale;
    this.viewport = { x: (width - vw) / 2, y: (height - vh) / 2, w: vw, h: vh };

    // The cursor's offset from the view center, in world units.
    const aim = cursor ? { x: (cursor.x - width / 2) / this.scale, y: (cursor.y - height / 2) / this.scale } : null;
    const lock = lockPos ? { x: lockPos.x - target.x, y: lockPos.y - target.y } : null;
    const lean = this.lookAhead.update(aim, dt, lock, viewW, viewH);
    target = { x: target.x + lean.x, y: target.y + lean.y };

    const t = this.center ? 1 - Math.exp(-FOLLOW_SHARPNESS * dt) : 1;
    const prev = this.center ?? target;
    const desired = { x: clampAxis(target.x, viewW, worldW), y: clampAxis(target.y, viewH, worldH) };
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

  worldToScreen(p: Vec2): Vec2 {
    return { x: p.x * this.scale + this.offsetX, y: p.y * this.scale + this.offsetY };
  }

  /** World corners of the visible area (top-left, bottom-right). */
  visibleWorld(): [Vec2, Vec2] {
    const v = this.viewport;
    return [this.screenToWorld({ x: v.x, y: v.y }), this.screenToWorld({ x: v.x + v.w, y: v.y + v.h })];
  }
}
