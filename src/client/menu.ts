import type { ModeId } from "../modes/session";

const MODES: { id: ModeId; title: string; detail: string }[] = [
  { id: "ffa", title: "8P FFA", detail: "Free-for-all against 7 random mechs" },
  { id: "duel", title: "Duel", detail: "One on one against a random mech" },
  { id: "training", title: "Training Ground", detail: "Practice on dummies that stand, strafe or shoot" },
];

/** The start menu: an HTML overlay with one button per mode. */
export class Menu {
  private readonly root: HTMLElement;

  constructor(onPick: (mode: ModeId) => void) {
    this.root = document.createElement("div");
    this.root.className = "menu";
    const title = document.createElement("h1");
    title.textContent = "MECH ARENA";
    this.root.append(title);
    for (const mode of MODES) {
      const button = document.createElement("button");
      button.innerHTML = `<span class="menu-title">${mode.title}</span><span class="menu-detail">${mode.detail}</span>`;
      button.addEventListener("click", () => onPick(mode.id));
      this.root.append(button);
    }
    const hint = document.createElement("p");
    hint.className = "menu-hint";
    hint.textContent = "Esc returns to this menu";
    this.root.append(hint);
    document.body.append(this.root);
  }

  get visible(): boolean {
    return !this.root.hidden;
  }

  show(): void {
    this.root.hidden = false;
    this.root.querySelector("button")?.focus();
  }

  hide(): void {
    this.root.hidden = true;
  }
}
