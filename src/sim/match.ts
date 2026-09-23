import { secondsToTicks } from "./constants";
import type { World } from "./world";

/** Pause between a round ending and the next one starting. */
const ROUND_END_DELAY = secondsToTicks(2);

/**
 * Round flow on top of the World: when only one team is left standing, it
 * scores, and after a short pause everyone respawns.
 */
export class Match {
  /** Rounds won, by team. */
  readonly scores = new Map<number, number>();
  /** Ticks until the next round starts, or -1 while a round is in progress. */
  private resetIn = -1;
  lastWinner: number | null = null;

  constructor(private readonly world: World) {
    for (const f of world.fighters) this.scores.set(f.team, 0);
  }

  get roundOver(): boolean {
    return this.resetIn >= 0;
  }

  /** Call once after every world.step(). */
  update(): void {
    if (this.resetIn > 0) {
      this.resetIn--;
      return;
    }
    if (this.resetIn === 0) {
      this.resetIn = -1;
      this.world.resetRound();
      this.world.emit({ kind: "roundStart" });
      return;
    }

    const teamsAlive = new Set(this.world.fighters.filter((f) => f.alive).map((f) => f.team));
    if (teamsAlive.size > 1) return;

    const winner = teamsAlive.size === 1 ? [...teamsAlive][0] : null;
    if (winner !== null) this.scores.set(winner, (this.scores.get(winner) ?? 0) + 1);
    this.lastWinner = winner;
    this.resetIn = ROUND_END_DELAY;
    this.world.emit({ kind: "roundOver", winnerTeam: winner });
  }
}
