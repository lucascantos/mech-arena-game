/** The view size is a game rule (sim/vision.ts); re-exported for the renderer. */
export { VIEW_ASPECT, VIEW_HEIGHT, VIEW_WIDTH } from "../sim/vision";

/** A rectangle in screen (CSS) pixels. */
export interface ScreenRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
