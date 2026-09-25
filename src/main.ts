import { KeyboardController } from "./client/keyboardController";
import { startGameLoop } from "./client/gameLoop";
import { loadBuild, saveBuild } from "./client/buildStore";
import { HangarView } from "./client/hangar/hangarView";
import { Menu } from "./client/menu";
import type { Game } from "./modes/game";
import { Session } from "./modes/session";
import { ClientSession } from "./net/clientSession";
import { HostLobby } from "./net/hostSession";
import type { Link } from "./net/link";
import { hostRoom, joinRoom, type JoinFailure } from "./net/peerLink";
import type { HostMessage } from "./net/protocol";
import { toPreset, type Build } from "./presets/build";
import { findPreset, type MechPreset } from "./presets/presets";
import { Renderer } from "./render/renderer";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const keyboard = new KeyboardController(canvas, renderer.camera);

const JOIN_ERRORS: Record<JoinFailure, string> = {
  "no-room": "No room with that code. Check it, and that the host still has the Host screen open.",
  network: "Found the room, but your networks blocked the connection (strict router or firewall).",
  timeout: "The host didn't answer in time. Their network may be blocking connections.",
  broker: "Couldn't reach the matchmaking service. Check your internet connection.",
};

/** The running game, or null while the menu is open. */
let game: Game | null = null;
/** An open room waiting for players (host), or a connection waiting for the host to start (joiner). */
let lobby: HostLobby | null = null;
let pendingLink: Link | null = null;
let showScoreboard = false;

function start(next: Game): void {
  game = next;
  renderer.reset();
  keyboard.clearQueued();
  menu.hide();
  (document.activeElement as HTMLElement | null)?.blur(); // so Enter/Space can't re-press a menu button
  keyboard.capture(canvas); // FPS camera: lock the mouse now, while the menu click still counts as permission
}

function backToMenu(status = ""): void {
  if (document.pointerLockElement) document.exitPointerLock(); // give the mouse back to the menu
  game?.close();
  game = null;
  renderer.reset();
  menu.setStatus(status);
  menu.show();
}

function leaveOnline(): void {
  lobby?.close();
  pendingLink?.close();
  lobby = pendingLink = null;
  menu.setStatus("");
}

let build = loadBuild();

const menu = new Menu({
  play: (mode, map) => start(Session.start(mode, toPreset(build), map)),
  mountHangar: (parent, done) => {
    const save = (b: Build) => ((build = b), saveBuild(b));
    new HangarView(build, save, done).mount(parent);
  },
  buildName: () => build.name,
  host: () => {
    menu.setStatus("Creating a room…");
    hostRoom()
      .then((room) => {
        lobby = new HostLobby(room);
        lobby.onChange = (players) => menu.setRoom(room.code, players);
        menu.setRoom(room.code, 1);
        menu.setStatus("Share the code; press Start when everyone is in.");
      })
      .catch((err) => menu.setStatus(`Couldn't create a room (${err?.type ?? err}).`));
  },
  startHosted: () => {
    if (!lobby) return;
    start(lobby.start());
    lobby = null;
  },
  join: (code) => {
    if (code.trim().length !== 5) return menu.setStatus("Room codes have 5 characters.");
    menu.setStatus("Connecting…");
    joinRoom(code)
      .then((link) => {
        pendingLink = link;
        menu.setStatus("Connected. Waiting for the host to start…");
        link.onMessage((raw) => {
          const m = raw as HostMessage;
          if (m.t === "lobby") menu.setStatus(`Connected (${m.players} players). Waiting for the host to start…`);
          else if (m.t === "start" && pendingLink === link) {
            pendingLink = null;
            start(new ClientSession(link, m.lineup, m.you, m.map));
          }
        });
        link.onClose(() => pendingLink === link && menu.setStatus("The host closed the room."));
      })
      .catch((why: JoinFailure) => menu.setStatus(JOIN_ERRORS[why] ?? JOIN_ERRORS.network));
  },
  leaveOnline,
});

// Testing shortcut: ?bots=brawler,artillery,... skips the menu and spectates that lineup (ids in presets.ts).
const ids = new URLSearchParams(location.search).get("bots")?.split(",");
const presets = (ids ?? []).map((id) => findPreset(id.trim())).filter((p): p is MechPreset => !!p);
if (presets.length >= 2) start(Session.lineup(presets, true));
else menu.show();

window.addEventListener("keyup", (e) => {
  if (e.code === "Tab") showScoreboard = false;
});
window.addEventListener("blur", () => (showScoreboard = false));
window.addEventListener("keydown", (e) => {
  if (e.code === "Escape" && !game && menu.back()) return; // Esc inside a menu sub-screen goes back
  if (e.code === "Tab") {
    e.preventDefault(); // hold Tab for the scoreboard; keep the browser from moving focus
    showScoreboard = true;
    return;
  }
  if (!game || e.repeat) return;
  if (e.code === "Escape") backToMenu();
  else if (e.code === "KeyQ") game.lockOn.toggle();
  else if (e.code === "KeyV") renderer.camera.mode = renderer.camera.mode === "follow" ? "overview" : "follow";
  else if (e.code === "KeyC") keyboard.setRotating(!keyboard.rotating, canvas); // classic ↔ rotating (FPS-style) camera
  else if (e.code === "KeyP") {
    keyboard.clearQueued();
    game.togglePossess();
  }
});

startGameLoop(
  () => {
    if (!game) return;
    game.tick(keyboard, renderer.camera);
    renderer.effects.ingest(game.world.events);
    if (game instanceof ClientSession && game.hostLeft) backToMenu("The host left the match.");
  },
  (alpha, fps) => {
    if (!game) return;
    const { world, match, spectator, scoreboard, lockOn, possessed, banner } = game;
    const following = spectator.following(world) ?? game.you;
    const hud = { possessed, following, killer: spectator.killerOfHome, scoreboard, showScoreboard, lockOnEnabled: lockOn.enabled, banner, fps };
    // Cursor lean and lock-on only while you're driving a living mech (and not during the countdown).
    const driving = !!possessed?.alive && following === possessed;
    const locking = driving && !match?.inCountdown;
    const { turn } = keyboard;
    const rotate =
      driving && keyboard.rotating && !Number.isNaN(turn.yaw)
        ? { yaw: turn.yaw, crosshair: keyboard.crosshairOnScreen, captured: keyboard.captured, refused: keyboard.captureRefused }
        : null;
    const view = { focus: following, cursor: driving ? keyboard.cursor : null, lock: locking ? lockOn : null, rotate };
    // Classic camera: while locked on, the drawn crosshair shows the aim, so hide the mouse cursor (the lock ring follows it).
    canvas.style.cursor = keyboard.rotating || (locking && lockOn.targetId !== null) ? "none" : "";
    renderer.render(world, match, game.renderAlpha(alpha), hud, view);
  },
);
