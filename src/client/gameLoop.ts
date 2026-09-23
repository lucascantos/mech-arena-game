import { DT } from "../sim/constants";

/** Longest frame we'll try to catch up on (avoids a spiral after a tab switch). */
const MAX_FRAME = 0.25;

/**
 * Fixed-timestep loop: the sim ticks at exactly DT, rendering happens every
 * animation frame with an interpolation factor between the last two ticks.
 */
export function startGameLoop(tick: () => void, render: (alpha: number, fps: number) => void): void {
  let last = performance.now() / 1000;
  let accumulator = 0;
  let fps = 60;

  const frame = (nowMs: number) => {
    const now = nowMs / 1000;
    const elapsed = Math.min(now - last, MAX_FRAME);
    last = now;
    if (elapsed > 0) fps = fps * 0.9 + (1 / elapsed) * 0.1;

    accumulator += elapsed;
    while (accumulator >= DT) {
      tick();
      accumulator -= DT;
    }
    render(accumulator / DT, fps);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
