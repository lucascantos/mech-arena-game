import type { Fighter } from "../sim/fighter";
import type { Match } from "../sim/match";
import type { World } from "../sim/world";
import { DAMAGE_COLORS, UI } from "./palette";

export interface HudInfo {
  /** The fighter the human controls, or null when spectating. */
  possessed: Fighter | null;
  fps: number;
}

export function drawHud(
  ctx: CanvasRenderingContext2D,
  world: World,
  match: Match,
  hud: HudInfo,
  width: number,
  height: number,
): void {
  ctx.font = "13px ui-monospace, Consolas, monospace";
  ctx.font = "11px ui-monospace, Consolas, monospace";
  ctx.textAlign = "right";
  ctx.fillStyle = UI.muted;
  ctx.fillText(`tick ${world.tick}  ${hud.fps.toFixed(0)} fps`, width - 12, height - 14);

  drawScore(ctx, world, match, width);
  if (hud.possessed) drawLoadout(ctx, hud.possessed, height);

  const status = hud.possessed
    ? `Controlling ${hud.possessed.name}.  WASD move · Space dodge · Click fire · 1-4/wheel switch · R reload · Tab release`
    : `Spectating bots.  Tab to take control of ${world.fighters[0]?.name ?? "a fighter"}`;
  ctx.font = "13px ui-monospace, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = UI.text;
  ctx.fillText(status, width / 2, height - 14);
}

function drawScore(ctx: CanvasRenderingContext2D, world: World, match: Match, width: number): void {
  // One colored entry per team; eliminated fighters are dimmed.
  const teams = [...match.scores.keys()];
  const leaders = teams.map((t) => world.fighters.find((f) => f.team === t)!);
  const gap = 36;
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.textAlign = "left";
  const labels = leaders.map((f) => `${f.name} ${match.scores.get(f.team)}`);
  const widths = labels.map((l) => ctx.measureText(l).width);
  let x = width / 2 - (widths.reduce((a, b) => a + b, 0) + gap * (labels.length - 1)) / 2;
  leaders.forEach((f, i) => {
    ctx.globalAlpha = f.alive ? 1 : 0.35;
    ctx.fillStyle = f.color;
    ctx.fillText(labels[i], x, 26);
    x += widths[i] + gap;
  });
  ctx.globalAlpha = 1;
  ctx.textAlign = "center";

  if (match.roundOver) {
    const winner = world.fighters.find((f) => f.team === match.lastWinner);
    ctx.font = "bold 28px system-ui, sans-serif";
    ctx.fillStyle = winner?.color ?? UI.text;
    ctx.fillText(winner ? `${winner.name} wins the round` : "Draw", width / 2, 64);
  }
}

/** Bottom-left list of the possessed fighter's weapons. */
function drawLoadout(ctx: CanvasRenderingContext2D, f: Fighter, height: number): void {
  ctx.font = "13px ui-monospace, Consolas, monospace";
  ctx.textAlign = "left";
  f.weapons.forEach((w, slot) => {
    const y = height - 44 - (f.weapons.length - 1 - slot) * 18;
    const active = slot === f.weaponSlot;
    const state = w.isReloading ? `reloading ${Math.round(w.reloadProgress * 100)}%` : `${w.ammo}/${w.stats.magazine}`;
    ctx.fillStyle = DAMAGE_COLORS[w.stats.damageType];
    ctx.fillRect(12, y - 9, 8, 8);
    ctx.fillStyle = active ? UI.text : UI.muted;
    ctx.fillText(`${active ? ">" : " "} [${slot + 1}] ${w.stats.name.padEnd(16)} ${state}`, 26, y);
  });
}
