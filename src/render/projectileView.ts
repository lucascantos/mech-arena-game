import type { Projectile } from "../sim/projectile";
import { lerp } from "../sim/vec";
import { DAMAGE_COLORS } from "./palette";

/** Projectiles are their bounding box, colored by damage type, with a short streak. */
export function drawProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[], alpha: number): void {
  for (const p of projectiles) {
    const pos = lerp(p.prevPos, p.pos, alpha);
    const color = DAMAGE_COLORS[p.damageType];

    // Streak from the previous tick, so fast shots read as motion.
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = Math.max(2, p.size / 2);
    ctx.beginPath();
    ctx.moveTo(p.prevPos.x, p.prevPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.fillRect(pos.x - p.size / 2, pos.y - p.size / 2, p.size, p.size);
  }
}
