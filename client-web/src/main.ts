/**
 * Entry point. The library (fonts, embedded images) is loaded first, then the
 * converted game code is evaluated and the player starts the document class.
 */
import { renderSettings } from "./flash/_internal";
import { preloadLibrary } from "./player/preload";
import { startPlayer } from "./player/Player";
import { createShell } from "./player/Shell";

// FlashVars come from the page's query string (e.g. ?serverUrl=...&token=...).
const parameters = Object.fromEntries(new URLSearchParams(location.search));
// The page around the game: resizable game window, top bar, settings (src/player/Shell.ts).
const shell = createShell(document.getElementById("game")!, parameters);
const container = shell.container;
// ?gpu=1: GPU-backed canvases (slower for this game in Chrome, see renderSettings)
renderSettings.gpu = parameters.gpu === "1";

async function boot(): Promise<void> {
  await preloadLibrary("./");
  const game = await import("@game");
  const { GAME } = game;
  // Debugging aid: the converted game's classes, e.g. __game.MAP._GROUND.x in the console.
  (window as any).__game = game;
  (window as any).__classByName = (await import("as3")).classByName;
  await import("./game/registry");
  const api = await startPlayer({ container, documentClass: GAME, width: 760, height: 670, frameRate: 40, background: 0xffffff, parameters, url: location.href });
  shell.attach(api);
}

boot().catch((e) => {
  console.error(e);
  container.textContent = "The game failed to start. See the browser console for details.";
});
