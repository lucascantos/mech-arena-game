import type { Fighter } from "../sim/fighter";
import type { Vec2 } from "../sim/vec";

/** Moving faster than this share over walking speed reads as thrusting (a boost or a dash). */
const BOOSTING = 1.15;

/**
 * Thruster flames behind a boosting or dashing mech: two flickering jets
 * pointing against its motion, longer the faster it goes (a dash flares
 * hardest). Judged from speed, so it also shows for mechs whose boost state
 * isn't known here (online players).
 */
export function drawThrusters(ctx: CanvasRenderingContext2D, f: Fighter, p: Vec2): void {
  const speed = Math.hypot(f.vel.x, f.vel.y);
  if (speed < f.stats.moveSpeed * BOOSTING) return;
  const power = Math.min(2.2, speed / (f.stats.moveSpeed * 1.7)); // 1 at boost speed, more on a dash
  const back = { x: -f.vel.x / speed, y: -f.vel.y / speed };
  const side = { x: -back.y, y: back.x };
  const reach = Math.max(f.size.x, f.size.y) / 2;
  const flicker = 0.75 + 0.25 * Math.sin(performance.now() / 30);
  const length = reach * (0.9 + 0.5 * flicker) * power;
  for (const s of [-1, 1]) {
    const base = { x: p.x + back.x * reach * 0.8 + side.x * s * reach * 0.45, y: p.y + back.y * reach * 0.8 + side.y * s * reach * 0.45 };
    const tip = { x: base.x + back.x * length, y: base.y + back.y * length };
    const glow = ctx.createLinearGradient(base.x, base.y, tip.x, tip.y);
    glow.addColorStop(0, "rgba(255, 244, 200, 0.95)");
    glow.addColorStop(0.4, "rgba(88, 166, 255, 0.8)");
    glow.addColorStop(1, "rgba(88, 166, 255, 0)");
    ctx.strokeStyle = glow;
    ctx.lineWidth = reach * 0.35;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}
