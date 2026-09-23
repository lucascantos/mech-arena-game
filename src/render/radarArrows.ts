import type { World } from "../sim/world";
import type { Camera } from "./camera";
import type { Radar } from "./radar";

/** Distance of the arrows from the screen edges, in CSS px (clear of score row and status line). */
const INSET_SIDE = 28;
const INSET_TOP = 56;
const INSET_BOTTOM = 56;
const ARROW = 12;

/**
 * For each living radar contact whose pinged position is off-screen, an arrow
 * on the screen edge points toward it, fading until the next ping. Fighters
 * you can currently see get no arrow (it would point at a stale spot).
 */
export function drawRadarArrows(
  ctx: CanvasRenderingContext2D,
  world: World,
  radar: Radar,
  camera: Camera,
  screenH: number,
): void {
  // Arrows live on the edge of the visible area (the letterboxed viewport),
  // kept clear of the score row and the status line.
  const v = camera.viewport;
  const cx = v.x + v.w / 2;
  const cy = v.y + v.h / 2;
  const left = v.x + INSET_SIDE;
  const right = v.x + v.w - INSET_SIDE;
  const top = Math.max(v.y + INSET_SIDE, INSET_TOP);
  const bottom = Math.min(v.y + v.h - INSET_SIDE, screenH - INSET_BOTTOM);

  const visible = (x: number, y: number) => {
    const p = camera.worldToScreen({ x, y });
    return p.x >= v.x && p.x <= v.x + v.w && p.y >= v.y && p.y <= v.y + v.h;
  };

  for (const c of radar.contacts) {
    if (!c.alive) continue;
    const live = world.getFighter(c.fighterId);
    if (live && visible(live.pos.x, live.pos.y)) continue;
    if (visible(c.pos.x, c.pos.y)) continue; // pinged position is on screen: you can see it
    // Direction from the view center to the pinged position, pushed out to the inset border.
    const p = camera.worldToScreen(c.pos);
    const sx = p.x - cx;
    const sy = p.y - cy;
    const tx = sx > 0 ? (right - cx) / sx : sx < 0 ? (left - cx) / sx : Infinity;
    const ty = sy > 0 ? (bottom - cy) / sy : sy < 0 ? (top - cy) / sy : Infinity;
    const t = Math.min(tx, ty);

    ctx.save();
    ctx.translate(cx + sx * t, cy + sy * t);
    ctx.rotate(Math.atan2(sy, sx));
    ctx.globalAlpha = radar.fade;
    ctx.fillStyle = c.color;
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ARROW, 0);
    ctx.lineTo(-ARROW * 0.7, -ARROW * 0.7);
    ctx.lineTo(-ARROW * 0.35, 0);
    ctx.lineTo(-ARROW * 0.7, ARROW * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
