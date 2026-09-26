import type { Controller } from "../sim/controller";
import type { Fighter } from "../sim/fighter";
import type { Input } from "../sim/input";
import type { Vec2 } from "../sim/vec";
import type { Camera } from "../render/camera";
import { TurnAim } from "./turnAim";

const SLOT_KEYS = ["Digit1", "Digit2", "Digit3", "Digit4"];

/**
 * Turns WASD / Space / mouse / number keys into sim Inputs for one local
 * player. Two schemes: classic (aim at the cursor, WASD moves on the map) and
 * rotating, FPS-style (the mouse turns the view and moves the crosshair
 * ahead; see TurnAim). While a lock-on aims, the mouse moves a separate
 * target cursor instead, for picking the next target.
 */
export class KeyboardController implements Controller {
  /** Rotating-camera controls (see TurnAim). */
  rotating = false;
  readonly turn = new TurnAim();
  /** The browser refused to lock the mouse (some embedded views do): it can leave the game. */
  captureRefused = false;
  /** Rotating mode: a lock-on is steering the aim and the view (see setLockedOn). */
  private lockedOn = false;
  /** Rotating mode: the aim point in the world (where the crosshair is drawn). */
  private crosshair: Vec2 | null = null;
  /** Rotating mode while locked: the target cursor (screen px) the mouse moves to pick the next target. */
  private targetCursor: Vec2 | null = null;
  private readonly keys = new Set<string>();
  private mouseScreen: Vec2 = { x: 0, y: 0 };
  /** False until the mouse first moves over the canvas (its position is unknown before that). */
  private mouseKnown = false;
  private mouseDown = false;
  // One-shot actions are queued on the event and consumed by the next tick, so taps are never lost.
  private dodgeQueued = false;
  private reloadQueued = false;
  /** A click that may have been released before the next tick read it. */
  private clickQueued = false;
  private slotQueued = -1;
  private wheelSteps = 0;
  /** Right button: the back unit. Latched like the left one. */
  private rightDown = false;
  private rightClickQueued = false;

  constructor(target: HTMLElement, private readonly camera: Camera) {
    window.addEventListener("keydown", (e) => {
      if (e.target instanceof HTMLInputElement) return; // typing in a menu field (build name, room code)
      this.keys.add(e.code);
      if (e.code === "Space") e.preventDefault();
      if (e.repeat) return;
      if (e.code === "Space") this.dodgeQueued = true;
      if (e.code === "KeyR") this.reloadQueued = true;
      const slot = SLOT_KEYS.indexOf(e.code);
      if (slot >= 0) this.slotQueued = slot;
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => {
      this.keys.clear();
      this.mouseDown = this.rightDown = false;
    });
    target.addEventListener("mousemove", (e) => {
      // FPS: the mouse turns the view, except while a lock-on is doing the aiming.
      if (this.rotating) {
        // Uncaptured, the system cursor would stop at the screen edge and turning with it: wait for the click that locks it.
        if (!this.captured && !this.captureRefused) return;
        if (this.targetCursor) return this.moveTargetCursor(e.movementX, e.movementY);
        return this.turn.mouse(e.movementX, e.movementY);
      }
      this.mouseScreen = { x: e.offsetX, y: e.offsetY };
      this.mouseKnown = true;
    });
    target.addEventListener("mousedown", (e) => {
      if (this.rotating && !this.captured) {
        const firstTry = !this.captureRefused;
        this.capture(target); // try again on every click: a refusal without a click can succeed with one
        if (firstTry) return; // this click only locks the mouse
      }
      if (e.button === 0) this.mouseDown = this.clickQueued = true;
      if (e.button === 2) this.rightDown = this.rightClickQueued = true;
    });
    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) this.rightDown = false;
    });
    target.addEventListener("wheel", (e) => {
      this.wheelSteps += Math.sign(e.deltaY);
      e.preventDefault();
    }, { passive: false });
    target.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  /**
   * The cursor that picks lock-on targets, in screen (CSS) px: the mouse
   * cursor (classic), the crosshair (rotating), or the target cursor
   * (rotating, while locked). Null before it's known.
   */
  get cursor(): Vec2 | null {
    if (this.rotating) return this.targetCursor ?? this.crosshairOnScreen;
    return this.mouseKnown ? { ...this.mouseScreen } : null;
  }

  /** Rotating mode: where the crosshair is on screen. */
  get crosshairOnScreen(): Vec2 | null {
    return this.crosshair ? this.camera.worldToScreen(this.crosshair) : null;
  }

  /**
   * Called every tick with whether a lock-on is aiming. In rotating mode the
   * view then follows the target (`toTarget`, smoothed, see TurnAim.follow) and the mouse moves a target
   * cursor, starting from the crosshair; when the lock ends, the mouse turns
   * the view again from where the lock left it.
   */
  setLockedOn(locked: boolean, toTarget: Vec2 | null): void {
    if (!this.rotating) return;
    if (locked && toTarget) this.turn.follow(toTarget);
    if (locked && !this.lockedOn) this.targetCursor = this.crosshairOnScreen;
    if (!locked) this.targetCursor = null;
    this.lockedOn = locked;
  }

  private moveTargetCursor(dx: number, dy: number): void {
    const v = this.camera.viewport;
    const c = this.targetCursor!;
    this.targetCursor = {
      x: Math.max(v.x, Math.min(v.x + v.w, c.x + dx)),
      y: Math.max(v.y, Math.min(v.y + v.h, c.y + dy)),
    };
  }

  /** Classic ↔ rotating controls. Rotating locks the mouse to the game (FPS-style) and hides the cursor. */
  setRotating(on: boolean, canvas: HTMLElement): void {
    this.rotating = on;
    this.turn.reset();
    this.crosshair = this.targetCursor = null;
    this.lockedOn = false;
    canvas.style.cursor = on ? "none" : "";
    if (on) this.capture(canvas);
    else if (document.pointerLockElement) document.exitPointerLock();
  }

  /** True while the mouse is locked to the game. */
  get captured(): boolean {
    return document.pointerLockElement !== null;
  }

  /** Locks the mouse to the game (rotating mode); needs a click or key press to be allowed. */
  capture(canvas: HTMLElement): void {
    if (!this.rotating) return;
    if (document.pointerLockElement === canvas) return;
    Promise.resolve(canvas.requestPointerLock())
      .then(() => (this.captureRefused = false))
      .catch(() => (this.captureRefused = true));
  }

  /** Drops queued taps, e.g. when taking control so old presses don't fire. */
  clearQueued(): void {
    this.dodgeQueued = this.reloadQueued = this.clickQueued = this.rightClickQueued = false;
    this.slotQueued = -1;
    this.wheelSteps = 0;
  }

  readInput(self: Fighter): Input {
    const k = (code: string) => (this.keys.has(code) ? 1 : 0);
    let aim = this.camera.screenToWorld(this.mouseScreen);
    let move = { x: k("KeyD") - k("KeyA"), y: k("KeyS") - k("KeyW") };
    if (this.rotating) {
      if (Number.isNaN(this.turn.yaw)) this.turn.sync(self.facing);
      this.turn.viewMultiplier = self.stats.viewMultiplier;
      aim = this.crosshair = this.turn.aimPoint(self.pos);
      move = this.turn.move(k("KeyW") - k("KeyS"), k("KeyD") - k("KeyA"));
    }

    let selectSlot = this.slotQueued;
    if (selectSlot < 0 && this.wheelSteps !== 0 && self.weapons.length > 0) {
      const n = self.weapons.length;
      selectSlot = (((self.loadout.slot + this.wheelSteps) % n) + n) % n;
    }

    const input: Input = {
      moveX: move.x,
      moveY: move.y,
      aimX: aim.x - self.pos.x,
      aimY: aim.y - self.pos.y,
      fire: this.mouseDown || this.clickQueued, // a quick tap between ticks still fires once
      back: this.rightDown || this.rightClickQueued,
      reload: this.reloadQueued,
      selectSlot,
      defend: this.dodgeQueued,
      target: -1, // the lock-on fills this in
    };
    this.clearQueued();
    return input;
  }
}
