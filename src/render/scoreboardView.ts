import type { Match } from "../sim/match";
import type { Fighter } from "../sim/fighter";
import { accuracy, type FighterRecord, type Scoreboard } from "../sim/scoreboard";
import type { World } from "../sim/world";
import { UI } from "./palette";

/** In battle: only kills, deaths and K/D. Between rounds: everything. */
export type ScoreboardMode = "compact" | "full";

interface Column {
  title: string;
  /** Width as a fraction of the table. */
  width: number;
  cell: (row: Row) => string;
}
interface Row {
  f: Fighter;
  r: FighterRecord;
  wins: number;
}

/** Kills per death; with no deaths it's just the kill count (the usual convention). */
const kd = (r: FighterRecord) => (r.kills / Math.max(1, r.deaths)).toFixed(2);

const NAME: Column = { title: "Fighter", width: 0.28, cell: (x) => x.f.name };
const COMPACT: Column[] = [
  { ...NAME, width: 0.46 },
  { title: "K", width: 0.18, cell: (x) => String(x.r.kills) },
  { title: "D", width: 0.18, cell: (x) => String(x.r.deaths) },
  { title: "K/D", width: 0.18, cell: (x) => kd(x.r) },
];
const FULL: Column[] = [
  NAME,
  { title: "Wins", width: 0.08, cell: (x) => String(x.wins) },
  { title: "K", width: 0.07, cell: (x) => String(x.r.kills) },
  { title: "D", width: 0.07, cell: (x) => String(x.r.deaths) },
  { title: "Dmg dealt", width: 0.14, cell: (x) => String(Math.round(x.r.damageDealt)) },
  { title: "Dmg taken", width: 0.14, cell: (x) => String(Math.round(x.r.damageTaken)) },
  { title: "Shots", width: 0.11, cell: (x) => String(x.r.shotsFired) },
  { title: "Acc", width: 0.11, cell: (x) => { const a = accuracy(x.r); return a === null ? "-" : `${Math.round(a * 100)}%`; } },
];
const ROW = 26;

/**
 * Centered table of match stats. "compact" (while fighting) shows only kills,
 * deaths and K/D, sorted by kills; "full" (between rounds) adds wins, damage,
 * shots and accuracy, sorted by wins, then kills, then damage dealt.
 */
export function drawScoreboard(
  ctx: CanvasRenderingContext2D,
  world: World,
  match: Match,
  board: Scoreboard,
  width: number,
  height: number,
  mode: ScoreboardMode,
): void {
  const columns = mode === "full" ? FULL : COMPACT;
  const rows: Row[] = world.fighters
    .map((f) => ({ f, r: board.get(f.id), wins: match.scores.get(f.team) ?? 0 }))
    .sort((a, b) =>
      mode === "full"
        ? b.wins - a.wins || b.r.kills - a.r.kills || b.r.damageDealt - a.r.damageDealt
        : b.r.kills - a.r.kills || a.r.deaths - b.r.deaths,
    );

  const tableW = Math.min(mode === "full" ? 720 : 420, width - 32);
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
      const colW = columns[i].width * tableW;
      ctx.fillText(cell, i === 0 ? x : x + colW - 4, y);
      x += colW;
    });
  };

  ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
  drawRow(columns.map((c) => c.title), y0 + 8, [UI.muted]);

  ctx.font = `${fontSize}px ui-monospace, Consolas, monospace`;
  rows.forEach((row, i) => {
    drawRow(columns.map((c) => c.cell(row)), y0 + 8 + ROW * (i + 1), [row.f.color, UI.text]);
  });
}
