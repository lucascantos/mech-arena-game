/**
 * The area of the arena a player sees in follow mode, in world units. It is
 * the same for everyone: screen size and shape only change how big it is
 * drawn. A window with a different shape gets empty bars (letterboxing)
 * instead of seeing more.
 */
/** Shape of the view: a 14" MacBook Pro screen (1512 × 982 "looks like" resolution). */
export const VIEW_ASPECT = 1512 / 982;
export const VIEW_HEIGHT = 600;
export const VIEW_WIDTH = VIEW_HEIGHT * VIEW_ASPECT;

/** A rectangle in screen (CSS) pixels. */
export interface ScreenRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
