import type { Vec2 } from "../sim/vec";
import { clampAxis } from "../sim/vision";
import { LookAhead } from "./lookAhead";
import { VIEW_HEIGHT, VIEW_WIDTH, type ScreenRect } from "./view";

const PADDING = 40;
/** How quickly the camera catches up to its target (per second, exponential). */
const FOLLOW_SHARPNESS = 10;
export type CameraMode = "follow" | "overview";

/**
 * Converts between screen and world space: fitting the arena, following a
 * target (north up), or FPS-style: turned so where you look is up the
 * screen, with the aim point in the middle. Screen = screen center + R(rotation) × (world − center) × scale.
 */
export class Camera {
  mode: CameraMode = "follow";
  scale = 1;
  /** Radians the world is turned on screen (0 = north up). */
  rotation = 0;
  /** Where the world is drawn on screen. Smaller than the canvas when letterboxed. */
  viewport: ScreenRect = { x: 0, y: 0, w: 0, h: 0 };
  /** World point at the center of the screen. */
  private center: Vec2 = { x: 0, y: 0 };
  private screenCenter: Vec2 = { x: 0, y: 0 };
  private following = false;
  private lookAhead = new LookAhead();

  /** Forget the previous game's position and lean (snaps to the next target). */
  reset(): void {
    this.following = false;
    this.rotation = 0;
    this.lookAhead = new LookAhead();
  }

  /** Fits the whole arena on screen, north up. `width`/`height` are CSS pixels. */
  fit(width: number, height: number, worldW: number, worldH: number): void {
    this.scale = Math.min((width - PADDING * 2) / worldW, (height - PADDING * 2) / worldH);
    this.viewport = { x: 0, y: 0, w: width, h: height };
    this.screenCenter = { x: width / 2, y: height / 2 };
    this.center = { x: worldW / 2, y: worldH / 2 };
    this.rotation = 0;
    this.following = false;
  }

  /**
   * North-up follow: shows a VIEW_WIDTH × VIEW_HEIGHT area (times the head's
   * `viewMultiplier`), easing toward `target` without showing past the map.
   * With a `cursor` (screen px) it leans toward it; with a locked target
   * (`lockPos`, world) it frames the midpoint of `target` and the lock. See LookAhead.
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
    const [viewW, viewH] = this.frame(width, height, viewMultiplier);
    const aim = cursor ? { x: (cursor.x - width / 2) / this.scale, y: (cursor.y - height / 2) / this.scale } : null;
    const lock = lockPos ? { x: lockPos.x - target.x, y: lockPos.y - target.y } : null;
    const lean = this.lookAhead.update(aim, dt, lock, viewW, viewH);
    const desired = { x: clampAxis(target.x + lean.x, viewW, worldW), y: clampAxis(target.y + lean.y, viewH, worldH) };
    this.rotation = 0;
    this.ease(desired, dt);
  }

  /**
   * FPS-style follow: looking along `yaw` (radians) is up the screen, and the
   * aim point `distance` ahead of `mech` is exactly in the middle (where the
   * crosshair is). No easing: the view turns with the mouse.
   */
  followFps(width: number, height: number, mech: Vec2, yaw: number, distance: number, viewMultiplier = 1): void {
    this.frame(width, height, viewMultiplier);
    this.rotation = -Math.PI / 2 - yaw; // world direction `yaw` → screen up
    this.center = { x: mech.x + Math.cos(yaw) * distance, y: mech.y + Math.sin(yaw) * distance };
    this.following = true;
  }

  /** Applies the world transform to a context already scaled for devicePixelRatio. */
  apply(ctx: CanvasRenderingContext2D): void {
    ctx.translate(this.screenCenter.x, this.screenCenter.y);
    ctx.rotate(this.rotation);
    ctx.scale(this.scale, this.scale);
    ctx.translate(-this.center.x, -this.center.y);
  }

  screenToWorld(p: Vec2): Vec2 {
    const [dx, dy] = [(p.x - this.screenCenter.x) / this.scale, (p.y - this.screenCenter.y) / this.scale];
    const [c, s] = [Math.cos(-this.rotation), Math.sin(-this.rotation)];
    return { x: this.center.x + dx * c - dy * s, y: this.center.y + dx * s + dy * c };
  }

  worldToScreen(p: Vec2): Vec2 {
    const [dx, dy] = [p.x - this.center.x, p.y - this.center.y];
    const [c, s] = [Math.cos(this.rotation), Math.sin(this.rotation)];
    return { x: this.screenCenter.x + (dx * c - dy * s) * this.scale, y: this.screenCenter.y + (dx * s + dy * c) * this.scale };
  }

  /** World corners (min, max) of the box around everything visible (the view may be turned). */
  visibleWorld(): [Vec2, Vec2] {
    const v = this.viewport;
    const corners = [
      { x: v.x, y: v.y },
      { x: v.x + v.w, y: v.y },
      { x: v.x, y: v.y + v.h },
      { x: v.x + v.w, y: v.y + v.h },
    ].map((p) => this.screenToWorld(p));
    const xs = corners.map((p) => p.x);
    const ys = corners.map((p) => p.y);
    return [{ x: Math.min(...xs), y: Math.min(...ys) }, { x: Math.max(...xs), y: Math.max(...ys) }];
  }

  /** Scale and letterboxed viewport for a view of the base size × `viewMultiplier`. Returns the view size in world units. */
  private frame(width: number, height: number, viewMultiplier: number): [number, number] {
    const viewW = VIEW_WIDTH * viewMultiplier;
    const viewH = VIEW_HEIGHT * viewMultiplier;
    this.scale = Math.min(width / viewW, height / viewH);
    const [vw, vh] = [viewW * this.scale, viewH * this.scale];
    this.viewport = { x: (width - vw) / 2, y: (height - vh) / 2, w: vw, h: vh };
    this.screenCenter = { x: width / 2, y: height / 2 };
    return [viewW, viewH];
  }

  /** Eases the center toward `desired` (snaps the first time). */
  private ease(desired: Vec2, dt: number): void {
    const t = this.following ? 1 - Math.exp(-FOLLOW_SHARPNESS * dt) : 1;
    this.center = { x: this.center.x + (desired.x - this.center.x) * t, y: this.center.y + (desired.y - this.center.y) * t };
    this.following = true;
  }
}
