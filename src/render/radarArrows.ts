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
  screenW: number,
  screenH: number,
): void {
  const cx = screenW / 2;
  const cy = screenH / 2;

  const onScreen = (x: number, y: number) => {
    const px = x * camera.scale + camera.offsetX;
    const py = y * camera.scale + camera.offsetY;
    return px >= 0 && px <= screenW && py >= 0 && py <= screenH;
  };

  for (const c of radar.contacts) {
    if (!c.alive) continue;
    const live = world.getFighter(c.fighterId);
    if (live && onScreen(live.pos.x, live.pos.y)) continue;
    // Pinged position in screen space, relative to the center.
    const sx = c.pos.x * camera.scale + camera.offsetX - cx;
    const sy = c.pos.y * camera.scale + camera.offsetY - cy;
    if (Math.abs(sx) <= cx && Math.abs(sy) <= cy) continue; // on screen: you can see it

    // Push the direction out to the inset screen border.
    const tx = sx > 0 ? (cx - INSET_SIDE) / sx : sx < 0 ? (INSET_SIDE - cx) / sx : Infinity;
    const ty = sy > 0 ? (cy - INSET_BOTTOM) / sy : sy < 0 ? (INSET_TOP - cy) / sy : Infinity;
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
