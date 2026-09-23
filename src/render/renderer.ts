import type { Match } from "../sim/match";
import type { World } from "../sim/world";
import { Camera } from "./camera";
import { Effects } from "./effects";
import { drawFighter } from "./fighterView";
import { drawHud, type HudInfo } from "./hud";
import { UI } from "./palette";
import { drawProjectiles } from "./projectileView";

const GRID = 50;

/**
 * Draws the world as plain boxes: each fighter and projectile is its bounding
 * box, which is exactly where art will go later.
 */
export class Renderer {
  readonly camera = new Camera();
  readonly effects = new Effects();
  private readonly ctx: CanvasRenderingContext2D;
  private cssWidth = 0;
  private cssHeight = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D not supported");
    this.ctx = ctx;
  }

  /** `alpha` in [0,1] is how far we are between the last two sim ticks. */
  render(world: World, match: Match, alpha: number, hud: HudInfo): void {
    this.resize(world);
    const { ctx } = this;
    const dpr = window.devicePixelRatio || 1;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = UI.background;
    ctx.fillRect(0, 0, this.cssWidth, this.cssHeight);

    ctx.save();
    this.camera.apply(ctx);
    this.drawArena(world);
    for (const f of world.fighters) drawFighter(ctx, f, alpha);
    drawProjectiles(ctx, world.projectiles, alpha);
    this.effects.draw(ctx);
    ctx.restore();

    drawHud(ctx, world, match, hud, this.cssWidth, this.cssHeight);
  }

  private resize(world: World): void {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w !== this.cssWidth || h !== this.cssHeight) {
      this.cssWidth = w;
      this.cssHeight = h;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    this.camera.fit(w, h, world.width, world.height);
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
