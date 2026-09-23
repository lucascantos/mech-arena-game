import type { Match } from "../sim/match";
import { accuracy, type Scoreboard } from "../sim/scoreboard";
import type { World } from "../sim/world";
import { UI } from "./palette";

const COLUMNS = ["Fighter", "Wins", "K", "D", "Dmg dealt", "Dmg taken", "Shots", "Acc"];
/** Column widths as fractions of the table width. */
const WIDTHS = [0.28, 0.08, 0.07, 0.07, 0.14, 0.14, 0.11, 0.11];
const ROW = 26;

/** Centered table of match stats, sorted by wins, then kills, then damage dealt. */
export function drawScoreboard(
  ctx: CanvasRenderingContext2D,
  world: World,
  match: Match,
  board: Scoreboard,
  width: number,
  height: number,
): void {
  const rows = world.fighters
    .map((f) => ({ f, r: board.get(f.id), wins: match.scores.get(f.team) ?? 0 }))
    .sort((a, b) => b.wins - a.wins || b.r.kills - a.r.kills || b.r.damageDealt - a.r.damageDealt);

  const tableW = Math.min(720, width - 32);
  const tableH = ROW * (rows.length + 1) + 24;
  const x0 = (width - tableW) / 2;
  const y0 = Math.max(80, (height - tableH) / 2);

  ctx.globalAlpha = 0.9;
  ctx.fillStyle = UI.background;
  ctx.fillRect(x0 - 12, y0 - 12, tableW + 24, tableH);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = UI.wall;
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 - 12, y0 - 12, tableW + 24, tableH);

  const fontSize = tableW < 520 ? 11 : 13;
  const drawRow = (cells: string[], y: number, colors: string[]) => {
    let x = x0;
    cells.forEach((cell, i) => {
      ctx.textAlign = i === 0 ? "left" : "right";
      ctx.fillStyle = colors[i] ?? colors[colors.length - 1];
      const colW = WIDTHS[i] * tableW;
      ctx.fillText(cell, i === 0 ? x : x + colW - 4, y);
      x += colW;
    });
  };

  ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
  drawRow(COLUMNS, y0 + 8, [UI.muted]);

  ctx.font = `${fontSize}px ui-monospace, Consolas, monospace`;
  rows.forEach(({ f, r, wins }, i) => {
    const acc = accuracy(r);
    const cells = [
      f.name,
      String(wins),
      String(r.kills),
      String(r.deaths),
      String(Math.round(r.damageDealt)),
      String(Math.round(r.damageTaken)),
      String(r.shotsFired),
      acc === null ? "-" : `${Math.round(acc * 100)}%`,
    ];
    drawRow(cells, y0 + 8 + ROW * (i + 1), [f.color, UI.text]);
  });
}
