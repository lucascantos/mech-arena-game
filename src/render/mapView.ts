import type { DecorLook } from "../maps/gameMap";
import type { ObstacleLook, Shape } from "../sim/obstacles";
import type { World } from "../sim/world";
import { UI } from "./palette";

const GRID = 50;

/** Fill and outline per obstacle kind (plain boxes and circles until there's art). */
const OBSTACLE_COLORS: Record<ObstacleLook, [fill: string, edge: string]> = {
  building: ["#2d333b", "#454d58"],
  car: ["#5a2e2a", "#8a4a42"],
  barrier: ["#6e7681", "#9aa4af"],
  tree: ["#2f5d34", "#3f7a45"],
  hedge: ["#28502c", "#35683a"],
  rock: ["#6b5a45", "#86725a"],
  ice: ["#9fc3d9", "#d4e8f5"],
  pillar: ["#8a7a60", "#a8977a"],
  wall: ["#7a6a50", "#96856a"],
  statue: ["#b09a70", "#d0b98a"],
};

const DECOR_COLORS: Record<DecorLook, string> = {
  grass: "#1f3322",
  road: "#131619",
  lane: "#8a7430",
  pond: "#1d3b55",
  dune: "#43372a",
  crack: "#5d7a90",
  plaza: "#23282f",
  ring: "#4a4030",
};

/**
 * The map: what's outside the wall (sea, sand, stands...), the circular
 * floor with its grid and ground detail, the obstacles, and the wall (red
 * while a battle royale zone is closing in).
 */
export function drawMap(ctx: CanvasRenderingContext2D, world: World): void {
  const { theme } = world.map;
  const a = world.arena;
  const full = world.fullArena();
  ctx.fillStyle = theme.outside;
  ctx.fillRect(-world.width, -world.height, world.width * 3, world.height * 3);

  ctx.save();
  ctx.beginPath();
  ctx.arc(full.x, full.y, full.r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = theme.floor;
  ctx.fillRect(0, 0, world.width, world.height);
  for (const d of world.map.decor) {
    ctx.fillStyle = DECOR_COLORS[d.look];
    if (d.look === "ring") {
      ctx.strokeStyle = DECOR_COLORS.ring;
      ctx.lineWidth = 3;
      strokeShape(ctx, d.shape);
    } else fillShape(ctx, d.shape);
  }
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = GRID; x < world.width; x += GRID) (ctx.moveTo(x, 0), ctx.lineTo(x, world.height));
  for (let y = GRID; y < world.height; y += GRID) (ctx.moveTo(0, y), ctx.lineTo(world.width, y));
  ctx.stroke();
  ctx.restore();

  // Destroyed cover: rubble (buildings) or a scorch mark (cars), flat and dashed.
  for (const o of world.destroyed) {
    ctx.fillStyle = o.look === "car" ? UI.scorch : UI.rubble;
    ctx.strokeStyle = OBSTACLE_COLORS[o.look][1];
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    fillShape(ctx, o.shape);
    strokeShape(ctx, o.shape);
    ctx.setLineDash([]);
  }

  for (const o of world.obstacles) {
    const [fill, edge] = OBSTACLE_COLORS[o.look];
    ctx.fillStyle = fill;
    ctx.strokeStyle = edge;
    ctx.lineWidth = 2;
    fillShape(ctx, o.shape);
    // Damaged cover darkens as it wears down.
    const max = o.durability?.hp;
    if (max && o.hp !== undefined && o.hp < max) {
      ctx.fillStyle = `rgba(0, 0, 0, ${(0.55 * (1 - o.hp / max)).toFixed(2)})`;
      fillShape(ctx, o.shape);
    }
    strokeShape(ctx, o.shape);
  }

  // A closing battle royale wall: dim everything beyond it.
  const closing = a.r < full.r - 0.5;
  if (closing) {
    ctx.fillStyle = UI.outside;
    ctx.beginPath();
    ctx.arc(full.x, full.y, full.r + 2, 0, Math.PI * 2);
    ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2, true);
    ctx.fill();
  }
  ctx.strokeStyle = closing ? UI.zoneWall : theme.wall;
  ctx.lineWidth = closing ? 6 : 5;
  ctx.beginPath();
  ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
  ctx.stroke();
}

function fillShape(ctx: CanvasRenderingContext2D, s: Shape): void {
  if (s.kind === "box") return ctx.fillRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h);
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
  ctx.fill();
}

function strokeShape(ctx: CanvasRenderingContext2D, s: Shape): void {
  if (s.kind === "box") return ctx.strokeRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h);
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
  ctx.stroke();
}
