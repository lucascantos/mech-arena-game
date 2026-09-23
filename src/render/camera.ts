import type { Vec2 } from "../sim/vec";

const PADDING = 40;

/** Fits the arena into the canvas and converts between screen and world space. */
export class Camera {
  scale = 1;
  offsetX = 0;
  offsetY = 0;

  /** Recomputes the fit. `width`/`height` are CSS pixels. */
  fit(width: number, height: number, worldW: number, worldH: number): void {
    this.scale = Math.min((width - PADDING * 2) / worldW, (height - PADDING * 2) / worldH);
    this.offsetX = (width - worldW * this.scale) / 2;
    this.offsetY = (height - worldH * this.scale) / 2;
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
