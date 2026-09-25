import type { Fighter } from "../sim/fighter";
import type { Vec2 } from "../sim/vec";
import type { World } from "../sim/world";
import type { Camera } from "./camera";
import type { Radar } from "./radar";
import { UI } from "./palette";

const WIDTH = 180;
const MARGIN = 12;
/** Below the score row. */
const TOP = 44;

/**
 * Corner minimap: the whole arena with every other fighter at its last radar
 * ping (updated once per second, fading as it goes stale; the dead dimmed),
 * plus the camera's view rectangle and you in white, both live.
 */
export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  world: World,
  radar: Radar,
  camera: Camera,
  focus: Fighter,
  screenW: number,
): void {
  const scale = WIDTH / world.width;
  const h = world.height * scale;
  const x0 = screenW - WIDTH - MARGIN;
  const y0 = TOP;
  const toMap = (p: Vec2) => ({ x: x0 + p.x * scale, y: y0 + p.y * scale });

  ctx.globalAlpha = 0.8;
  ctx.fillStyle = UI.background;
  ctx.fillRect(x0, y0, WIDTH, h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = UI.wall;
  ctx.lineWidth = 1;
  ctx.strokeRect(x0, y0, WIDTH, h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, WIDTH, h);
  ctx.clip();

  // Cover, faintly, and the circular wall (red while a battle royale zone closes in).
  ctx.fillStyle = UI.minimapObstacle;
  for (const { shape: o } of world.obstacles) {
    const c = toMap(o);
    if (o.kind === "box") ctx.fillRect(c.x - (o.w * scale) / 2, c.y - (o.h * scale) / 2, o.w * scale, o.h * scale);
    else ctx.fillRect(c.x - o.r * scale, c.y - o.r * scale, 2 * o.r * scale, 2 * o.r * scale);
  }
  const wall = world.arena;
  const center = toMap(wall);
  ctx.strokeStyle = wall.r < world.map.radius - 0.5 ? UI.zoneWall : UI.wall;
  ctx.beginPath();
  ctx.arc(center.x, center.y, wall.r * scale, 0, Math.PI * 2);
  ctx.stroke();

  // What the camera currently shows.
  const [topLeft, bottomRight] = camera.visibleWorld();
  const a = toMap(topLeft);
  const b = toMap(bottomRight);
  ctx.strokeStyle = UI.muted;
  ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);

  for (const c of radar.contacts) {
    const p = toMap(c.pos);
    ctx.globalAlpha = c.alive ? radar.fade : 0.2;
    ctx.fillStyle = c.color;
    ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
  }
  ctx.globalAlpha = 1;

  const me = toMap(focus.pos);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(me.x - 3, me.y - 3, 6, 6);
  ctx.restore();
}
