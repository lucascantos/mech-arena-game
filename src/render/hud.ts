import type { Fighter } from "../sim/fighter";
import { TICK_RATE } from "../sim/constants";
import type { MatchView } from "../sim/match";
import type { Scoreboard } from "../sim/scoreboard";
import type { World } from "../sim/world";
import { DAMAGE_COLORS, UI } from "./palette";
import { drawScoreboard } from "./scoreboardView";

export interface HudInfo {
  /** The fighter the human controls, or null when spectating. */
  possessed: Fighter | null;
  /** Who the camera is following. */
  following: Fighter;
  /** Who destroyed "you" this round, if anyone. */
  killer: Fighter | null;
  scoreboard: Scoreboard;
  /** Scoreboard key is held. It also shows on its own between rounds. */
  showScoreboard: boolean;
  /** Lock-on toggled on (Q). */
  lockOnEnabled: boolean;
  /** Extra line, e.g. the online room code. */
  banner: string | null;
  fps: number;
}

export function drawHud(
  ctx: CanvasRenderingContext2D,
  world: World,
  match: MatchView | null,
  hud: HudInfo,
  width: number,
  height: number,
): void {
  ctx.font = "13px ui-monospace, Consolas, monospace";
  ctx.font = "11px ui-monospace, Consolas, monospace";
  ctx.textAlign = "right";
  ctx.fillStyle = UI.muted;
  ctx.fillText(`tick ${world.tick}  ${hud.fps.toFixed(0)} fps`, width - 12, height - 34);
  if (hud.banner) ctx.fillText(hud.banner, width - 12, height - 50);

  if (match) {
    drawScore(ctx, world, match, width);
    drawCountdown(ctx, match, width, height);
  }
  // Full stats only outside of battle (between rounds); while fighting, Tab shows just K / D / K/D.
  if (match?.roundOver) drawScoreboard(ctx, world, match, hud.scoreboard, width, height, "full");
  else if (hud.showScoreboard) drawScoreboard(ctx, world, match, hud.scoreboard, width, height, "compact");
  if (hud.possessed) {
    drawLoadout(ctx, hud.possessed, height);
    // Lock-on state (Q toggles), always shown while you drive a mech.
    ctx.font = "bold 12px ui-monospace, Consolas, monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = hud.lockOnEnabled ? UI.hp : UI.muted;
    ctx.fillText(hud.lockOnEnabled ? "LOCK-ON ON (Q)" : "LOCK-ON OFF (Q)", 12, height - 62 - hud.possessed.weapons.length * 18);
  }

  const you = world.fighters[0];
  let status: string;
  if (hud.possessed?.alive) {
    status = `Controlling ${hud.possessed.name}.  WASD move · Space dodge · Click fire · Right-click back unit · 1-4/wheel switch · R reload · Q lock-on · Tab stats · P release · V overview · C rotate`;
  } else if (you && !you.alive) {
    const by = hud.killer ? `Destroyed by ${hud.killer.name}` : "Destroyed";
    status = `${by}.  Spectating ${hud.following.name} until the next round · Tab stats`;
  } else {
    status = `Spectating ${hud.following.name}.  P take control · Tab stats · V toggle camera`;
  }
  ctx.font = "13px ui-monospace, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = UI.text;
  ctx.fillText(status, width / 2, height - 14);
}

/** Big 3-2-1 before each round, then a short "FIGHT!". */
function drawCountdown(ctx: CanvasRenderingContext2D, match: MatchView, width: number, height: number): void {
  let text: string | null = null;
  if (match.inCountdown) text = String(Math.ceil(match.countdownLeft / TICK_RATE));
  else if (match.fightTicks < 45 && !match.roundOver) text = "FIGHT!";
  if (!text) return;
  ctx.font = "bold 72px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = text === "FIGHT!" ? UI.crit : UI.text;
  ctx.fillText(text, width / 2, height / 2 - 60);
}

function drawScore(ctx: CanvasRenderingContext2D, world: World, match: MatchView, width: number): void {
  // One colored entry per team; eliminated fighters are dimmed.
  const teams = [...match.scores.keys()];
  const leaders = teams.map((t) => world.fighters.find((f) => f.team === t)!);
  const labels = leaders.map((f) => `${f.name} ${match.scores.get(f.team)}`);
  // Shrink the font until the row fits the screen.
  let size = 18;
  let gap = 36;
  let widths: number[] = [];
  ctx.textAlign = "left";
  for (; size >= 10; size--) {
    ctx.font = `bold ${size}px system-ui, sans-serif`;
    gap = size * 2;
    widths = labels.map((l) => ctx.measureText(l).width);
    if (widths.reduce((a, b) => a + b, 0) + gap * (labels.length - 1) <= width - 24) break;
  }
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

/** Bottom-left list of the possessed fighter's weapons, with the back unit under them. */
function drawLoadout(ctx: CanvasRenderingContext2D, f: Fighter, height: number): void {
  ctx.font = "13px ui-monospace, Consolas, monospace";
  ctx.textAlign = "left";
  f.weapons.forEach((w, slot) => {
    const y = height - 62 - (f.weapons.length - 1 - slot) * 18;
    const active = slot === f.loadout.slot;
    ctx.fillStyle = DAMAGE_COLORS[w.stats.damageType];
    ctx.fillRect(12, y - 9, 8, 8);
    ctx.fillStyle = active ? UI.text : UI.muted;
    ctx.fillText(`${active ? ">" : " "} [${slot + 1}] ${w.stats.name.padEnd(19)} ${w.status}`, 26, y);
  });
  if (f.back) {
    ctx.fillStyle = UI.defense;
    ctx.fillRect(12, height - 53, 8, 8);
    ctx.fillStyle = UI.text;
    ctx.fillText(`  [RMB] ${f.back.name.padEnd(17)} ${f.back.status}`, 26, height - 44);
  }
}
