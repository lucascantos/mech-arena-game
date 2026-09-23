import { KeyboardController } from "./client/keyboardController";
import { startGameLoop } from "./client/gameLoop";
import { Menu } from "./client/menu";
import { Session, type ModeId } from "./modes/session";
import { findPreset, type MechPreset } from "./presets/presets";
import { Renderer } from "./render/renderer";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const keyboard = new KeyboardController(canvas, renderer.camera);

/** The running game, or null while the menu is open. */
let session: Session | null = null;
let showScoreboard = false;

function start(next: Session): void {
  session = next;
  renderer.reset();
  keyboard.clearQueued();
  menu.hide();
  (document.activeElement as HTMLElement | null)?.blur(); // so Enter/Space can't re-press the menu button
}

function backToMenu(): void {
  session = null;
  renderer.reset();
  menu.show();
}

const menu = new Menu((mode: ModeId) => start(Session.start(mode)));

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
  if (e.code === "Tab") {
    e.preventDefault(); // hold Tab for the scoreboard; keep the browser from moving focus
    showScoreboard = true;
    return;
  }
  if (!session || e.repeat) return;
  if (e.code === "Escape") backToMenu();
  else if (e.code === "KeyQ") session.lockOn.toggle();
  else if (e.code === "KeyV") renderer.camera.mode = renderer.camera.mode === "follow" ? "overview" : "follow";
  else if (e.code === "KeyP") {
    keyboard.clearQueued();
    session.togglePossess();
  }
});

startGameLoop(
  () => {
    if (!session) return;
    session.tick(keyboard, renderer.camera);
    renderer.effects.ingest(session.world.events);
  },
  (alpha, fps) => {
    if (!session) return;
    const { world, match, spectator, scoreboard, lockOn } = session;
    const possessed = session.possessed;
    const following = spectator.following(world) ?? session.you;
    const hud = { possessed, following, killer: spectator.killerOfHome, scoreboard, showScoreboard, lockOnEnabled: lockOn.enabled, fps };
    // Cursor lean and lock-on only while you're driving a living mech; spectating just follows.
    const driving = !!possessed?.alive && following === possessed;
    const view = { focus: following, cursor: driving ? keyboard.cursor : null, lock: driving ? lockOn : null };
    renderer.render(world, match, alpha, hud, view);
  },
);
