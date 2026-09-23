/**
 * Which spawn point each fighter uses in a given round, so fighters start
 * next to different opponents every round. The spawn points never move; only
 * who stands where changes, on a fixed (not random) schedule.
 *
 * It's the round-robin "circle method" from tournament scheduling: fighter 0
 * stays put, everyone else rotates one step per round, and partners (who get
 * neighboring spawn points) are read off the circle. Over `slots - 1` rounds
 * every fighter is partnered with every other one exactly once.
 *
 * @returns spot index for each fighter, in `[0, spawnSlots(count))`.
 */
export function spawnAssignment(count: number, round: number): number[] {
  const n = spawnSlots(count);
  if (n < 2) return [0];
  const r = round % (n - 1);
  const others = Array.from({ length: n - 1 }, (_, i) => i + 1);
  const rotated = [...others.slice(n - 1 - r), ...others.slice(0, n - 1 - r)];
  const circle = [0, ...rotated];
  const spots = new Array<number>(n);
  for (let i = 0; i < n / 2; i++) {
    spots[circle[i]] = 2 * i;
    spots[circle[n - 1 - i]] = 2 * i + 1;
  }
  return spots.slice(0, count); // with an odd count, the extra "bye" slot stays empty
}

/** Number of spawn points needed: the fighter count rounded up to even. */
export function spawnSlots(count: number): number {
  return count % 2 === 0 ? count : count + 1;
}
