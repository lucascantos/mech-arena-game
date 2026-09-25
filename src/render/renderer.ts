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
import { screenTurn } from "./upright";

/** What the camera should do this frame. */
export interface ViewInfo {
  /** Fighter the camera follows (ignored in overview mode). */
  focus: Fighter | null;
  /** Screen px; the camera leans toward it. Null while spectating. */
  cursor: Vec2 | null;
  /** Lock-on state; a locked target replaces the cursor lean. Null while spectating. */
  lock: LockOn | null;
  /** FPS-style rotating camera (only while you drive): where you look and how far ahead the aim point is. */
  rotate: { yaw: number; crosshair: Vec2 | null; captured: boolean; refused: boolean } | null;
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
    screenTurn.rotation = this.camera.rotation;
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

    // The crosshair: where a lock-on is aiming (either camera), else the FPS view's aim point.
    const lockAim = view.lock?.targetId != null ? view.lock.aimPoint : null;
    const crosshair = lockAim ? this.camera.worldToScreen(lockAim) : view.rotate?.crosshair;
    if (crosshair) drawCrosshair(ctx, crosshair);
    if (view.rotate && !view.rotate.captured) drawCapturePrompt(ctx, this.cssWidth, this.cssHeight, view.rotate.refused);
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

  private updateCamera(world: World, { focus, cursor, lock, rotate }: ViewInfo, alpha: number): void {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    if (this.camera.mode === "follow" && focus && rotate) {
      const mech = lerp(focus.prevPos, focus.pos, alpha);
      this.camera.followFps(this.cssWidth, this.cssHeight, mech, rotate.yaw, focus.stats.viewMultiplier);
    } else if (this.camera.mode === "follow" && focus) {
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


/** FPS-style camera: the crosshair, always in the middle of the view. */
function drawCrosshair(ctx: CanvasRenderingContext2D, p: { x: number; y: number }): void {
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    ctx.moveTo(p.x + dx * 5, p.y + dy * 5);
    ctx.lineTo(p.x + dx * 13, p.y + dy * 13);
  }
  ctx.stroke();
}

/** FPS-style camera without a locked mouse: say how to lock it (or that this window can't). */
function drawCapturePrompt(ctx: CanvasRenderingContext2D, width: number, height: number, refused: boolean): void {
  const lines = refused
    ? ["This window can't lock the mouse.", "Open the game in a browser tab, or press C for the classic camera."]
    : ["Click to lock the mouse to the game"];
  ctx.font = "bold 14px system-ui, sans-serif";
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 28;
  const top = height * 0.12; // up top, clear of the mech and the crosshair line
  ctx.fillStyle = "#000000b0";
  ctx.fillRect(width / 2 - w / 2, top, w, 14 + lines.length * 20);
  ctx.fillStyle = refused ? "#d29922" : "#ffffff";
  ctx.textAlign = "center";
  lines.forEach((l, i) => ctx.fillText(l, width / 2, top + 22 + i * 20));
}
