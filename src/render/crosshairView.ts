import type { Vec2 } from "../sim/vec";

/** Charge ring colors: white when it starts, blue when full. */
const START = [255, 255, 255];
const FULL = [88, 166, 255];
const RING = 18;

/**
 * The crosshair. With `charge` (0..1, a charge weapon being held) a ring
 * around it fills clockwise from the top and shifts from white to blue; at
 * full charge it pulses. `showCross`: false when the mouse cursor is already
 * the cross (classic camera), so only the ring is drawn.
 */
export function drawCrosshair(ctx: CanvasRenderingContext2D, p: Vec2, charge: number | null, showCross = true): void {
  const color = charge === null ? "#ffffff" : mix(Math.min(1, charge));
  if (showCross) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      ctx.moveTo(p.x + dx * 5, p.y + dy * 5);
      ctx.lineTo(p.x + dx * 13, p.y + dy * 13);
    }
    ctx.stroke();
  }
  if (charge === null || charge <= 0) return;

  const full = charge >= 1;
  const pulse = full ? (Math.sin(performance.now() / 90) + 1) / 2 : 0; // ~3.5 pulses a second
  ctx.strokeStyle = color;
  ctx.lineWidth = 3 + pulse * 2;
  ctx.globalAlpha = full ? 0.6 + 0.4 * pulse : 0.9;
  ctx.beginPath();
  ctx.arc(p.x, p.y, RING + pulse * 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, charge));
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function mix(t: number): string {
  const c = START.map((s, i) => Math.round(s + (FULL[i] - s) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
