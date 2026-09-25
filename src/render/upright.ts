import type { Vec2 } from "../sim/vec";

/** The camera's current turn, so world-space text can be drawn the right way up. Set by the renderer each frame. */
export const screenTurn = { rotation: 0 };

/**
 * Runs `draw` (world-space text and bars around `at`) turned back against the
 * camera, so labels stay upright and readable when the view rotates.
 */
export function upright(ctx: CanvasRenderingContext2D, at: Vec2, draw: () => void): void {
  if (screenTurn.rotation === 0) return draw();
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(-screenTurn.rotation);
  ctx.translate(-at.x, -at.y);
  draw();
  ctx.restore();
}
