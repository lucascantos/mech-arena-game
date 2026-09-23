import type { Fighter } from "../sim/fighter";
import { DAMAGE_COLORS } from "./palette";

/**
 * Brace telegraph: corner brackets show the mech is planted, and during the
 * windup a dashed line shows where the heavy shot will go, brightening until
 * it fires. That line is the opponent's cue to dodge.
 */
export function drawBrace(ctx: CanvasRenderingContext2D, f: Fighter, cx: number, cy: number): void {
  const brace = f.brace;
  if (!brace) return;
  const color = DAMAGE_COLORS[brace.weapon.stats.damageType];
  const windup = brace.phase === "windup";

  // Corner brackets just outside the bounding box.
  const pad = 6;
  const hw = f.size.x / 2 + pad;
  const hh = f.size.y / 2 + pad;
  const arm = Math.min(hw, hh) * 0.5;
  ctx.globalAlpha = windup ? 1 : 0.45;
  ctx.strokeStyle = color;
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

  if (windup) {
    const range = brace.weapon.stats.range;
    const start = f.size.x / 2 + pad;
    ctx.globalAlpha = 0.15 + 0.6 * brace.progress;
    ctx.lineWidth = 2 + 2 * brace.progress;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(cx + f.facing.x * start, cy + f.facing.y * start);
    ctx.lineTo(cx + f.facing.x * range, cy + f.facing.y * range);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.globalAlpha = 1;
}
