import { DT } from "../sim/constants";

/** Longest gap we'll try to catch up on (avoids a spiral after a long stall). */
const MAX_FRAME = 0.25;
/** How often the background clock nudges the simulation (ms). */
const CLOCK_MS = 8;

/**
 * A clock in a Web Worker. Browsers pause animation frames (and throttle
 * timers) in background tabs, but keep delivering worker messages, so the
 * simulation keeps running while the tab is hidden, e.g. when an online host
 * switches to another window.
 */
function backgroundClock(onTick: () => void): void {
  const source = `setInterval(() => postMessage(0), ${CLOCK_MS});`;
  const worker = new Worker(URL.createObjectURL(new Blob([source], { type: "text/javascript" })));
  worker.onmessage = onTick;
}

/**
 * Fixed-timestep loop: the sim ticks at exactly DT, driven by both animation
 * frames and the background clock (whichever comes first); rendering happens
 * every animation frame with an interpolation factor between the last two ticks.
 */
export function startGameLoop(tick: () => void, render: (alpha: number, fps: number) => void): void {
  let last = performance.now() / 1000;
  let accumulator = 0;
  let fps = 60;
  let lastFrame = last;

  const advance = () => {
    const now = performance.now() / 1000;
    accumulator += Math.min(now - last, MAX_FRAME);
    last = now;
    while (accumulator >= DT) {
      tick();
      accumulator -= DT;
    }
  };

  const frame = () => {
    advance();
    const now = performance.now() / 1000;
    if (now > lastFrame) fps = fps * 0.9 + (1 / (now - lastFrame)) * 0.1;
    lastFrame = now;
    render(accumulator / DT, fps);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  backgroundClock(advance);
}
