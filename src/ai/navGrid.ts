import { insideArena } from "../sim/arena";
import { shapeNear, type Obstacle } from "../sim/obstacles";
import type { Vec2 } from "../sim/vec";
import type { World } from "../sim/world";

/** Grid cell size in world units. */
const CELL = 40;
/** Cells this close to an obstacle or the wall count as blocked (about a mech's half size plus a margin). */
const CLEARANCE = 38;
const DIAGONAL = Math.SQRT2;

/**
 * A coarse walkability grid of the map, for bots to find their way around
 * cover. Built once per world (and again if its obstacles change).
 */
export class NavGrid {
  private readonly cols: number;
  private readonly rows: number;
  private readonly blocked: Uint8Array;

  constructor(world: World, readonly obstacles: readonly Obstacle[]) {
    this.cols = Math.ceil(world.width / CELL);
    this.rows = Math.ceil(world.height / CELL);
    this.blocked = new Uint8Array(this.cols * this.rows);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const p = this.center(r * this.cols + c);
        const wall = !insideArena(world.fullArena(), p, CLEARANCE);
        if (wall || obstacles.some((o) => shapeNear(o.shape, p, CLEARANCE))) this.blocked[r * this.cols + c] = 1;
      }
    }
  }

  /** Waypoints (cell centers) from `from` to `to` around obstacles, or [] when there's no way. */
  path(from: Vec2, to: Vec2): Vec2[] {
    const start = this.nearestFree(this.cellOf(from));
    const goal = this.nearestFree(this.cellOf(to));
    if (start < 0 || goal < 0) return [];
    const n = this.cols * this.rows;
    const cost = new Float32Array(n).fill(Infinity);
    const came = new Int32Array(n).fill(-1);
    const open = new MinHeap();
    cost[start] = 0;
    open.push(start, 0);
    while (open.size > 0) {
      const cur = open.pop();
      if (cur === goal) break;
      const [cc, cr] = [cur % this.cols, Math.floor(cur / this.cols)];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const [nc, nr] = [cc + dc, cr + dr];
          if (nc < 0 || nr < 0 || nc >= this.cols || nr >= this.rows) continue;
          const next = nr * this.cols + nc;
          if (this.blocked[next]) continue;
          // No cutting corners past a blocked cell.
          if (dr && dc && (this.blocked[cr * this.cols + nc] || this.blocked[nr * this.cols + cc])) continue;
          const g = cost[cur] + (dr && dc ? DIAGONAL : 1);
          if (g >= cost[next]) continue;
          cost[next] = g;
          came[next] = cur;
          open.push(next, g + this.distance(next, goal));
        }
      }
    }
    if (came[goal] < 0 && goal !== start) return [];
    const cells: number[] = [];
    for (let c = goal; c !== start && c >= 0; c = came[c]) cells.push(c);
    return cells.reverse().map((c) => this.center(c));
  }

  private cellOf(p: Vec2): number {
    const c = Math.max(0, Math.min(this.cols - 1, Math.floor(p.x / CELL)));
    const r = Math.max(0, Math.min(this.rows - 1, Math.floor(p.y / CELL)));
    return r * this.cols + c;
  }

  private center(cell: number): Vec2 {
    return { x: ((cell % this.cols) + 0.5) * CELL, y: (Math.floor(cell / this.cols) + 0.5) * CELL };
  }

  private distance(a: number, b: number): number {
    const dx = Math.abs((a % this.cols) - (b % this.cols));
    const dy = Math.abs(Math.floor(a / this.cols) - Math.floor(b / this.cols));
    return Math.max(dx, dy) + (DIAGONAL - 1) * Math.min(dx, dy);
  }

  /** The cell itself if free, else the closest free cell (searching outward), or -1. */
  private nearestFree(cell: number): number {
    if (!this.blocked[cell]) return cell;
    const [c0, r0] = [cell % this.cols, Math.floor(cell / this.cols)];
    for (let ring = 1; ring < 8; ring++) {
      for (let dr = -ring; dr <= ring; dr++) {
        for (let dc = -ring; dc <= ring; dc++) {
          if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
          const [c, r] = [c0 + dc, r0 + dr];
          if (c >= 0 && r >= 0 && c < this.cols && r < this.rows && !this.blocked[r * this.cols + c]) return r * this.cols + c;
        }
      }
    }
    return -1;
  }
}

const grids = new WeakMap<World, NavGrid>();

/** The world's grid, built on first use (after spawn points cleared their cover). */
export function navGridOf(world: World): NavGrid {
  let g = grids.get(world);
  if (!g || g.obstacles !== world.obstacles) grids.set(world, (g = new NavGrid(world, world.obstacles)));
  return g;
}

/** Smallest-priority-first queue of cell indices (binary heap). */
class MinHeap {
  private readonly items: number[] = [];
  private readonly prio: number[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: number, p: number): void {
    let i = this.items.length;
    this.items.push(item);
    this.prio.push(p);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.prio[parent] <= p) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop(): number {
    const top = this.items[0];
    const lastItem = this.items.pop()!;
    const lastPrio = this.prio.pop()!;
    if (this.items.length > 0) {
      this.items[0] = lastItem;
      this.prio[0] = lastPrio;
      let i = 0;
      for (;;) {
        const [l, r] = [2 * i + 1, 2 * i + 2];
        let m = i;
        if (l < this.items.length && this.prio[l] < this.prio[m]) m = l;
        if (r < this.items.length && this.prio[r] < this.prio[m]) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    [this.items[a], this.items[b]] = [this.items[b], this.items[a]];
    [this.prio[a], this.prio[b]] = [this.prio[b], this.prio[a]];
  }
}
