import type { Fighter } from "../sim/fighter";
import { DAMAGE_COLORS } from "./palette";

/**
 * Self-stagger after a heavy shot: corner brackets show the mech is locked
 * in place, fading as it recovers.
 */
export function drawBrace(ctx: CanvasRenderingContext2D, f: Fighter, cx: number, cy: number): void {
  const brace = f.brace;
  if (!brace) return;
  const pad = 6;
  const hw = f.size.x / 2 + pad;
  const hh = f.size.y / 2 + pad;
  const arm = Math.min(hw, hh) * 0.5;

  ctx.globalAlpha = 1 - 0.7 * brace.progress;
  ctx.strokeStyle = DAMAGE_COLORS[brace.weapon.stats.damageType];
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const px = cx + sx * hw;
    const py = cy + sy * hh;
    ctx.moveTo(px - sx * arm, py);
    ctx.lineTo(px, py);
    ctx.lineTo(px, py - sy * arm);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}
