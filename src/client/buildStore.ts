import { decodeBuild, encodeBuild, fromPreset, type Build } from "../presets/build";
import { findPreset } from "../presets/presets";

const KEY = "mech-arena.build";

/** Your saved hangar build (this browser only), or a starter one. */
export function loadBuild(): Build {
  try {
    const saved = localStorage.getItem(KEY);
    const build = saved ? decodeBuild(saved) : null;
    if (build) return build;
  } catch {
    // storage blocked (private mode...): fall through to the starter build
  }
  return fromPreset(findPreset("brawler")!, "My Mech");
}

export function saveBuild(build: Build): void {
  try {
    localStorage.setItem(KEY, encodeBuild(build));
  } catch {
    // not saved; the build still works for this visit
  }
}
