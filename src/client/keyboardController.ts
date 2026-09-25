import type { Controller } from "../sim/controller";
import type { Fighter } from "../sim/fighter";
import type { Input } from "../sim/input";
import type { Vec2 } from "../sim/vec";
import type { Camera } from "../render/camera";

const SLOT_KEYS = ["Digit1", "Digit2", "Digit3", "Digit4"];

/** Turns WASD / Space / mouse / number keys into sim Inputs for one local player. */
export class KeyboardController implements Controller {
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
      this.mouseScreen = { x: e.offsetX, y: e.offsetY };
      this.mouseKnown = true;
    });
    target.addEventListener("mousedown", (e) => {
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

  /** Cursor position in screen (CSS) px, or null before the mouse has moved over the game. */
  get cursor(): Vec2 | null {
    return this.mouseKnown ? { ...this.mouseScreen } : null;
  }

  /** Drops queued taps, e.g. when taking control so old presses don't fire. */
  clearQueued(): void {
    this.dodgeQueued = this.reloadQueued = this.clickQueued = this.rightClickQueued = false;
    this.slotQueued = -1;
    this.wheelSteps = 0;
  }

  readInput(self: Fighter): Input {
    const k = (code: string) => (this.keys.has(code) ? 1 : 0);
    const aim = this.camera.screenToWorld(this.mouseScreen);

    let selectSlot = this.slotQueued;
    if (selectSlot < 0 && this.wheelSteps !== 0 && self.weapons.length > 0) {
      const n = self.weapons.length;
      selectSlot = (((self.loadout.slot + this.wheelSteps) % n) + n) % n;
    }

    const input: Input = {
      moveX: k("KeyD") - k("KeyA"),
      moveY: k("KeyS") - k("KeyW"),
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
