import type { Fighter } from "../sim/fighter";
import type { Match } from "../sim/match";
import { lerp, type Vec2 } from "../sim/vec";
import type { World } from "../sim/world";
import { Camera } from "./camera";
import { Effects } from "./effects";
import { drawFighter } from "./fighterView";
import { drawHud, type HudInfo } from "./hud";
import { UI } from "./palette";
import { drawProjectiles } from "./projectileView";
import { drawMinimap } from "./minimap";
import { Radar } from "./radar";
import { drawRadarArrows } from "./radarArrows";

const GRID = 50;

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

  /**
   * `alpha` in [0,1] is how far we are between the last two sim ticks.
   * `focus` is the fighter the camera follows (ignored in overview mode).
   * `cursor` (screen px) turns on lock-on: the camera centers between focus and cursor.
   */
  render(world: World, match: Match, alpha: number, hud: HudInfo, focus: Fighter | null, cursor: Vec2 | null = null): void {
    this.resize();
    this.updateCamera(world, focus, alpha, cursor);
    const { ctx } = this;
    const dpr = window.devicePixelRatio || 1;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = UI.background;
    ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);

    ctx.save();
    this.camera.apply(ctx);
    this.drawArena(world);
    for (const f of world.fighters) drawFighter(ctx, f, alpha);
    drawProjectiles(ctx, world, alpha);
    this.effects.draw(ctx);
    ctx.restore();

    if (this.camera.mode === "follow" && focus) {
      this.radar.update(world, focus);
      drawMinimap(ctx, world, this.radar, this.camera, focus, this.cssWidth, this.cssHeight);
      drawRadarArrows(ctx, world, this.radar, this.camera, this.cssWidth, this.cssHeight);
    }
    drawHud(ctx, world, match, hud, this.cssWidth, this.cssHeight);
  }

  private updateCamera(world: World, focus: Fighter | null, alpha: number, cursor: Vec2 | null): void {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    if (this.camera.mode === "follow" && focus) {
      const target = lerp(focus.prevPos, focus.pos, alpha);
      this.camera.follow(this.cssWidth, this.cssHeight, world.width, world.height, target, dt, cursor);
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

  private drawArena(world: World): void {
    const { ctx } = this;
    ctx.fillStyle = UI.floor;
    ctx.fillRect(0, 0, world.width, world.height);

    ctx.strokeStyle = UI.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = GRID; x < world.width; x += GRID) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, world.height);
    }
    for (let y = GRID; y < world.height; y += GRID) {
      ctx.moveTo(0, y);
      ctx.lineTo(world.width, y);
    }
    ctx.stroke();

    ctx.strokeStyle = UI.wall;
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, world.width, world.height);
  }
}
