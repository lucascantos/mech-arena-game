import type { Fighter } from "../sim/fighter";
import { lerp } from "../sim/vec";
import { drawBrace } from "./braceView";
import { shade, UI } from "./palette";
import { upright } from "./upright";

/**
 * Draws a fighter as its bounding box plus aim line and labels. `showPrivate`
 * adds what only its own player should know (HP, energy, ammo and
 * reloading); everyone else just sees its name, parts and weapon in hand.
 */
export function drawFighter(ctx: CanvasRenderingContext2D, f: Fighter, alpha: number, showPrivate: boolean): void {
  const p = lerp(f.prevPos, f.pos, alpha);
  const w = f.size.x;
  const h = f.size.y;
  const x = p.x - w / 2;
  const y = p.y - h / 2;
  const dashing = f.defense?.controlsMovement() ?? false;
  const base = f.alive ? 1 : 0.25;

  // Body: the bounding box. Fades while dashing so the dodge reads clearly.
  ctx.globalAlpha = base * (dashing ? 0.35 : 0.85);
  ctx.fillStyle = f.color;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = base;

  // Outline turns white while invulnerable.
  ctx.strokeStyle = f.invulnerable ? "#ffffff" : shade(f.color);
  ctx.lineWidth = f.invulnerable ? 3 : 2;
  ctx.strokeRect(x, y, w, h);

  if (f.alive) {
    drawBrace(ctx, f, p.x, p.y);
    drawAim(ctx, f, p.x, p.y);
    upright(ctx, p, () => {
      drawPublicLabel(ctx, f, x, y, w, h, showPrivate);
      if (showPrivate) drawPrivateBars(ctx, f, x, y, w, h);
    });
  }
  ctx.globalAlpha = 1;
}

/** Aim line plus the current spread cone, so recoil bloom is visible. */
function drawAim(ctx: CanvasRenderingContext2D, f: Fighter, cx: number, cy: number): void {
  const reach = f.size.x * 0.75;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + f.facing.x * reach, cy + f.facing.y * reach);
  ctx.stroke();

  const weapon = f.weapon;
  if (!weapon) return;
  const angle = Math.atan2(f.facing.y, f.facing.x);
  const half = ((weapon.currentSpread / 2) * Math.PI) / 180;
  const coneLen = reach + 40;
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, coneLen, angle - half, angle + half);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Name and parts above; the weapon in hand below (for others, without ammo). */
function drawPublicLabel(ctx: CanvasRenderingContext2D, f: Fighter, x: number, y: number, w: number, h: number, own: boolean) {
  ctx.textAlign = "center";
  ctx.fillStyle = UI.text;
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText(`${f.name} · ${f.parts.head.shortName}/${f.parts.torso.shortName}/${f.parts.legs.shortName}`, x + w / 2, y - 18);
  if (!own && f.weapon) {
    ctx.font = "11px ui-monospace, Consolas, monospace";
    ctx.fillStyle = UI.muted;
    ctx.fillText(f.weapon.stats.shortName, x + w / 2, y + h + 24);
  }
}

/** HP, energy, and ammo or reload progress: only for the fighter you are (or are spectating). */
function drawPrivateBars(ctx: CanvasRenderingContext2D, f: Fighter, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = UI.barBack;
  ctx.fillRect(x, y - 12, w, 6);
  ctx.fillStyle = UI.hp;
  ctx.fillRect(x, y - 12, (w * f.hp) / f.maxHp, 6);

  // Energy, with a notch per dash's worth; dim when a dash isn't affordable.
  const { energy } = f;
  const cost = f.stats.dashCost;
  ctx.fillStyle = UI.barBack;
  ctx.fillRect(x, y + h + 6, w, 4);
  ctx.fillStyle = energy.canAfford(cost) ? UI.defense : UI.defense + "55";
  ctx.fillRect(x, y + h + 6, w * energy.fraction, 4);
  ctx.fillStyle = UI.background;
  for (let mark = cost; mark < energy.max; mark += cost) ctx.fillRect(x + (w * mark) / energy.max - 0.5, y + h + 6, 1, 4);

  const weapon = f.weapon;
  if (!weapon) return;
  const labelY = y + h + 24;
  ctx.textAlign = "center";
  if (weapon.isReloading) {
    ctx.fillStyle = UI.barBack;
    ctx.fillRect(x, labelY - 8, w, 4);
    ctx.fillStyle = UI.muted;
    ctx.fillRect(x, labelY - 8, w * weapon.reloadProgress, 4);
    ctx.font = "10px ui-monospace, Consolas, monospace";
    ctx.fillText("RELOAD", x + w / 2, labelY + 6);
  } else {
    ctx.font = "11px ui-monospace, Consolas, monospace";
    ctx.fillStyle = UI.muted;
    ctx.fillText(`${weapon.stats.shortName} ${weapon.status}`, x + w / 2, labelY);
  }
}
