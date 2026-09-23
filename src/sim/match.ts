import { secondsToTicks } from "./constants";
import type { World } from "./world";

/** Pause between a round ending and the next one starting. */
const ROUND_END_DELAY = secondsToTicks(2);
/** Countdown before every round, while everyone is held at their spawn. */
export const COUNTDOWN_TICKS = secondsToTicks(3);

/**
 * Round flow on top of the World: every round opens with a 3s countdown
 * (aim only, no moving or shooting); when only one team is left standing, it
 * scores, and after a short pause everyone respawns for the next countdown.
 */
export class Match {
  /** Rounds won, by team. */
  readonly scores = new Map<number, number>();
  /** Ticks until the next round starts, or -1 while a round is in progress. */
  private resetIn = -1;
  lastWinner: number | null = null;
  /** Rounds started so far (0 = the first round). Decides who spawns where. */
  round = 0;
  /** Ticks left in the pre-round countdown; 0 while fighting. */
  countdownLeft = COUNTDOWN_TICKS;
  /** Ticks since the fight started (for the "FIGHT!" banner). */
  fightTicks = 0;

  constructor(private readonly world: World) {
    for (const f of world.fighters) this.scores.set(f.team, 0);
    world.inputLocked = true;
  }

  get inCountdown(): boolean {
    return this.countdownLeft > 0;
  }

  get roundOver(): boolean {
    return this.resetIn >= 0;
  }

  /** Call once after every world.step(). */
  update(): void {
    if (this.countdownLeft > 0) {
      if (--this.countdownLeft === 0) this.world.inputLocked = false;
      return;
    }
    this.fightTicks++;
    if (this.resetIn > 0) {
      this.resetIn--;
      return;
    }
    if (this.resetIn === 0) {
      this.resetIn = -1;
      this.world.resetRound(++this.round);
      this.world.emit({ kind: "roundStart" });
      this.countdownLeft = COUNTDOWN_TICKS;
      this.fightTicks = 0;
      this.world.inputLocked = true;
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
