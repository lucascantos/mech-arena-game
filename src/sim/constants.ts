/** Simulation ticks per second. The sim always advances in fixed steps. */
export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;

/** Converts seconds to a whole number of ticks. Timers in the sim are counted in ticks. */
export const secondsToTicks = (s: number): number => Math.round(s * TICK_RATE);

/** Damage multiplier on a critical hit. */
export const CRIT_MULTIPLIER = 1.5;

/** Arena size in world units (1 unit = 1 pixel at zoom 1). */
export const ARENA_WIDTH = 2400;
export const ARENA_HEIGHT = 1600;
