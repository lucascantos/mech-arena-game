import type { LockOn } from "../client/lockOn";
import type { Fighter } from "../sim/fighter";
import type { MatchView } from "../sim/match";
import { lerp, type Vec2 } from "../sim/vec";
import type { World } from "../sim/world";
import { drawBackUnits } from "./backView";
import { Camera } from "./camera";
import { Effects } from "./effects";
import { drawFighter } from "./fighterView";
import { drawHud, type HudInfo } from "./hud";
import { UI } from "./palette";
import { drawProjectiles } from "./projectileView";
import { drawLockArea, drawLockOn } from "./lockOnView";
import { drawMap } from "./mapView";
import { drawMinimap } from "./minimap";
import { Radar } from "./radar";
import { drawRadarArrows } from "./radarArrows";

/** What the camera should do this frame. */
export interface ViewInfo {
  /** Fighter the camera follows (ignored in overview mode). */
  focus: Fighter | null;
  /** Screen px; the camera leans toward it. Null while spectating. */
  cursor: Vec2 | null;
  /** Lock-on state; a locked target replaces the cursor lean. Null while spectating. */
  lock: LockOn | null;
}

/**
 * Draws the world as plain boxes: each fighter and projectile is its bounding
 * box, which is exactly where art will go later.
 */
export class Renderer {
  readonly camera = new Camera();
  readonly effects = new Effects();
  private readonly radar = new Radar();
  private readonly ctx: CanvasRenderingContext2D;
  private cssWidth = 0;
  private cssHeight = 0;
  private lastFrame = performance.now();

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D not supported");
    this.ctx = ctx;
  }

  /** `alpha` in [0,1] is how far we are between the last two sim ticks. */
  /** Clears the screen (behind the menu) and forgets the previous game. */
  reset(): void {
    this.camera.reset();
    this.effects.clear();
    const dpr = window.devicePixelRatio || 1;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.fillStyle = UI.background;
    this.ctx.fillRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
  }

  /** `match` is null in modes without rounds (Training Ground). */
  render(world: World, match: MatchView | null, alpha: number, hud: HudInfo, view: ViewInfo): void {
    const { focus } = view;
    this.resize();
    this.updateCamera(world, view, alpha);
    const { ctx } = this;
    const dpr = window.devicePixelRatio || 1;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = UI.background;
    ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);

    // World drawing is clipped to the viewport, so letterbox bars stay empty.
    const v = this.camera.viewport;
    ctx.save();
    ctx.beginPath();
    ctx.rect(v.x, v.y, v.w, v.h);
    ctx.clip();
    this.camera.apply(ctx);
    drawMap(ctx, world);
    // Private info (HP, dodge, ammo) only for the fighter the camera follows: you, or who you spectate.
    for (const f of world.fighters) drawFighter(ctx, f, alpha, f === focus);
    const aim = view.cursor ? this.camera.screenToWorld(view.cursor) : null; // the cursor is only set while you drive
    drawBackUnits(ctx, world, alpha, aim ? focus : null, aim);
    drawProjectiles(ctx, world, alpha);
    this.effects.draw(ctx);
    if (view.lock) drawLockOn(ctx, world, view.lock, alpha);
    ctx.restore();

    // Lock-on area around the cursor (only while you drive a mech with lock-on on).
    if (view.lock?.enabled && view.cursor && focus) {
      drawLockArea(ctx, view.cursor, focus.stats.lockOnRadius * this.camera.scale, view.lock.candidateId !== null);
    }

    if (this.camera.mode === "follow" && focus) {
      this.radar.update(world, focus);
      drawMinimap(ctx, world, this.radar, this.camera, focus, this.cssWidth);
      drawRadarArrows(ctx, world, this.radar, this.camera, this.cssHeight);
    }
    drawHud(ctx, world, match, hud, this.cssWidth, this.cssHeight);
  }

  private updateCamera(world: World, { focus, cursor, lock }: ViewInfo, alpha: number): void {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    if (this.camera.mode === "follow" && focus) {
      const target = lerp(focus.prevPos, focus.pos, alpha);
      const locked = lock?.targetId == null ? undefined : world.getFighter(lock.targetId);
      const lockPos = locked?.alive ? lerp(locked.prevPos, locked.pos, alpha) : null;
      const { viewMultiplier } = focus.stats; // the followed mech's head sets how far it sees
      this.camera.follow(this.cssWidth, this.cssHeight, world.width, world.height, target, dt, cursor, lockPos, viewMultiplier);
    } else {
      this.camera.fit(this.cssWidth, this.cssHeight, world.width, world.height);
    }
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w !== this.cssWidth || h !== this.cssHeight) {
      this.cssWidth = w;
      this.cssHeight = h;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
  }
}
