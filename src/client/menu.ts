import type { ModeId } from "../modes/session";

interface Item {
  title: string;
  detail: string;
  action: () => void;
}

/** What the menu asks the game to do. */
export interface MenuActions {
  play(mode: ModeId): void;
  /** Open a room others can join. */
  host(): void;
  /** Start the hosted match with whoever joined. */
  startHosted(): void;
  join(code: string): void;
  /** Leave the host/join screens (closes any room or connection). */
  leaveOnline(): void;
}

type Screen = "main" | "online" | "host" | "join";

/**
 * The start menu: an HTML overlay. Main screen: Play, Online, Training
 * Ground. Online: Host Server (shows a room code and who joined) or Join
 * Server (type a code).
 */
export class Menu {
  private readonly root: HTMLElement;
  private screen: Screen = "main";
  private status = "";
  private roomCode = "";
  private players = 1;

  constructor(private readonly actions: MenuActions) {
    this.root = document.createElement("div");
    this.root.className = "menu";
    document.body.append(this.root);
    this.render();
  }

  show(screen: Screen = "main"): void {
    this.screen = screen;
    this.render();
    this.root.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
  }

  /** Esc: one screen back. Returns false on the main screen (nothing to go back to). */
  back(): boolean {
    if (this.screen === "main") return false;
    if (this.screen === "host" || this.screen === "join") this.actions.leaveOnline();
    this.show(this.screen === "online" ? "main" : "online");
    return true;
  }

  /** Host screen: the room's code and how many players are in it (host included). */
  setRoom(code: string, players: number): void {
    [this.roomCode, this.players] = [code, players];
    if (this.screen === "host") this.render();
  }

  setStatus(text: string): void {
    this.status = text;
    const el = this.root.querySelector(".menu-status");
    if (el) el.textContent = text;
  }

  private render(): void {
    this.root.replaceChildren();
    this.el("h1", "MECH ARENA");
    const a = this.actions;
    if (this.screen === "main") {
      this.buttons([
        { title: "Play", detail: "8-player free-for-all against random mechs", action: () => a.play("ffa") },
        { title: "Online", detail: "Host or join a match with other players", action: () => this.show("online") },
        { title: "Training Ground", detail: "Practice on dummies that stand, strafe or shoot", action: () => a.play("training") },
      ]);
      this.el("p", "Esc returns to this menu", "menu-hint");
    } else if (this.screen === "online") {
      this.buttons([
        { title: "Host Server", detail: "Your machine runs the match; friends join with a code", action: () => (this.show("host"), a.host()) },
        { title: "Join Server", detail: "Connect to a match someone is hosting", action: () => this.show("join") },
        { title: "Back", detail: "Return to the main menu", action: () => this.back() },
      ]);
    } else if (this.screen === "host") {
      this.el("p", "Room code", "menu-hint");
      this.el("div", this.roomCode || "…", "menu-code");
      this.el("p", `${this.players} / 8 players (bots fill the rest)`, "menu-detail");
      this.buttons([
        { title: "Start Match", detail: "8-player free-for-all with everyone here", action: () => this.roomCode && a.startHosted() },
        { title: "Back", detail: "Close the room", action: () => this.back() },
      ]);
    } else {
      const input = this.el("input", "", "menu-input") as HTMLInputElement;
      input.placeholder = "ROOM CODE";
      input.maxLength = 5;
      input.addEventListener("keydown", (e) => e.key === "Enter" && a.join(input.value));
      this.buttons([
        { title: "Join", detail: "Connect to that room", action: () => a.join(input.value) },
        { title: "Back", detail: "Return to the online menu", action: () => this.back() },
      ]);
      input.focus();
    }
    this.el("p", this.status, "menu-status");
  }

  private el(tag: string, text: string, className?: string): HTMLElement {
    const e = document.createElement(tag);
    e.textContent = text;
    if (className) e.className = className;
    this.root.append(e);
    return e;
  }

  private buttons(items: Item[]): void {
    for (const item of items) {
      const button = document.createElement("button");
      button.innerHTML = `<span class="menu-title">${item.title}</span><span class="menu-detail">${item.detail}</span>`;
      button.addEventListener("click", item.action);
      this.root.append(button);
    }
  }
}
