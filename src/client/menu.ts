import type { ModeId } from "../modes/session";

interface Item {
  title: string;
  detail: string;
  action: () => void;
}

/**
 * The start menu: an HTML overlay with a main screen (Play, Online, Training
 * Ground) and an Online screen (Host Server, Join Server). Online isn't
 * implemented yet; its options explain that instead of starting anything.
 */
export class Menu {
  private readonly root: HTMLElement;
  private screen: "main" | "online" = "main";

  constructor(private readonly onPick: (mode: ModeId) => void) {
    this.root = document.createElement("div");
    this.root.className = "menu";
    document.body.append(this.root);
    this.render();
  }

  get visible(): boolean {
    return !this.root.hidden;
  }

  show(): void {
    this.screen = "main";
    this.render();
    this.root.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
  }

  /** Esc inside a sub-screen goes back to the main screen; returns whether it did. */
  back(): boolean {
    if (this.screen === "main") return false;
    this.screen = "main";
    this.render();
    return true;
  }

  private render(): void {
    this.root.replaceChildren();
    const title = document.createElement("h1");
    title.textContent = "MECH ARENA";
    this.root.append(title);

    if (this.screen === "main") {
      this.buttons([
        { title: "Play", detail: "8-player free-for-all against random mechs", action: () => this.onPick("ffa") },
        { title: "Online", detail: "Host or join a match with other players", action: () => this.go("online") },
        { title: "Training Ground", detail: "Practice on dummies that stand, strafe or shoot", action: () => this.onPick("training") },
      ]);
      this.hint("Esc returns to this menu");
    } else {
      const note = this.hint("");
      const soon = (what: string) => () => (note.textContent = `${what} isn't available yet: online play is still being built.`);
      this.buttons([
        { title: "Host Server", detail: "Start a match other players can join", action: soon("Hosting") },
        { title: "Join Server", detail: "Connect to a match someone is hosting", action: soon("Joining") },
        { title: "Back", detail: "Return to the main menu", action: () => this.back() },
      ]);
      this.root.insertBefore(note, null);
    }
    this.root.querySelector("button")?.focus();
  }

  private go(screen: "main" | "online"): void {
    this.screen = screen;
    this.render();
  }

  private buttons(items: Item[]): void {
    for (const item of items) {
      const button = document.createElement("button");
      button.innerHTML = `<span class="menu-title">${item.title}</span><span class="menu-detail">${item.detail}</span>`;
      button.addEventListener("click", item.action);
      this.root.append(button);
    }
  }

  private hint(text: string): HTMLElement {
    const p = document.createElement("p");
    p.className = "menu-hint";
    p.textContent = text;
    this.root.append(p);
    return p;
  }
}
