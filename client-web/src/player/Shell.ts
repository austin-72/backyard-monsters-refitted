/**
 * The web page around the game: a top bar (title, FPS readout, full screen, settings) and the game
 * window, 760 x 670 by default like the Flash projector, resizable by dragging just outside any of its
 * edges or corners. Settings are kept in the browser (localStorage) and applied to the player.
 */
import { setPageVolume } from "../flash/media/index";
import { runtimeHooks } from "../flash/_runtime";

interface Settings {
  /** (QoL #195) browser notifications while the tab is hidden (the game reads it: IoSocial) */
  browserNotify?: boolean;
  width: number; height: number;
  renderScale: number; hidpi: boolean; maxDensity: number; dynamic: boolean;
  fps: boolean; volume: number; fullRedraw: boolean;
  /** frame interpolation: made-up frames between two of the game's (0 = off; -1 = Auto, QoL #241); (18 October) set
   *  by the frame rate limit now, kept for older saved settings */
  interpolate: number;
  /** (18 October, the user's) the frame rate limit: at most this many drawings a second, 0 = none; 60 unless chosen */
  fpsCap?: number;
  /** (19 October, the user's) what the readout shows: "fps" (drawings a second), "ticks" (the game's own updates a
   *  second, 40), both, or "off"; older settings had only `fps` (on: both) */
  rateShow?: string;
  /** (QoL #242) no glow filters (faster drawing) */
  noGlow?: boolean;
  /** (20 October, the user's) the yard's light, shadows and Halloween cobwebs (IoLighting reads it); false: none (faster) */
  lighting?: boolean;
  /** (21 October, the user's) the yard drawn by the graphics card (Renderer's GL path); false: by the page's canvas */
  gl?: boolean;
  /** QoL #232 (14 October): no sound while the tab is hidden */
  muteHidden: boolean;
  /** (QoL #631) the interface's click sounds; false: none (the game's other effects play on). */
  clicks?: boolean;
  /** (QoL #635) a sound for a mention in chat, a letter, a quest ready; off by default. */
  notifySounds?: boolean;
  /** QoL #20 (15 October): Shiny spent without asking up to this much (0: always asked); the game reads it */
  shinyAskAbove: number;
  /** QoL #229: no shakes, nods or popup zooms: "auto" follows the system's "reduce motion", "on", "off" */
  reduceMotion: string;
  /** QoL #231: the game's music and effects, each 0 to 1 (under Volume, which is the whole page's) */
  musicVolume: number;
  effectsVolume: number;
  /** QoL #222: the Devil's Arcade's on-screen controls (IoTouchPad reads these): the stick on the right, their size, opacity */
  padLeft?: boolean;
  padSize?: number;
  padOpacity?: number;
  /** QoL #227: the interface size, 1, 1.25 or 1.5 (the player scales the stage up as far as the window allows) */
  uiScale?: number;
}
/** (18 October) The frame rate limit chosen (60 unless chosen; 0: none). */
const capOf = (s: Settings): number => (s.fpsCap === undefined || s.fpsCap === null || !Number.isFinite(Number(s.fpsCap)) ? 60 : Math.max(0, Math.min(1000, Number(s.fpsCap) | 0)));
/** (19 October) What the readout shows: "off", "fps", "ticks" or "both". */
const showOf = (s: Settings): string => (s.rateShow === "fps" || s.rateShow === "ticks" || s.rateShow === "both" || s.rateShow === "off" ? s.rateShow : s.fps ? "both" : "off");
const DEFAULTS: Settings = { width: 760, height: 670, renderScale: 1, hidpi: false, maxDensity: 4, dynamic: false, fps: false, volume: 1, fullRedraw: false, interpolate: 0, fpsCap: 60, noGlow: false, muteHidden: true, shinyAskAbove: 0, reduceMotion: "auto", musicVolume: 1, effectsVolume: 1, padLeft: false, padSize: 1, padOpacity: 1, uiScale: 1 };
/** (QoL #234) the game's languages, each in its own words (the file names: server/public/gamestage/assets) */
const LANGUAGES: [string, string][] = [["english", "English"], ["french", "Français"], ["spanish", "Español"], ["portuguese", "Português"]];
/** Phones and tablets: a touch screen and no mouse. */
const TOUCH_ONLY = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches && !matchMedia("(any-pointer: fine)").matches;
const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const STANDALONE = (typeof matchMedia === "function" && matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches) || (navigator as any).standalone === true;
/** Defaults for this device: sharp (2x) on high-density touch screens, where 1x looks blurry. */
function defaultsFor(mobile: boolean): Settings {
  return mobile && (window.devicePixelRatio || 1) >= 2 ? { ...DEFAULTS, hidpi: true, maxDensity: 2 } : { ...DEFAULTS };
}
const KEY = "bymr-web-settings";
const MIN_W = 640, MIN_H = 480, BAR = 44, MARGIN = 12;

function load(mobile: boolean): Settings {
  const d = defaultsFor(mobile);
  try { return { ...d, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return d; }
}
function save(s: Settings): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode: settings last for this visit */ }
}

const CSS = `
/* The Inferno: ember-dark page, a lava-lit bar, fire-coloured accents (9 October: it was plain grey) */
@font-face { font-family: "Groboldov"; src: url("fonts/groboldov.woff") format("woff"); font-display: swap; }
@font-face { font-family: "Pirata One"; src: url("fonts/pirata-one.woff2") format("woff2"); font-display: swap; }
@font-face { font-family: "Alegreya"; src: url("fonts/alegreya.woff2") format("woff2"); font-display: swap; }
@font-face { font-family: "Alegreya"; font-style: italic; src: url("fonts/alegreya-italic.woff2") format("woff2"); font-display: swap; }
@font-face { font-family: "Alegreya"; font-weight: bold; src: url("fonts/alegreya-bold.woff2") format("woff2"); font-display: swap; }
html, body { margin: 0; height: 100%; overflow: hidden; background: #0d0403; font: 13px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; color: #f2dcc8; }
body { background: radial-gradient(ellipse at 50% 120%, rgba(255, 80, 20, .16), transparent 55%), radial-gradient(ellipse at 50% -20%, rgba(120, 20, 6, .35), transparent 60%), #0d0403; }
#game { position: fixed; inset: 0; }
.bw-bar { position: absolute; left: 0; right: 0; top: 0; height: ${BAR}px; display: flex; align-items: center; gap: 8px; padding: 0 12px; box-sizing: border-box;
  background: linear-gradient(#240804, #140403); box-shadow: 0 1px 0 rgba(255, 106, 26, .28), 0 6px 18px rgba(0, 0, 0, .5); }
.bw-title { font: 400 19px/1 "Groboldov", Impact, sans-serif; letter-spacing: .4px; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  background: linear-gradient(#ffe39a, #ff8a2a 60%, #e0401a); -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 1px 0 #2d0602) drop-shadow(0 0 8px rgba(255, 90, 20, .35)); padding: 4px 0; }
.bw-fps { font: 12px ui-monospace, Consolas, monospace; color: #ffb060; min-width: 56px; text-align: right; }
.bw-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #6a2410; background: linear-gradient(#3a1008, #220704); color: #ffc890; cursor: pointer; display: grid; place-items: center; padding: 0; }
.bw-btn:hover { background: linear-gradient(#55180a, #300a05); color: #fff1d8; border-color: #ff7a2a; box-shadow: 0 0 10px rgba(255, 106, 26, .45); }
.bw-area { position: absolute; left: 0; right: 0; top: ${BAR}px; bottom: 0; display: grid; place-items: center; }
.bw-frame { position: relative; box-shadow: 0 0 0 1px #6a2410, 0 0 36px rgba(255, 80, 20, .22), 0 8px 32px rgba(0,0,0,.7); }
.bw-win { position: absolute; inset: 0; background: #0d0403; }
.bw-load { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; color: #ffd8b0;
  background: radial-gradient(ellipse at 50% 60%, rgba(255, 90, 20, .3), transparent 62%), url("inferno-bg.jpg") center / cover, #0d0403; }
.bw-load::after { content: ""; position: absolute; inset: 0; background: radial-gradient(ellipse at center, transparent 30%, rgba(8, 2, 1, .85)); }
.bw-load > div { position: relative; z-index: 1; }
.bw-load b { display: block; font: 400 clamp(26px, 5vw, 44px)/1.05 "Groboldov", Impact, sans-serif;
  background: linear-gradient(#ffe9a0, #ff9a3a 55%, #e0401a); -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 3px 0 #2d0602) drop-shadow(0 0 18px rgba(255, 90, 20, .55)); }
.bw-load span { display: block; margin-top: 10px; font: 400 16px "Groboldov", sans-serif; text-shadow: 0 2px 0 #2d0602; }
.bw-load i { display: block; width: 220px; height: 7px; margin: 18px auto 0; border-radius: 4px; overflow: hidden; background: rgba(40, 8, 4, .85); box-shadow: 0 0 0 1px #6a2410; position: relative; }
.bw-load i::before { content: ""; position: absolute; top: 0; bottom: 0; width: 40%; border-radius: 4px; background: linear-gradient(90deg, #ff5a1a, #ffd060); box-shadow: 0 0 12px #ff6a1a; animation: bw-run 1.4s ease-in-out infinite; }
@keyframes bw-run { 0% { left: -40%; } 100% { left: 100%; } }
/* (QoL #239) the loading's real share: a filled bar, its stage and percentage, and a line when it takes long */
.bw-load i.io-pct::before { display: none; }
.bw-load i em { position: absolute; left: 0; top: 0; bottom: 0; width: 0; border-radius: 4px; background: linear-gradient(90deg, #ff5a1a, #ffd060); box-shadow: 0 0 12px #ff6a1a; transition: width .25s ease-out; }
.bw-load small { display: block; margin-top: 10px; font-size: 13px; color: #e8b890; min-height: 1.4em; font-variant-numeric: tabular-nums; }
.bw-load small + small { margin-top: 4px; color: #ffb08a; }
.bw-h { position: absolute; z-index: 2; }
.bw-size { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); background: rgba(20, 4, 2, .85); color: #ffd8b0; border: 1px solid #6a2410; padding: 6px 12px; border-radius: 6px; font: 14px ui-monospace, Consolas, monospace; pointer-events: none; z-index: 3; }
.bw-panel { position: fixed; top: ${BAR + 4}px; right: 12px; width: 300px; max-height: calc(100% - ${BAR + 20}px); overflow: auto; background: linear-gradient(#1e0805, #140403); border: 1px solid #6a2410; border-radius: 10px; box-shadow: 0 0 24px rgba(255, 80, 20, .15), 0 12px 40px rgba(0,0,0,.7); padding: 12px 14px; z-index: 10; color: #f2dcc8; accent-color: #ff6a1a; scrollbar-color: #6a2410 transparent; }
.bw-panel h3 { margin: 12px 0 6px; font: 400 13px "Groboldov", sans-serif; letter-spacing: .8px; text-transform: uppercase; color: #ff9a4a; }
.bw-panel h3:first-child { margin-top: 0; }
.bw-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 6px 0; }
/* (16 October: two buttons in a row share it evenly; they were pushed to its two ends) */
.bw-row > .bw-wide { flex: 1 1 0; }
.bw-hint { color: #b88a70; font-size: 12px; margin: 2px 0 6px; }
.bw-panel select, .bw-panel input[type=range] { width: 150px; }
.bw-pct { display: inline-block; width: 38px; margin-left: 6px; text-align: right; font-variant-numeric: tabular-nums; opacity: 0.85; }
.bw-panel select { background: #2a0d08; color: #f2dcc8; border: 1px solid #6a2410; border-radius: 6px; padding: 3px 6px; }
.bw-sizes { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0; }
.bw-sizes button, .bw-panel .bw-wide { background: linear-gradient(#3a1008, #250805); color: #ffd8b0; border: 1px solid #6a2410; border-radius: 6px; padding: 4px 8px; cursor: pointer; font: inherit; }
.bw-sizes button:hover, .bw-panel .bw-wide:hover { background: linear-gradient(#55180a, #300a05); border-color: #ff7a2a; color: #fff1d8; }
.bw-foot { margin-top: 12px; color: #8a5a48; font-size: 11px; }
.bw-panel, .bw-panel * { touch-action: manipulation; -webkit-user-select: none; user-select: none; }
.bw-panel { touch-action: pan-y; }
.bw-panel input[type=password], .bw-panel input[type=text], .bw-panel input[type=email] { -webkit-user-select: text; user-select: text; width: 100%; box-sizing: border-box; margin: 3px 0; padding: 6px 8px; background: #2a0d08; color: #f2dcc8; border: 1px solid #6a2410; border-radius: 6px; font: inherit; }
/* (QoL #197, #199, #516: the Account part's forms, one open at a time, under its buttons) */
.bw-panel form.bw-acctform { margin: 4px 0 10px; }
.bw-msg { font-size: 12px; margin: 4px 0; } .bw-msg.ok { color: #9be07a; } .bw-msg.bad { color: #ff8a6a; }
/* (QoL #200: the signed-in browsers, one a row, under their button) */
.bw-sessbox { margin: 4px 0 10px; }
.bw-sess { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 5px 0; border-top: 1px solid rgba(106, 36, 16, .6); font-size: 12px; color: #d8b89c; }
.bw-sess b { color: #ffd8b0; font-weight: 600; } .bw-sess .bw-this { color: #9be07a; }
.bw-panel .bw-sess .bw-wide { padding: 2px 8px; font-size: 12px; flex: none; }
/* touch screens: the game fills the screen (clear of notches), a small menu button, a centred sheet */
.bw-m .bw-area { top: 0; padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); box-sizing: border-box; }
.bw-m .bw-frame { width: 100% !important; height: 100% !important; box-shadow: none; transition: transform .15s ease-out; }
.bw-fab { position: fixed; top: calc(env(safe-area-inset-top) + 4px); left: 50%; transform: translateX(-50%); z-index: 5; height: 26px; min-width: 40px; padding: 0 10px; border-radius: 13px; border: 1px solid rgba(255, 138, 58, .45); background: rgba(26, 6, 3, .6); color: #ffd8b0; display: flex; align-items: center; gap: 6px; font: 12px ui-monospace, Consolas, monospace; }
.bw-fab svg { width: 15px; height: 15px; }
.bw-m .bw-panel { top: 50%; left: 50%; right: auto; transform: translate(-50%, -50%); width: min(360px, 92vw); max-height: 86vh; font-size: 15px; padding: 14px 16px; }
.bw-m .bw-panel select { width: 170px; font-size: 15px; padding: 6px; }
.bw-m .bw-panel input[type=checkbox] { width: 22px; height: 22px; }
.bw-m .bw-panel input[type=range] { width: 170px; }
.bw-m .bw-panel .bw-wide { padding: 8px 12px; }
.bw-rotate { position: fixed; inset: 0; z-index: 20; background: radial-gradient(ellipse at center, rgba(60, 12, 5, .95), rgba(10, 2, 1, .96)); display: grid; place-items: center; text-align: center; padding: 24px; color: #ffd8b0; font-size: 17px; }
/* (QoL #224, #225) full screen: the whole page, the game filling it; on a computer a gear that shows itself while
   the pointer is near the top (F10 opens the settings too) */
.bw-full .bw-area { top: 0; }
.bw-full .bw-frame { width: 100% !important; height: 100% !important; box-shadow: none; }
.bw-full .bw-h { display: none; }
.bw-btn.bw-fsgear { display: none; position: fixed; top: 8px; right: 8px; z-index: 11; background: rgba(26, 6, 3, .75); opacity: 0; pointer-events: none; transition: opacity .4s ease-out; }
.bw-full .bw-btn.bw-fsgear { display: grid; }
.bw-btn.bw-fsgear.on { opacity: 1; pointer-events: auto; }
.bw-rotate button { margin-top: 18px; background: linear-gradient(#3a1008, #250805); color: #ffd8b0; border: 1px solid #ff7a2a; border-radius: 8px; padding: 10px 18px; font-size: 15px; }
`;

const ICON_GEAR = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
const ICON_CAMERA = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="4"/></svg>`;
const ICON_FULL = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>`;

export interface PlayerApi {
  stats: { frames: number };
  settings: { renderScale: number; hidpi: boolean; maxDensity: number; dynamic: boolean; fullRedraw: boolean; interpolate: number; fpsCap?: number; noGlow?: boolean; uiScale?: number };
  interp?: { stats: { shown: number } };
  focusedInputRect?(): { top: number; bottom: number } | null;
  applySettings(p: Partial<PlayerApi["settings"]>): void;
}

export function createShell(root: HTMLElement, parameters: Record<string, string>) {
  const mobile = parameters.mobile === "1" || (parameters.mobile !== "0" && TOUCH_ONLY);
  // (22 October: ?fpscap= empty, not a number or below 0: ignored (the game ignores it too), the saved limit used)
  if (parameters.fpscap !== undefined && !(String(parameters.fpscap).trim() !== "" && Number.isFinite(Number(parameters.fpscap)) && Number(parameters.fpscap) >= 0)) {
    delete parameters.fpscap;
  }
  const s = load(mobile);
  let fabFps: HTMLElement | null = null; // the frame rate inside the touch-screen menu button
  let fabBtn: HTMLElement | null = null; // the touch-screen menu button (the settings button there)
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);
  root.innerHTML = "";

  const bar = el("div", "bw-bar");
  const title = el("div", "bw-title");
  // (the site's name: the browser tab's title goes on with "- Backyard Monsters Refitted (custom server)")
  title.textContent = document.title.split(" - ")[0];
  const fps = el("div", "bw-fps");
  const fullBtn = el("button", "bw-btn") as HTMLButtonElement;
  fullBtn.title = "Full screen";
  fullBtn.innerHTML = ICON_FULL;
  const gear = el("button", "bw-btn") as HTMLButtonElement;
  gear.title = "Settings";
  gear.innerHTML = ICON_GEAR;
  // (Inferno-only, QoL #473: the game's photo mode (screenshot.Show, hidden behind Shift and the arrows), from a camera
  // button left of full screen; shown while a yard is up)
  const camBtn = el("button", "bw-btn") as HTMLButtonElement;
  camBtn.id = "bw-photo-btn";
  camBtn.title = "Photo mode";
  camBtn.innerHTML = ICON_CAMERA;
  camBtn.style.display = "none";
  bar.append(title, fps, camBtn, fullBtn, gear);

  const area = el("div", "bw-area");
  // frame: sized, holds the resize handles outside its edges; win: the player's container (it clips)
  const frame = el("div", "bw-frame");
  const win = el("div", "bw-win");
  // while the game loads: the Inferno and its name (taken away once the player is up: attach)
  const loading = el("div", "bw-load");
  // (Inferno-only, QoL #239: the stage and how far it is (index.html's loader keeps them up to date: __ioLoad), and a
  // line when it takes long)
  loading.innerHTML = `<div><b>Inferno Map Room 2</b><span>Opening the gates of the Inferno...</span><i data-io-load-bar><em></em></i><small data-io-load-text></small><small data-io-load-slow></small></div>`;
  (window as any).__ioLoad?.render?.();
  win.appendChild(loading);
  frame.appendChild(win);
  area.appendChild(frame);
  root.append(bar, area);

  // ?shell=0: the game fills the page, without the bar (tests, embedding)
  if (parameters.shell === "0") {
    bar.style.display = "none";
    area.style.top = "0";
    Object.assign(frame.style, { width: "100%", height: "100%", boxShadow: "none" });
    return { container: win, attach(p: PlayerApi) { (window as any).__ioLoad?.done?.(); loading.remove(); p.applySettings({}); } };
  }

  if (mobile) setupMobile();

  // ------------------------------------------------------------------ window size
  const fit = () => {
    if (mobile) return; // the game fills the screen
    const maxW = Math.max(MIN_W, window.innerWidth - 2 * MARGIN), maxH = Math.max(MIN_H, window.innerHeight - BAR - MARGIN);
    frame.style.width = `${Math.round(Math.min(s.width, maxW))}px`;
    frame.style.height = `${Math.round(Math.min(s.height, maxH))}px`;
  };
  fit();
  window.addEventListener("resize", fit);
  const setSize = (w: number, h: number, persist = true) => {
    s.width = Math.max(MIN_W, Math.round(w)); s.height = Math.max(MIN_H, Math.round(h));
    fit();
    if (persist) save(s);
  };

  // Resize handles just outside the window: edges and corners. The window stays centred, so an edge
  // moves by as much as the pointer and the opposite edge moves the other way.
  const T = 10, C = 16;
  const handles: [string, string, (x: number, y: number) => void][] = [];
  const specs: [string, Partial<CSSStyleDeclaration>, string, number, number][] = [
    ["n", { left: "0", right: "0", top: `-${T}px`, height: `${T}px` }, "ns-resize", 0, -1],
    ["s", { left: "0", right: "0", bottom: `-${T}px`, height: `${T}px` }, "ns-resize", 0, 1],
    ["w", { top: "0", bottom: "0", left: `-${T}px`, width: `${T}px` }, "ew-resize", -1, 0],
    ["e", { top: "0", bottom: "0", right: `-${T}px`, width: `${T}px` }, "ew-resize", 1, 0],
    ["nw", { left: `-${C}px`, top: `-${C}px`, width: `${C}px`, height: `${C}px` }, "nwse-resize", -1, -1],
    ["ne", { right: `-${C}px`, top: `-${C}px`, width: `${C}px`, height: `${C}px` }, "nesw-resize", 1, -1],
    ["sw", { left: `-${C}px`, bottom: `-${C}px`, width: `${C}px`, height: `${C}px` }, "nesw-resize", -1, 1],
    ["se", { right: `-${C}px`, bottom: `-${C}px`, width: `${C}px`, height: `${C}px` }, "nwse-resize", 1, 1],
  ];
  let sizeTip: HTMLElement | null = null;
  for (const [, pos, cursor, dx, dy] of specs) {
    const h = el("div", "bw-h");
    Object.assign(h.style, pos, { cursor });
    h.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      h.setPointerCapture(e.pointerId);
      const r = frame.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      sizeTip = el("div", "bw-size");
      frame.appendChild(sizeTip);
      const move = (ev: PointerEvent) => {
        const w = dx ? 2 * Math.abs(ev.clientX - cx) : r.width;
        const hh = dy ? 2 * Math.abs(ev.clientY - cy) : r.height;
        setSize(w, hh, false);
        sizeTip!.textContent = `${frame.clientWidth} × ${frame.clientHeight}`;
      };
      const up = () => {
        h.removeEventListener("pointermove", move);
        h.removeEventListener("pointerup", up);
        sizeTip?.remove(); sizeTip = null;
        save(s);
      };
      h.addEventListener("pointermove", move);
      h.addEventListener("pointerup", up);
    });
    h.addEventListener("dblclick", () => setSize(DEFAULTS.width, DEFAULTS.height));
    frame.appendChild(h);
  }

  // ------------------------------------------------------------------ full screen
  // (Inferno-only, QoL #224: one full screen, the same from every button (the bar's, the menu's, the game's own) on
  // computers, phones and tablets: the whole page goes full screen, so the menu button and the settings stay on it,
  // by the standard API or Safari's webkit one (iPad); a phone or tablet is then held in landscape where it can be.
  // The same button leaves it again. Where there is none (iPhone Safari): the "Add to Home Screen" tip.)
  const doc = document as any, page = document.documentElement as any;
  const fsElement = (): Element | null => doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
  const fsRequest = page.requestFullscreen ?? page.webkitRequestFullscreen;
  const fsExit = doc.exitFullscreen ?? doc.webkitExitFullscreen;
  const fsAvailable = typeof fsRequest === "function" && (doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled ?? true) !== false;
  const goFullscreen = () => {
    if (fsElement()) {
      try { Promise.resolve(fsExit?.call(doc)).catch(() => {}); } catch { /* already left */ }
      return;
    }
    if (!fsAvailable) { runtimeHooks.fullScreenUnavailable(); return; }
    try { Promise.resolve(fsRequest.call(page)).catch(() => {}); } catch { /* refused */ }
  };
  runtimeHooks.fullScreenTarget = () => document.documentElement;
  fullBtn.addEventListener("click", goFullscreen);
  // The game's own full-screen button, in a browser without element full screen (iPhone Safari): say why
  // nothing happens, and how to get full screen there (the home-screen icon opens without browser bars).
  runtimeHooks.fullScreenUnavailable = () => {
    if (STANDALONE || root.querySelector(".bw-rotate")) return;
    const tip = el("div", "bw-rotate");
    tip.innerHTML = IOS
      ? `<div>${tr("io_t3k_sh_fs_ios", "Safari on iPhone can't show web pages in full screen.<br><br>For full screen: tap Share, then <b>Add to Home Screen</b>,<br>and start the game from the new icon.")}<br><button>OK</button></div>`
      : `<div>${tr("io_t3k_sh_fs_none", "This browser can't show the game in full screen.")}<br><button>OK</button></div>`;
    tip.querySelector("button")!.onclick = () => tip.remove();
    root.appendChild(tip);
  };
  // in full screen the game fills the screen; the frame's size applies again afterwards
  const fullscreenChanged = () => {
    const on = !!fsElement();
    document.documentElement.classList.toggle("bw-full", on);
    bar.style.visibility = on || mobile ? "hidden" : "";
    panel.style.display = "none";
    if (on && mobile) { try { (screen.orientation as any)?.lock?.("landscape")?.catch?.(() => {}); } catch { /* not here */ } }
    const fsb = panel.querySelector<HTMLButtonElement>("#bw-fs");
    // (QoL #235: in the game's language, the key kept for the menu's next opening: acctRefresh)
    if (fsb) { fsb.dataset.k = on ? "io_t3k_sh_fs_leave" : "io_t3k_sh_fs"; fsb.dataset.en = on ? "Leave full screen" : "Full screen"; fsb.textContent = tr(fsb.dataset.k, fsb.dataset.en); }
    if (on) wakeGear(); else fsGear?.classList.remove("on");
  };
  document.addEventListener("fullscreenchange", fullscreenChanged);
  if (!("onfullscreenchange" in doc)) doc.addEventListener("webkitfullscreenchange", fullscreenChanged);

  // ------------------------------------------------------------------ settings panel
  const panel = el("div", "bw-panel");
  panel.style.display = "none";
  document.body.appendChild(panel);
  /** (QoL #197, #473) the Account part's words and who is signed in, and Photo mode while a yard is up: as it opens */
  let acctRefresh = (): void => {};
  const togglePanel = () => {
    panel.style.display = panel.style.display === "none" ? "" : "none";
    // (QoL #198: the Account part only once logged in)
    const g = (window as any).__game;
    const on = !!(g && g.LOGIN && g.LOGIN.token);
    for (const id of ["bw-acct-h", "bw-acct"]) { const x = panel.querySelector("#" + id) as HTMLElement | null; if (x) x.style.display = on ? "" : "none"; }
    if (panel.style.display === "") { syncGameRows(); acctRefresh(); wakeGear(); }
  };
  // (Inferno-only, QoL #473: the game's photo mode, while a yard is up: the bar's camera, or Screen > Photo mode)
  const photoReady = (): boolean => {
    const g = (window as any).__game;
    return !!(g && g.GLOBAL && g.GLOBAL.INFERNO_ONLY && g.LOGIN && g.LOGIN.token && g.GLOBAL._layerMap && g.BASE && !g.BASE._loading && g.screenshot && typeof g.screenshot.Show === "function");
  };
  const openPhoto = () => {
    if (!photoReady()) return;
    panel.style.display = "none";
    try { (window as any).__game.screenshot.Show(); } catch { /* not now */ }
  };
  camBtn.addEventListener("click", (e) => { e.stopPropagation(); openPhoto(); });
  if (!mobile) setInterval(() => { const on = photoReady(); camBtn.title = tr("io_acc_photo_btn", "Photo mode"); fullBtn.title = tr("io_t3k_sh_full", "Full screen"); gear.title = tr("io_t3k_sh_settings", "Settings"); if (fsGear) fsGear.title = tr("io_t3k_sh_settings_f10", "Settings (F10)"); camBtn.style.display = on ? "" : "none"; }, 1000);
  gear.addEventListener("click", (e) => { e.stopPropagation(); togglePanel(); });
  // (the buttons that open it don't close it first: their click does)
  const opener = (t: Node) => [gear, fabBtn, fsGear].some((b) => b && (t === b || b.contains(t)));
  let closedAt = 0; // (QoL #312: when a press outside last closed the menu)
  document.addEventListener("pointerdown", (e) => { if (panel.style.display !== "none" && !panel.contains(e.target as Node) && !opener(e.target as Node)) { panel.style.display = "none"; closedAt = performance.now(); } });
  // (Inferno-only, QoL #312: on a phone the game puts this menu's gear in its top bar's right-hand row of icons
  // (UI_TOP.ioPageGear), where it covers nothing; the button at the top centre, over the top bar's shortcuts, the
  // Designer and Tilt and the map's toolbar, is hidden while the game's is there. The game says so every update
  // (gameGear(true)); 4 s without it (another screen: the map, an attack, the login) and this one shows again. A tap
  // on the game's gear while the menu is open closes it (the tap's press already did: it isn't opened again).)
  let gameGearAt = 0;
  const syncFab = () => {
    if (!fabBtn || gear.style.display === "none") return;
    const inGame = performance.now() - gameGearAt < 4000;
    fabBtn.style.display = inGame && showOf(s) === "off" ? "none" : "";
  };
  (window as any).__bwShell = {
    menu: () => { if (performance.now() - closedAt < 400) return; togglePanel(); },
    gameGear: (on: boolean): boolean => {
      if (!mobile || gear.style.display === "none") return false;
      if (on) gameGearAt = performance.now();
      syncFab();
      return true;
    },
  };
  if (mobile) setInterval(syncFab, 1000);
  // (Inferno-only, QoL #225: the settings in full screen on a computer, where the bar is gone: a gear in the top
  // corner that shows itself while the pointer is near the top of the screen, and F10 anywhere. Esc closes them.)
  let fsGear: HTMLButtonElement | null = null;
  let gearTimer = 0;
  function wakeGear(): void {
    if (!fsGear || gear.style.display === "none") return;
    fsGear.classList.add("on");
    clearTimeout(gearTimer);
    gearTimer = window.setTimeout(() => { if (panel.style.display === "none") fsGear?.classList.remove("on"); }, 2500);
  }
  if (!mobile) {
    fsGear = el("button", "bw-btn bw-fsgear") as HTMLButtonElement;
    fsGear.id = "bw-fsgear";
    fsGear.title = "Settings (F10)";
    fsGear.innerHTML = ICON_GEAR;
    fsGear.addEventListener("click", (e) => { e.stopPropagation(); togglePanel(); });
    root.appendChild(fsGear);
    document.addEventListener("pointermove", (e) => { if (fsElement() && e.pointerType === "mouse" && e.clientY < 64) wakeGear(); });
  }
  window.addEventListener("keydown", (e) => {
    if (e.key === "F10") { e.preventDefault(); e.stopPropagation(); togglePanel(); return; }
    if (e.key === "Escape" && panel.style.display !== "none") { e.preventDefault(); e.stopPropagation(); panel.style.display = "none"; }
  }, true);

  let api: PlayerApi | null = null;
  /** The page's volume: the slider's, or none while the tab is hidden (when that is on). */
  // (QoL #632: a perceptual curve: the slider's half sounds half as loud, so the gain is its square)
  const applyVolume = () => setPageVolume(s.muteHidden !== false && document.hidden ? 0 : s.volume * s.volume);
  const applyDisplay = () => api?.applySettings({ renderScale: s.hidpi ? 1 : s.renderScale, hidpi: s.hidpi, maxDensity: s.maxDensity, dynamic: s.dynamic, fullRedraw: s.fullRedraw, ...(parameters.fpscap === undefined && parameters.interp === undefined ? { fpsCap: capOf(s) } : {}), noGlow: s.noGlow === true, uiScale: uiScaleOf(s) });
  /** (QoL #227) the interface size kept, or ?uiscale= for testing */
  const uiScaleOf = (st: Settings) => parameters.uiscale !== undefined ? Math.max(1, Math.min(1.5, Number(parameters.uiscale) || 1)) : Math.max(1, Math.min(1.5, Number(st.uiScale) || 1));
  /**
   * (QoL #234, #228) The rows that are the game's own settings: its language and the colour-blind colours, read from
   * the game when the panel opens (window.__game: KEYS.ioLanguage, IoFormat.colourBlind); not there before it runs.
   */
  const syncGameRows = () => {
    const g = (window as any).__game;
    const ready = !!(g && g.KEYS && g.IoFormat);
    const lang = panel.querySelector<HTMLSelectElement>("#bw-lang");
    if (lang) { lang.disabled = !ready; if (ready && g.KEYS.ioLanguage) lang.value = String(g.KEYS.ioLanguage).toLowerCase(); }
    const cb = panel.querySelector<HTMLInputElement>("#bw-cb");
    if (cb) { cb.disabled = !ready; cb.checked = ready && g.IoFormat.colourBlind === true; }
  };
  const hidpiAvailable = (window.devicePixelRatio || 1) > 1;
  /** (QoL #222) a touch screen here: the arcade's touch controls can be set up */
  const touchScreen = mobile || (navigator.maxTouchPoints || 0) > 0;

  const render = () => {
    const dpr = window.devicePixelRatio || 1;
    const resValue = s.hidpi ? (s.maxDensity <= 2 && dpr > 2 ? "2x" : "hidpi") : String(s.renderScale);
    // (Inferno-only, QoL #230: a scaled display (Windows at 125-200%, most laptops) drawn at one pixel per point looks soft)
    const scaledHint = hidpiAvailable && !s.hidpi && dpr >= 1.25;
    panel.innerHTML = `
      <h3 data-k="io_t3k_sh_h_display">Display</h3>
      <div class="bw-row"><label for="bw-res" data-k="io_t3k_sh_res">Resolution</label>
        <select id="bw-res">
          <option value="1" data-k="io_t3k_sh_res_full">Full (100%)</option>
          ${dpr > 2 ? `<option value="2x" data-k="io_t3k_sh_res_2x">Sharp (2×)</option>` : ""}
          ${hidpiAvailable ? `<option value="hidpi" data-k="io_t3k_sh_res_hidpi">Sharpest (screen resolution)</option>` : ""}
          <option value="0.75" data-k="io_t3k_sh_res_75">Balanced (75%)</option>
          <option value="0.5" data-k="io_t3k_sh_res_50">Performance (50%)</option>
        </select></div>
      ${scaledHint ? `<div class="bw-hint" id="bw-scaled"><span data-k="io_t3k_sh_scaled1">Your screen (or the browser's zoom) is scaled to</span> ${Math.round(dpr * 100)}<span data-k="io_t3k_sh_scaled2">%, so the game is drawn at a lower resolution and stretched, which looks soft. "Sharpest" draws it at your screen's own resolution: much crisper, a little slower.</span> <button class="bw-wide" id="bw-sharpest" data-k="io_t3k_sh_use_sharpest">Use Sharpest</button></div>` : ""}
      <div class="bw-row"><label for="bw-ui" data-k="io_t3k_sh_ui">Interface size</label>
        <select id="bw-ui">
          <option value="1">100%</option>
          <option value="1.25">125%</option>
          <option value="1.5">150%</option>
        </select></div>
      <div class="bw-hint" data-k="io_t3k_sh_ui_hint">Draws the whole game larger, still sharp, as far as the window leaves room for it (at least 760×670 at the game's own size). A big window or full screen shows the most.</div>
      <div class="bw-row"><button class="bw-wide" id="bw-battery" data-k="io_t3k_sh_battery">Battery saver</button></div>
      <div class="bw-hint" data-k="io_t3k_sh_battery_hint2">One click: Balanced (75%) resolution, a 40 fps limit and no light and shadows. Less drawing, so less heat and battery.</div>
      <div class="bw-row"><label for="bw-dyn" data-k="io_t3k_sh_dyn">Dynamic resolution</label><input id="bw-dyn" type="checkbox"></div>
      <div class="bw-hint" data-k="io_t3k_sh_dyn_hint">Lowers the resolution automatically while the game can't keep up, and raises it again when it can.</div>
      <div class="bw-row"><label for="bw-cap" data-k="io_t3k_sh_cap">Frame rate limit</label>
        <select id="bw-cap">
          <option value="30">30 fps</option>
          <option value="40">40 fps</option>
          <option value="60">60 fps</option>
          <option value="75">75 fps</option>
          <option value="90">90 fps</option>
          <option value="100">100 fps</option>
          <option value="120">120 fps</option>
          <option value="144">144 fps</option>
          <option value="165">165 fps</option>
          <option value="180">180 fps</option>
          <option value="200">200 fps</option>
          <option value="240">240 fps</option>
          <option value="280">280 fps</option>
          <option value="360">360 fps</option>
          <option value="0" data-k="io_t3k_sh_cap_none">No limit</option>
        </select></div>
      <div class="bw-hint" data-k="io_t3k_sh_cap_hint">How many times a second the game is drawn, at most: its FPS (60 unless you choose). The game itself always updates 40 times a second, its ticks, whatever this is: over 40 FPS, the frames between ticks are smoothed, timed to your screen. No limit draws at every refresh of your screen (a browser can't show more). Higher costs more drawing, so more heat and battery.</div>
      <div class="bw-row"><label for="bw-glow" data-k="io_t3k_sh_glow">Glow effects</label><input id="bw-glow" type="checkbox"></div>
      <div class="bw-hint" data-k="io_t3k_sh_glow_hint">Off: no glows around monsters, buttons and text. Faster on slow devices, but some text is harder to read.</div>
      <div class="bw-row"><label for="bw-light" data-k="io_t3k_sh_light">Light and shadows</label><input id="bw-light" type="checkbox"></div>
      <div class="bw-hint" data-k="io_t3k_sh_light_hint">Off: the yard as it was drawn, with no light, no shadows cast by buildings, monsters and pets, and no Halloween cobwebs. Faster on slow devices.</div>
      <div class="bw-row"><label for="bw-gl" data-k="io_t3k_sh_gl">Draw with the graphics card</label><input id="bw-gl" type="checkbox"></div>
      <div class="bw-hint" data-k="io_t3k_sh_gl_hint">On: the yard is drawn by your graphics card, much faster in big battles. Turn it off if the yard looks wrong. Computers without one draw it the old way anyway.</div>
      <div class="bw-row"><label for="bw-fpsc" data-k="io_t3k_sh_show">Show on screen</label>
        <select id="bw-fpsc">
          <option value="off" data-k="io_t3k_sh_show_off">Off</option>
          <option value="fps" data-k="io_t3k_sh_show_fps">FPS</option>
          <option value="ticks" data-k="io_t3k_sh_show_ticks">Ticks</option>
          <option value="both" data-k="io_t3k_sh_show_both">FPS and ticks</option>
        </select></div>
      <div class="bw-hint" data-k="io_t3k_sh_show_hint">FPS: how many times a second the game is drawn (up to the frame rate limit). Ticks: how many times a second the game itself is updated (monsters, attacks, timers): 40, whatever the FPS.</div>
      <h3 data-k="io_t3k_sh_h_screen">Screen</h3>
      <div class="bw-row" id="bw-photo-row"><button class="bw-wide" id="bw-photo" data-k="io_acc_photo_btn">Photo mode</button></div>
      <div class="bw-hint" id="bw-photo-hint" data-k="io_acc_photo_hint">A picture of your yard to download, with filters and frames (also Shift with the arrow keys up, down, left, right).</div>
      ${fsAvailable ? `<div class="bw-row"><button class="bw-wide" id="bw-fs" data-k="${fsElement() ? "io_t3k_sh_fs_leave" : "io_t3k_sh_fs"}">${fsElement() ? "Leave full screen" : "Full screen"}</button></div>`
        : IOS && !STANDALONE ? `<div class="bw-hint"><span data-k="io_t3k_sh_ios1">For full screen on iPhone: tap Share, then</span> <b data-k="io_t3k_sh_ios_add">Add to Home Screen</b><span data-k="io_t3k_sh_ios2">, and start the game from the new icon.</span></div>` : ""}
      ${mobile ? `<div class="bw-hint" data-k="io_t3k_sh_touch_hint">Drag with one finger to scroll the map, pinch with two to zoom, or drag with two to move the map without zooming. Double-tap the yard to zoom in, and again to zoom back out.</div>`
        : `<div class="bw-hint" data-k="io_t3k_sh_f10_hint">In full screen, F10 (or the gear that shows at the top corner) opens these settings, and Esc closes them.</div>`}
      <h3 data-k="io_t3k_sh_h_window" ${mobile ? `style="display:none"` : ""}>Window</h3>
      <div class="bw-sizes" ${mobile ? `style="display:none"` : ""}>
        <button data-w="760" data-h="670">760×670 (Flash)</button>
        <button data-w="1024" data-h="768">1024×768</button>
        <button data-w="1280" data-h="800">1280×800</button>
        <button data-fit="1" data-k="io_t3k_sh_fit">Fit browser</button>
      </div>
      ${mobile ? "" : `<div class="bw-hint" data-k="io_t3k_sh_window_hint">Drag just outside the game's edges or corners to resize it. Double-click an edge to go back to 760×670.</div>`}
      <h3 data-k="io_t3k_sh_h_sound">Sound</h3>
      <div class="bw-row"><label for="bw-vol" data-k="io_t3k_sh_vol">Volume</label><input id="bw-vol" type="range" min="0" max="100"><span class="bw-pct" id="bw-vol-p"></span></div>
      <div class="bw-row"><label for="bw-music" data-k="io_t3k_sh_music">Music</label><input id="bw-music" type="range" min="0" max="100"><span class="bw-pct" id="bw-music-p"></span></div>
      <div class="bw-row"><label for="bw-fx" data-k="io_t3k_sh_fx">Effects</label><input id="bw-fx" type="range" min="0" max="100"><span class="bw-pct" id="bw-fx-p"></span></div>
      <div class="bw-row"><label for="bw-mute" data-k="io_t3k_sh_mute">Mute while this tab is hidden</label><input id="bw-mute" type="checkbox"></div>
      <div class="bw-row"><label for="bw-clicks" data-k="io_t3k_sh_clicks">Interface clicks</label><input id="bw-clicks" type="checkbox"></div>
      <div class="bw-row"><label for="bw-notify" data-k="io_t3k_sh_notify">Sounds for mentions, letters and quests ready</label><input id="bw-notify" type="checkbox"></div>
      <div class="bw-row"><label for="bw-bnotify" data-k="io_t3k_sh_bnotify">Browser notifications while this tab is hidden: your Siege turn, an outpost attacked, an alliance invite</label><input id="bw-bnotify" type="checkbox"></div>
      <h3 data-k="io_t3k_sh_h_game">Game</h3>
      <div class="bw-row"><label for="bw-lang" data-k="io_t3k_sh_lang">Language</label>
        <select id="bw-lang">
          ${LANGUAGES.map(([v, n]) => `<option value="${v}">${n}</option>`).join("")}
        </select></div>
      <div class="bw-hint" data-k="io_t3k_sh_lang_hint">The game reloads in the language chosen. You stay logged in.</div>
      <div class="bw-row"><label for="bw-cb" data-k="io_t3k_sh_cb">Colour-blind friendly colours</label><input id="bw-cb" type="checkbox"></div>
      <div class="bw-hint" data-k="io_t3k_sh_cb_hint">Friendly alliances in blue and hostile ones in orange (not green and red), on the map with F, H and A (your alliance) beside their names. Kept in this browser.</div>
      <div class="bw-row"><label for="bw-motion" data-k="io_t3k_sh_motion">Reduce motion</label>
        <select id="bw-motion">
          <option value="auto" data-k="io_t3k_sh_motion_auto">As my system</option>
          <option value="on" data-k="io_t3k_sh_on">On</option>
          <option value="off" data-k="io_t3k_sh_off">Off</option>
        </select></div>
      <div class="bw-hint" data-k="io_t3k_sh_motion_hint">On: no screen shakes, no buildings nodding, and windows open without zooming.</div>
      <div class="bw-row"><label for="bw-shiny" data-k="io_t3k_sh_shiny">Ask before spending Shiny</label>
        <select id="bw-shiny">
          <option value="0" data-k="io_t3k_sh_shiny_always">Always</option>
          <option value="10" data-k="io_acc_lock_10">Over 10 Shiny</option>
          <option value="50" data-k="io_acc_lock_50">Over 50 Shiny</option>
          <option value="200" data-k="io_acc_lock_200">Over 200 Shiny</option>
        </select></div>
      <div class="bw-hint" data-k="io_t3k_sh_shiny_hint">Small amounts are spent without the "Spend … Shiny?" question. Kept in this browser.</div>
      ${touchScreen ? `<h3 data-k="io_t3k_sh_h_touch">Touch controls</h3>
      <div class="bw-row"><label for="bw-padleft" data-k="io_t3k_sh_padleft">Left-handed (stick on the right)</label><input id="bw-padleft" type="checkbox"></div>
      <div class="bw-row"><label for="bw-padsize" data-k="io_t3k_sh_padsize">Size</label>
        <select id="bw-padsize">
          <option value="0.8" data-k="io_t3k_sh_small">Small</option>
          <option value="1" data-k="io_t3k_sh_normal">Normal</option>
          <option value="1.25" data-k="io_t3k_sh_large">Large</option>
        </select></div>
      <div class="bw-row"><label for="bw-padalpha" data-k="io_t3k_sh_padalpha">Opacity</label><input id="bw-padalpha" type="range" min="30" max="100"><span class="bw-pct" id="bw-padalpha-p"></span></div>
      <div class="bw-hint" data-k="io_t3k_sh_pad_hint">The on-screen stick and buttons of the Devil's Arcade games. From the next game on.</div>` : ""}
      <h3 id="bw-acct-h" data-k="io_t3k_sh_h_account">Account</h3>
      <div id="bw-acct">
        <div class="bw-hint" id="bw-acct-who"></div>
        <div class="bw-row"><button class="bw-wide" id="bw-name" data-k="io_acc_name_btn">Change name</button><button class="bw-wide" id="bw-mail" data-k="io_acc_mail_btn">Change email</button></div>
        <form id="bw-nameform" class="bw-acctform" style="display:none" autocomplete="off">
          <input type="text" id="bw-namenew" maxlength="12" autocomplete="off" spellcheck="false" data-kp="io_acc_name_ph" placeholder="New name (2 to 12 letters, numbers or _)">
          <div class="bw-msg" id="bw-namemsg"></div>
          <div class="bw-row"><button class="bw-wide" type="submit" id="bw-namego" data-k="io_acc_name_go">Save the new name</button></div>
          <div class="bw-hint" id="bw-namehint" data-k="io_acc_name_hint">You can change your name once every 6 months. Others see the new one after they reload.</div>
        </form>
        <form id="bw-mailform" class="bw-acctform" style="display:none" autocomplete="on">
          <input type="email" id="bw-mailnew" maxlength="255" autocomplete="email" spellcheck="false" data-kp="io_acc_mail_ph" placeholder="New email">
          <input type="password" id="bw-mailpw" autocomplete="current-password" data-kp="io_acc_pw_ph" placeholder="Current password">
          <div class="bw-msg" id="bw-mailmsg"></div>
          <div class="bw-row"><button class="bw-wide" type="submit" id="bw-mailgo" data-k="io_acc_mail_go">Save the new email</button></div>
          <div class="bw-hint" data-k="io_acc_mail_hint">You sign in with the new email from now on. Your other devices and saved logins are signed out; this game goes on.</div>
        </form>
        <div class="bw-row"><button class="bw-wide" id="bw-pw" data-k="io_t3k_sh_pw_btn">Change password</button><button class="bw-wide" id="bw-lock" data-k="io_acc_lock_btn">Shiny lock</button></div>
        <form id="bw-pwform" style="display:none" autocomplete="on">
          <input type="text" name="username" autocomplete="username" style="display:none" id="bw-pwuser">
          <input type="password" id="bw-pwold" autocomplete="current-password" data-kp="io_acc_pw_ph" placeholder="Current password">
          <input type="password" id="bw-pwnew" maxlength="72" autocomplete="new-password" data-kp="io_t3k_sh_pw_new_ph" placeholder="New password (8+ characters, one symbol)">
          <input type="password" id="bw-pwnew2" maxlength="72" autocomplete="new-password" data-kp="io_t3k_sh_pw_new2_ph" placeholder="New password again">
          <div class="bw-msg" id="bw-pwmsg"></div>
          <div class="bw-row"><button class="bw-wide" type="submit" id="bw-pwgo" data-k="io_t3k_sh_pw_go">Save the new password</button></div>
          <div class="bw-hint" data-k="io_t3k_sh_pw_hint">Your other devices and saved logins are signed out; this game goes on.</div>
        </form>
        <form id="bw-lockform" class="bw-acctform" style="display:none" autocomplete="on">
          <div class="bw-row"><label for="bw-lockabove" data-k="io_acc_lock_label">Ask for my password</label>
            <select id="bw-lockabove">
              <option value="0" data-k="io_acc_lock_off">Never (off)</option>
              <option value="10" data-k="io_acc_lock_10">Over 10 Shiny</option>
              <option value="50" data-k="io_acc_lock_50">Over 50 Shiny</option>
              <option value="200" data-k="io_acc_lock_200">Over 200 Shiny</option>
              <option value="1000" data-k="io_acc_lock_1000">Over 1,000 Shiny</option>
            </select></div>
          <input type="password" id="bw-lockpw" autocomplete="current-password" data-kp="io_acc_pw_ph" placeholder="Current password">
          <div class="bw-msg" id="bw-lockmsg"></div>
          <div class="bw-row"><button class="bw-wide" type="submit" id="bw-lockgo" data-k="io_acc_lock_go">Save the Shiny lock</button></div>
          <div class="bw-hint" data-k="io_acc_lock_hint">Spending more than this in one go, in your yard or in the Brimstone Pit, asks for your password first (then not again for 5 minutes). It is kept with your account, on every device.</div>
        </form>
        <div class="bw-row"><button class="bw-wide" id="bw-forget" data-k="io_acc_forget_btn">Sign out and forget this computer</button></div>
        <div class="bw-hint" data-k="io_acc_forget_hint">Signs you out and takes your name off this browser's login page, so nobody here can sign in as you without your password.</div>
        <!-- (QoL #200: the account's signed-in browsers) -->
        <div class="bw-row"><button class="bw-wide" id="bw-sess" data-k="io_acc_sess_btn">Signed-in browsers</button></div>
        <div id="bw-sessbox" class="bw-sessbox" style="display:none">
          <div id="bw-sesslist"></div>
          <div class="bw-msg" id="bw-sessmsg"></div>
          <div class="bw-row"><button class="bw-wide" id="bw-sessall" data-k="io_acc_sess_all">Sign out all others</button></div>
          <div class="bw-hint" data-k="io_acc_sess_hint">Where your account is signed in: the game you are playing, and the browsers that sign you in by your name on the login page. Signed out, they ask for your password again.</div>
        </div>
      </div>
      <h3 data-k="io_t3k_sh_h_trouble">Troubleshooting</h3>
      <div class="bw-row"><label for="bw-full" data-k="io_t3k_sh_redraw">Redraw everything every frame</label><input id="bw-full" type="checkbox"></div>
      <div class="bw-hint" data-k="io_t3k_sh_redraw_hint">Slower. Only useful if something on screen is not updated properly.</div>
      <div class="bw-row"><button class="bw-wide" id="bw-reset" data-k="io_t3k_sh_reset">Reset settings</button><button class="bw-wide" id="bw-reload" data-k="io_t3k_sh_reload">Reload game</button></div>
      <h3 data-k="io_t3k_sh_h_gearbtn">Settings button</h3>
      <div class="bw-row"><button class="bw-wide" id="bw-hide" data-k="io_t3k_sh_hide">Hide the settings button</button></div>
      <div class="bw-hint" data-k="io_t3k_sh_hide_hint">Out of the way until the page is reloaded.</div>
      <div class="bw-foot" id="bw-build"></div>`;
    const q = <T extends HTMLElement>(id: string) => panel.querySelector("#" + id) as T;
    const res = q<HTMLSelectElement>("bw-res");
    res.value = resValue;
    res.onchange = () => {
      if (res.value === "hidpi") { s.hidpi = true; s.maxDensity = 4; s.renderScale = 1; }
      else if (res.value === "2x") { s.hidpi = true; s.maxDensity = 2; s.renderScale = 1; }
      else { s.hidpi = false; s.renderScale = Number(res.value); }
      save(s); applyDisplay();
    };
    // (Inferno-only, QoL #227: the interface size)
    const ui = q<HTMLSelectElement>("bw-ui");
    ui.value = String(uiScaleOf(s));
    if (!ui.value) ui.value = "1";
    ui.onchange = () => { s.uiScale = Number(ui.value) || 1; save(s); applyDisplay(); };
    // (QoL #230: one click to the screen's own resolution)
    const sharpest = panel.querySelector<HTMLButtonElement>("#bw-sharpest");
    if (sharpest) sharpest.onclick = () => { s.hidpi = true; s.maxDensity = 4; s.renderScale = 1; save(s); applyDisplay(); render(); };
    // (Inferno-only, QoL #242: Battery saver: 75% resolution, no interpolation (dynamic resolution, if on, still lowers it further))
    q<HTMLButtonElement>("bw-battery").onclick = () => { s.hidpi = false; s.renderScale = 0.75; s.interpolate = 0; s.fpsCap = 40; s.lighting = false; save(s); applyDisplay(); render(); };
    const glow = q<HTMLInputElement>("bw-glow");
    glow.checked = s.noGlow !== true;
    glow.onchange = () => { s.noGlow = !glow.checked; save(s); applyDisplay(); };
    // (the game reads it from the saved settings: GLOBAL.ioPageSettings, within a second)
    const light = q<HTMLInputElement>("bw-light");
    light.checked = s.lighting !== false;
    light.onchange = () => { s.lighting = light.checked; save(s); };
    const gl = q<HTMLInputElement>("bw-gl");
    gl.checked = s.gl !== false;
    gl.onchange = () => { s.gl = gl.checked; save(s); };
    const dyn = q<HTMLInputElement>("bw-dyn");
    dyn.checked = s.dynamic;
    dyn.onchange = () => { s.dynamic = dyn.checked; save(s); applyDisplay(); };
    // (18 October: the frame rate limit, in place of the frame interpolation's choice: it sets it)
    const cap = q<HTMLSelectElement>("bw-cap");
    // (22 October, the user's: a 180 Hz screen. The usual refresh rates are listed; any other limit kept (the page's
    // fpscap, say) shows as its own choice rather than none)
    // (22 October: with the page's fpscap, its limit shown (the one in force); a limit chosen then takes over from it)
    const capNow = parameters.fpscap !== undefined ? Math.min(1000, Number(parameters.fpscap) | 0) : capOf(s);
    if (![...cap.options].some((o) => o.value === String(capNow))) {
      const o = document.createElement("option");
      o.value = String(capNow);
      o.textContent = capNow + " fps";
      const after = [...cap.options].find((x) => Number(x.value) > capNow || x.value === "0");
      cap.insertBefore(o, after || null);
    }
    cap.value = String(capNow);
    cap.onchange = () => { s.fpsCap = Math.max(0, Math.min(1000, Number(cap.value) | 0)); save(s); delete parameters.fpscap; applyDisplay(); };
    // (19 October: FPS, ticks, both or nothing)
    const fpsc = q<HTMLSelectElement>("bw-fpsc");
    fpsc.value = showOf(s);
    fpsc.onchange = () => { s.rateShow = showOf({ ...s, rateShow: fpsc.value }); s.fps = s.rateShow !== "off"; save(s); fps.textContent = ""; if (fabFps) fabFps.textContent = ""; syncFab(); };
    for (const b of panel.querySelectorAll<HTMLButtonElement>(".bw-sizes button")) {
      b.onclick = () => b.dataset.fit ? setSize(window.innerWidth - 2 * MARGIN, window.innerHeight - BAR - MARGIN) : setSize(Number(b.dataset.w), Number(b.dataset.h));
    }
    // (QoL #632: each slider says its % beside it)
    const pct = (id: string, v: number) => { const el = document.getElementById(id + "-p"); if (el) el.textContent = Math.round(v * 100) + "%"; };
    const vol = q<HTMLInputElement>("bw-vol");
    vol.value = String(Math.round(s.volume * 100));
    pct("bw-vol", s.volume);
    vol.oninput = () => { s.volume = Number(vol.value) / 100; pct("bw-vol", s.volume); applyVolume(); save(s); };
    const music = q<HTMLInputElement>("bw-music");
    music.value = String(Math.round((s.musicVolume ?? 1) * 100));
    pct("bw-music", s.musicVolume ?? 1);
    music.oninput = () => { s.musicVolume = Number(music.value) / 100; pct("bw-music", s.musicVolume); save(s); };
    const fx = q<HTMLInputElement>("bw-fx");
    fx.value = String(Math.round((s.effectsVolume ?? 1) * 100));
    pct("bw-fx", s.effectsVolume ?? 1);
    fx.oninput = () => { s.effectsVolume = Number(fx.value) / 100; pct("bw-fx", s.effectsVolume); save(s); };
    const mute = q<HTMLInputElement>("bw-mute");
    mute.checked = s.muteHidden !== false;
    mute.onchange = () => { s.muteHidden = mute.checked; save(s); applyVolume(); };
    // (QoL #631: the click of every button, apart from the game's other sounds)
    const clicks = q<HTMLInputElement>("bw-clicks");
    clicks.checked = s.clicks !== false;
    clicks.onchange = () => { s.clicks = clicks.checked; save(s); };
    const notify = q<HTMLInputElement>("bw-notify");
    notify.checked = s.notifySounds === true;
    notify.onchange = () => { s.notifySounds = notify.checked; save(s); };
    // (Inferno-only, QoL #195: the browser asks once; off again when it is refused)
    const bnotify = q<HTMLInputElement>("bw-bnotify");
    bnotify.checked = s.browserNotify === true && typeof Notification !== "undefined" && Notification.permission === "granted";
    bnotify.onchange = () => {
      if (!bnotify.checked || typeof Notification === "undefined") { s.browserNotify = false; bnotify.checked = false; save(s); return; }
      Notification.requestPermission().then((p) => { s.browserNotify = p === "granted"; bnotify.checked = s.browserNotify; save(s); }).catch(() => { s.browserNotify = false; bnotify.checked = false; save(s); });
    };
    // (Inferno-only, QoL #234: another language: kept for the game (its SharedObject, as the login page's choice) and in
    // the address (?language=, which GAME.setLauncherVars takes), then the page reloads: a reload of this tab signs
    // in as before (LOGIN.ioTabSession), and the yard's last changes are saved on the way out (LOGIN.ioWatchUnload))
    const lang = q<HTMLSelectElement>("bw-lang");
    lang.onchange = () => {
      const g = (window as any).__game;
      const v = lang.value;
      if (!g || !g.KEYS || String(g.KEYS.ioLanguage || "").toLowerCase() === v) return;
      try { const so = g.GAME && g.GAME.sharedObj; if (so) { so.data.language = v; so.flush(); } } catch { /* storage blocked: the address carries it */ }
      try { const u = new URL(location.href); u.searchParams.set("language", v); history.replaceState(history.state, "", u.toString()); } catch { /* old browser */ }
      lang.disabled = true;
      location.reload();
    };
    // (Inferno-only, QoL #228: the colour-blind colours, the game's own setting: IoFormat.setColourBlind)
    const cb = q<HTMLInputElement>("bw-cb");
    cb.onchange = () => { const g = (window as any).__game; if (g && g.IoFormat) g.IoFormat.setColourBlind(cb.checked); };
    syncGameRows();
    const motion = q<HTMLSelectElement>("bw-motion");
    motion.value = s.reduceMotion === "on" || s.reduceMotion === "off" ? s.reduceMotion : "auto";
    motion.onchange = () => { s.reduceMotion = motion.value; save(s); };
    const shiny = q<HTMLSelectElement>("bw-shiny");
    shiny.value = String(s.shinyAskAbove | 0);
    if (!shiny.value) shiny.value = "0";
    shiny.onchange = () => { s.shinyAskAbove = Number(shiny.value) | 0; save(s); };
    // (QoL #222: the arcade's touch controls, kept in this browser; IoTouchPad reads them when a game starts)
    const padLeft = panel.querySelector<HTMLInputElement>("#bw-padleft");
    if (padLeft) {
      padLeft.checked = s.padLeft === true;
      padLeft.onchange = () => { s.padLeft = padLeft.checked; save(s); };
      const padSize = q<HTMLSelectElement>("bw-padsize");
      const sizes = [0.8, 1, 1.25];
      const size = sizes.reduce((a, b) => (Math.abs(b - (s.padSize ?? 1)) < Math.abs(a - (s.padSize ?? 1)) ? b : a), 1);
      padSize.value = String(size);
      padSize.onchange = () => { s.padSize = Number(padSize.value) || 1; save(s); };
      const padAlpha = q<HTMLInputElement>("bw-padalpha");
      const alpha = Math.max(0.3, Math.min(1, s.padOpacity ?? 1));
      padAlpha.value = String(Math.round(alpha * 100));
      pct("bw-padalpha", alpha);
      padAlpha.oninput = () => { s.padOpacity = Number(padAlpha.value) / 100; pct("bw-padalpha", s.padOpacity); save(s); };
    }
    const full = q<HTMLInputElement>("bw-full");
    full.checked = s.fullRedraw;
    full.onchange = () => { s.fullRedraw = full.checked; save(s); applyDisplay(); };
    q<HTMLButtonElement>("bw-reset").onclick = () => {
      Object.assign(s, defaultsFor(mobile)); save(s); fit(); applyVolume(); applyDisplay(); render();
    };
    q<HTMLButtonElement>("bw-reload").onclick = () => location.reload();
    // (Inferno-only, QoL #198: a new password while logged in; real page fields, so password managers see them)
    const gameOf = () => (window as any).__game;
    const loggedIn = () => { const game = gameOf(); return !!(game && game.LOGIN && game.LOGIN.token && game.GLOBAL && game.GLOBAL._apiURL); };
    q<HTMLElement>("bw-acct-h").style.display = q<HTMLElement>("bw-acct").style.display = loggedIn() ? "" : "none";
    const form = q<HTMLFormElement>("bw-pwform");
    const msg = q<HTMLElement>("bw-pwmsg");
    const say = (text: string, ok: boolean) => { msg.textContent = text; msg.className = "bw-msg " + (ok ? "ok" : "bad"); };
    // (typing here is the page's: the game's keys stay out of it)
    for (const ev of ["keydown", "keyup", "keypress"]) form.addEventListener(ev, (e) => e.stopPropagation());
    q<HTMLButtonElement>("bw-pw").onclick = () => {
      form.style.display = form.style.display === "none" ? "" : "none";
      try { const game = gameOf(); q<HTMLInputElement>("bw-pwuser").value = String(game?.LOGIN?._email || game?.LOGIN?.email || ""); } catch { /* none */ }
      if (form.style.display === "") q<HTMLInputElement>("bw-pwold").focus();
    };
    form.onsubmit = async (e) => {
      e.preventDefault();
      const oldPassword = q<HTMLInputElement>("bw-pwold").value;
      const newPassword = q<HTMLInputElement>("bw-pwnew").value;
      if (!oldPassword) return say(tr("io_acc_pw_need", "Type your current password."), false);
      if (newPassword.length < 8 || !/[^a-zA-Z0-9]/.test(newPassword)) return say(tr("io_t3k_sh_pw_short", "The new password needs 8 or more characters, one of them a symbol."), false);
      if (newPassword !== q<HTMLInputElement>("bw-pwnew2").value) return say(tr("io_t3k_sh_pw_diff", "The two new passwords are different."), false);
      if (!loggedIn()) return say(tr("io_acc_login_first", "Log in first."), false);
      const go = q<HTMLButtonElement>("bw-pwgo");
      go.disabled = true;
      say(tr("io_acc_saving", "Saving…"), true);
      try {
        const game = gameOf();
        const r = await fetch(game.GLOBAL._apiURL + "player/changepassword", { method: "POST", headers: { "Authorization": "Bearer " + game.LOGIN.token, "Content-Type": "application/json" }, body: JSON.stringify({ oldPassword, newPassword }) });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.error === 0) {
          say(tr("io_t3k_sh_pw_done", "Password changed. Other devices are signed out."), true);
          for (const id of ["bw-pwold", "bw-pwnew", "bw-pwnew2"]) q<HTMLInputElement>(id).value = "";
        } else {
          say(String(j.error && j.error !== 0 ? j.error : (j.message || tr("io_acc_err_retry", "That didn't work. Try again in a moment."))), false);
        }
      } catch {
        say(tr("io_acc_err_net", "Couldn't reach the server. Try again in a moment."), false);
      } finally {
        go.disabled = false;
      }
    };
    // (Inferno-only, QoL #197, #199, #516: the rest of Account: the name, the email, the Shiny lock, and signing out with
    // this computer forgotten; one form open at a time. Only the signed-in player's own account: every request carries
    // this game's login, and the server checks the current password for the email and the lock.)
    const accountForms = ["bw-nameform", "bw-mailform", "bw-pwform", "bw-lockform"];
    const only = (id: string): boolean => {
      let open = false;
      for (const f of accountForms) {
        const x = q<HTMLElement>(f);
        if (f === id) { x.style.display = x.style.display === "none" ? "" : "none"; open = x.style.display === ""; }
        else x.style.display = "none";
      }
      return open;
    };
    for (const f of ["bw-nameform", "bw-mailform", "bw-lockform"]) for (const ev of ["keydown", "keyup", "keypress"]) q<HTMLElement>(f).addEventListener(ev, (e) => e.stopPropagation());
    const sayIn = (id: string) => (text: string, ok: boolean): void => { const m = q<HTMLElement>(id); m.textContent = text; m.className = "bw-msg " + (ok ? "ok" : "bad"); };
    const errOf = (r: Response, j: any): string => String(j && j.error && j.error !== 0 ? j.error : (j && j.message) || (r.status === 429 ? tr("io_acc_err_many", "Too many tries. Please wait a while.") : tr("io_acc_err_retry", "That didn't work. Try again in a moment.")));
    const netErr = () => tr("io_acc_err_net", "Couldn't reach the server. Try again in a moment.");
    const call = async (path: string, body: unknown, method: string = "POST"): Promise<{ r: Response; j: any; ok: boolean }> => {
      const game = gameOf();
      const headers: Record<string, string> = { "Authorization": "Bearer " + game.LOGIN.token };
      if (method === "POST") headers["Content-Type"] = "application/json";
      const r = await fetch(game.GLOBAL._apiURL + path, method === "POST" ? { method, headers, body: JSON.stringify(body) } : { method, headers });
      const j: any = await r.json().catch(() => ({}));
      return { r, j, ok: r.ok && j.error === 0 };
    };
    const who = () => {
      const game = gameOf();
      q<HTMLElement>("bw-acct-who").textContent = loggedIn() ? tr("io_acc_who", "Signed in as #v1# (#v2#)", { v1: String(game.LOGIN._playerName || ""), v2: String(game.LOGIN._email || "") }) : "";
    };
    // (the password form, opened by its own button, closes the others)
    const pwButton = q<HTMLButtonElement>("bw-pw");
    const pwOpen = pwButton.onclick;
    pwButton.onclick = (e) => { for (const f of ["bw-nameform", "bw-mailform", "bw-lockform"]) q<HTMLElement>(f).style.display = "none"; pwOpen?.call(pwButton, e); };

    // the name (QoL #197: player/changeusername, its 6 months' wait shown)
    const nameSay = sayIn("bw-namemsg");
    q<HTMLButtonElement>("bw-name").onclick = async () => {
      if (!only("bw-nameform")) return;
      nameSay("", true);
      const input = q<HTMLInputElement>("bw-namenew");
      input.value = String(gameOf()?.LOGIN?._playerName || "");
      input.focus();
      input.select();
      if (!loggedIn()) return;
      try {
        const { j, ok } = await call("player/account", null, "GET");
        if (ok && !j.canChangeUsername && j.nextChangeAt) {
          q<HTMLElement>("bw-namehint").textContent = tr("io_acc_name_wait", "You can change your name again on #v1#.", { v1: new Date(j.nextChangeAt).toLocaleDateString() });
        }
      } catch { /* the hint stays */ }
    };
    q<HTMLFormElement>("bw-nameform").onsubmit = async (e) => {
      e.preventDefault();
      const name = q<HTMLInputElement>("bw-namenew").value.trim();
      if (!/^[a-zA-Z0-9_]{2,12}$/.test(name)) return nameSay(tr("io_acc_name_bad", "Use 2 to 12 letters, numbers or _ (no spaces)."), false);
      if (!loggedIn()) return nameSay(tr("io_acc_login_first", "Log in first."), false);
      if (name === String(gameOf()?.LOGIN?._playerName || "")) return nameSay(tr("io_acc_name_same", "That is already your name."), false);
      const go = q<HTMLButtonElement>("bw-namego");
      go.disabled = true;
      nameSay(tr("io_acc_saving", "Saving…"), true);
      try {
        const { r, j, ok } = await call("player/changeusername", { username: name });
        if (ok) {
          const now = String(j.username || name);
          gameOf()?.LOGIN?.ioNameChanged?.(now);
          nameSay(tr("io_acc_name_done", "Your name is now #v1#. Reload the game to see it everywhere.", { v1: now }), true);
          who();
        } else nameSay(errOf(r, j), false);
      } catch {
        nameSay(netErr(), false);
      } finally {
        go.disabled = false;
      }
    };

    // the email (QoL #199: player/changeemail with the current password; the game's login and this browser's saved
    // login move to it: LOGIN.ioEmailChanged)
    const mailSay = sayIn("bw-mailmsg");
    q<HTMLButtonElement>("bw-mail").onclick = () => { if (only("bw-mailform")) { mailSay("", true); q<HTMLInputElement>("bw-mailnew").focus(); } };
    q<HTMLFormElement>("bw-mailform").onsubmit = async (e) => {
      e.preventDefault();
      const email = q<HTMLInputElement>("bw-mailnew").value.trim().toLowerCase();
      const password = q<HTMLInputElement>("bw-mailpw").value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return mailSay(tr("io_acc_mail_bad", "Please enter a valid email address."), false);
      if (!password) return mailSay(tr("io_acc_pw_need", "Type your current password."), false);
      if (!loggedIn()) return mailSay(tr("io_acc_login_first", "Log in first."), false);
      const game = gameOf();
      const oldEmail = String(game.LOGIN._email || "");
      if (email === oldEmail.toLowerCase()) return mailSay(tr("io_acc_mail_same", "That is already your email."), false);
      const go = q<HTMLButtonElement>("bw-mailgo");
      go.disabled = true;
      mailSay(tr("io_acc_saving", "Saving…"), true);
      try {
        // (not while the yard is being saved: the game's login changes with the email; up to 5 s)
        for (let i = 0; i < 25 && game.BASE && game.BASE._saving; i++) await new Promise((done) => setTimeout(done, 200));
        const keep = !(typeof game.LOGIN.ioTabNoKeep === "function" && game.LOGIN.ioTabNoKeep());
        const { r, j, ok } = await call("player/changeemail", { email, password, iokeep: keep ? "1" : "0" });
        if (ok && j.token) {
          const now = String(j.email || email);
          game.LOGIN.ioEmailChanged(oldEmail, now, String(j.token));
          q<HTMLInputElement>("bw-mailpw").value = "";
          mailSay(tr("io_acc_mail_done", "Your email is now #v1#. Sign in with it from now on.", { v1: now }), true);
          who();
        } else mailSay(errOf(r, j), false);
      } catch {
        mailSay(netErr(), false);
      } finally {
        go.disabled = false;
      }
    };

    // the Shiny lock (QoL #197: player/shinylock with the current password; the game asks over it: IoShinyLock)
    const lockSay = sayIn("bw-lockmsg");
    const lockSel = q<HTMLSelectElement>("bw-lockabove");
    const lockShow = (above: number) => {
      const v = String(Math.max(0, above | 0));
      if (![...lockSel.options].some((o) => o.value === v)) {
        const o = document.createElement("option");
        o.value = v;
        o.textContent = tr("io_acc_lock_n", "Over #v1# Shiny", { v1: Number(v).toLocaleString() });
        lockSel.appendChild(o);
      }
      lockSel.value = v;
    };
    q<HTMLButtonElement>("bw-lock").onclick = async () => {
      if (!only("bw-lockform")) return;
      lockSay("", true);
      lockShow(Number(gameOf()?.IoShinyLock?.above) || 0);
      if (!loggedIn()) return;
      try {
        const { j, ok } = await call("player/account", null, "GET");
        if (ok && j.settings) lockShow(Number(j.settings.shinyLockAbove) || 0);
      } catch { /* as the game has it */ }
    };
    q<HTMLFormElement>("bw-lockform").onsubmit = async (e) => {
      e.preventDefault();
      const password = q<HTMLInputElement>("bw-lockpw").value;
      if (!password) return lockSay(tr("io_acc_pw_need", "Type your current password."), false);
      if (!loggedIn()) return lockSay(tr("io_acc_login_first", "Log in first."), false);
      const above = Number(lockSel.value) | 0;
      const go = q<HTMLButtonElement>("bw-lockgo");
      go.disabled = true;
      lockSay(tr("io_acc_saving", "Saving…"), true);
      try {
        const { r, j, ok } = await call("player/shinylock", { password, above });
        if (ok) {
          gameOf()?.IoShinyLock?.ioSet?.(Number(j.above) || 0);
          q<HTMLInputElement>("bw-lockpw").value = "";
          lockSay(above > 0 ? tr("io_acc_lock_done_on", "Saved: spending over #v1# Shiny asks for your password.", { v1: above.toLocaleString() }) : tr("io_acc_lock_done_off", "Saved: the Shiny lock is off."), true);
        } else lockSay(errOf(r, j), false);
      } catch {
        lockSay(netErr(), false);
      } finally {
        go.disabled = false;
      }
    };

    // signed out with this computer forgotten (QoL #516: LOGIN.ioSignOutAndForget, then Switch account)
    q<HTMLButtonElement>("bw-forget").onclick = () => {
      if (!loggedIn()) return;
      if (!window.confirm(tr("io_acc_forget_ask", "Sign out, and take your name off this browser's login page? Your yard is saved first."))) return;
      panel.style.display = "none";
      gameOf()?.LOGIN?.ioSignOutAndForget?.();
    };

    // (Inferno-only, QoL #200: the account's signed-in browsers: where it is playing now, and the browsers that sign
    // in by its name on the login page (saved logins), this one marked; one signed out, or all but this game and this
    // browser. player/sessions and player/sessions/end, server/src/controllers/auth/accountSessions.ts)
    const sessBox = q<HTMLElement>("bw-sessbox");
    const sessSay = sayIn("bw-sessmsg");
    let sessEnd = async (_body: Record<string, unknown>): Promise<void> => {};
    const sessShow = (list: any[]): void => {
      const box = q<HTMLElement>("bw-sesslist");
      box.textContent = "";
      const rows = (Array.isArray(list) ? list : []).filter((x) => x && x.id);
      const others = rows.filter((x) => !x.current);
      if (!others.length) {
        const none = el("div", "bw-hint");
        none.textContent = tr("io_acc_sess_none", "Signed in only here.");
        box.appendChild(none);
      }
      for (const x of rows) {
        const row = el("div", "bw-sess");
        const text = el("span", "");
        const name = document.createElement("b");
        const agent = String(x.agent || tr("io_acc_sess_browser", "a browser"));
        name.textContent = x.kind === "play"
          ? (x.type === "launcher" ? tr("io_acc_sess_launcher", "Launcher app: #v1#", { v1: agent }) : tr("io_acc_sess_play", "Playing: #v1#", { v1: agent }))
          : tr("io_acc_sess_saved", "Remembered: #v1#", { v1: agent });
        text.appendChild(name);
        // (16 October: in the game's own words for when, "5 minutes ago" and "15 Oct 2026, 14:32", as everywhere in it;
        // the browser's long "10/16/2026, 11:56:35 PM" made every row two lines)
        const at = x.lastUsed
          ? tr("io_acc_sess_used", "last used #v1#", { v1: when(x.lastUsed, true) })
          : tr("io_acc_sess_since", "since #v1#", { v1: when(x.since, false) });
        text.appendChild(document.createTextNode(" · " + at));
        if (x.current) {
          const mine = el("span", "bw-this");
          mine.textContent = " " + tr("io_acc_sess_this", "(this one)");
          text.appendChild(mine);
        }
        row.appendChild(text);
        // (this game itself isn't signed out from here: Switch account does that)
        if (!(x.current && x.kind === "play")) {
          const out = el("button", "bw-wide") as HTMLButtonElement;
          out.type = "button";
          out.textContent = tr("io_acc_sess_out", "Sign out");
          out.onclick = () => { out.disabled = true; void sessEnd({ id: String(x.id) }); };
          row.appendChild(out);
        }
        box.appendChild(row);
      }
      q<HTMLButtonElement>("bw-sessall").disabled = !others.length;
    };
    const sessLoad = async (): Promise<void> => {
      if (!loggedIn()) return;
      sessSay(tr("io_acc_sess_loading", "Loading…"), true);
      try {
        const { r, j, ok } = await call("player/sessions", {});
        if (ok) { sessSay("", true); sessShow(j.sessions); } else sessSay(errOf(r, j), false);
      } catch {
        sessSay(netErr(), false);
      }
    };
    sessEnd = async (body: Record<string, unknown>): Promise<void> => {
      if (!loggedIn()) return;
      try {
        const { r, j, ok } = await call("player/sessions/end", body);
        if (ok) {
          sessShow(j.sessions);
          sessSay(Number(j.ended) > 0 ? tr("io_acc_sess_done", "Signed out: #v1#.", { v1: Number(j.ended) }) : tr("io_acc_sess_nothing", "Nothing else was signed in."), true);
        } else sessSay(errOf(r, j), false);
      } catch {
        sessSay(netErr(), false);
      }
    };
    q<HTMLButtonElement>("bw-sess").onclick = () => {
      const open = sessBox.style.display === "none";
      for (const f of accountForms) q<HTMLElement>(f).style.display = "none";
      sessBox.style.display = open ? "" : "none";
      if (open) void sessLoad();
    };
    q<HTMLButtonElement>("bw-sessall").onclick = () => {
      if (!window.confirm(tr("io_acc_sess_all_ask", "Sign out everywhere else? This game stays signed in; other browsers ask for your password again."))) return;
      void sessEnd({ others: 1 });
    };

    // (QoL #473) Photo mode
    q<HTMLButtonElement>("bw-photo").onclick = () => openPhoto();
    acctRefresh = () => {
      for (const x of panel.querySelectorAll<HTMLElement>("[data-k]")) {
        if (x.dataset.en == null) x.dataset.en = x.textContent || "";
        x.textContent = tr(String(x.dataset.k), x.dataset.en);
      }
      for (const x of panel.querySelectorAll<HTMLInputElement>("[data-kp]")) {
        if (x.dataset.en == null) x.dataset.en = x.placeholder || "";
        x.placeholder = tr(String(x.dataset.kp), x.dataset.en);
      }
      who();
      const photo = photoReady() ? "" : "none";
      q<HTMLElement>("bw-photo-row").style.display = photo;
      q<HTMLElement>("bw-photo-hint").style.display = photo;
    };
    acctRefresh();

    // (9 October, the user's: "a button in it to hide settings button (reappears on refresh)": for this page only,
    // nothing saved)
    q<HTMLButtonElement>("bw-hide").onclick = () => {
      panel.style.display = "none";
      gear.style.display = "none";
      if (fabBtn) fabBtn.style.display = "none";
      fsGear?.classList.remove("on"); // (QoL #225: F10 still opens the settings in full screen)
    };
    const fs = panel.querySelector<HTMLButtonElement>("#bw-fs");
    if (fs) fs.onclick = () => { panel.style.display = "none"; goFullscreen(); };
    fetch("version.json?t=" + Date.now(), { cache: "no-store" }).then((r) => r.json()).then((v) => {
      const b = q<HTMLElement>("bw-build");
      if (b) b.textContent = tr("io_t3k_sh_build", "Client build #v1# · #v2#", { v1: String(v.build ?? "?"), v2: String(v.id ?? "") });
    }).catch(() => {});
  };
  render();

  // ------------------------------------------------------------------ frame rate readout
  let lastFrames = 0, lastShown = 0, lastT = performance.now();
  setInterval(() => {
    const show = showOf(s);
    if (!api || show === "off") return;
    const now = performance.now(), f = api.stats.frames, shown = api.interp?.stats.shown ?? 0;
    const rate = (n: number) => Math.round((n * 1000) / (now - lastT));
    // (19 October, the user's: "fps", the drawings a second; "ticks", the game's own updates a second)
    const fpsText = tr("io_t3k_sh_rate_fps", "#v1# fps", { v1: rate(shown - lastShown) });
    const tickText = tr("io_t3k_sh_rate_ticks", "#v1# ticks", { v1: rate(f - lastFrames) });
    const text = show === "fps" ? fpsText : show === "ticks" ? tickText : `${fpsText} · ${tickText}`;
    fps.textContent = text;
    if (fabFps) fabFps.textContent = text;
    lastFrames = f; lastShown = shown; lastT = now;
  }, 1000);

  /** Touch screens: full-screen layout, menu button, portrait tip, keyboard avoidance, no page gestures. */
  function setupMobile(): void {
    document.documentElement.classList.add("bw-m"); // page-wide: the settings sheet lives outside the game root
    // Tells the game (its FlashVars, read in GAME.ts as GLOBAL.ioOnPhone): the menu button below sits at the top
    // centre, over the game, so the top bar's shortcuts keep clear of it (UI_TOP.ioTopBars).
    parameters.iomobile = "1";
    bar.style.display = "none";
    const fab = el("button", "bw-fab") as HTMLButtonElement;
    fab.innerHTML = ICON_GEAR;
    fab.title = "Menu";
    fabFps = el("span", "");
    fab.appendChild(fabFps);
    fab.addEventListener("click", (e) => { e.stopPropagation(); togglePanel(); });
    root.appendChild(fab);
    fabBtn = fab;
    // iOS Safari's own pinch-zoom of the page
    for (const t of ["gesturestart", "gesturechange"]) document.addEventListener(t, (e) => e.preventDefault(), { passive: false } as any);
    // made for landscape: one tip per visit when held upright
    const rotateTip = () => {
      if (sessionStorage.getItem("bw-rotate") || window.innerWidth > window.innerHeight || Math.min(window.innerWidth, window.innerHeight) > 700) return;
      const tip = el("div", "bw-rotate");
      tip.innerHTML = `<div><div style="font-size:40px">⟳</div>Turn your device sideways.<br>The game is made for landscape.<br><button>Continue anyway</button></div>`;
      tip.querySelector("button")!.onclick = () => tip.remove();
      window.addEventListener("resize", () => { if (window.innerWidth > window.innerHeight) tip.remove(); });
      sessionStorage.setItem("bw-rotate", "1");
      root.appendChild(tip);
    };
    rotateTip();
    // Keep the field being typed into above the on-screen keyboard: slide the game up while it's open.
    const vv = window.visualViewport;
    const avoidKeyboard = () => {
      const r = api?.focusedInputRect?.();
      const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
      const keyboardOpen = vv ? vv.height < window.innerHeight - 80 : false;
      const overlap = r && keyboardOpen ? r.bottom + 12 - visibleBottom : 0;
      const current = Number(frame.dataset.shift || 0);
      const next = overlap > 0 ? current - overlap : keyboardOpen && r ? current : 0;
      if (next !== current) { frame.dataset.shift = String(next); frame.style.transform = next ? `translateY(${next}px)` : ""; }
      if (window.scrollY || window.scrollX) window.scrollTo(0, 0); // iOS scrolls the page to the focused input
    };
    vv?.addEventListener("resize", avoidKeyboard);
    vv?.addEventListener("scroll", avoidKeyboard);
    setInterval(avoidKeyboard, 400);
  }

  return {
    container: win,
    /** Applies the saved settings once the player runs (query parameters given for testing win). */
    attach(p: PlayerApi): void {
      api = p;
      (window as any).__ioLoad?.done?.(); // (QoL #239)
      loading.remove();
      if (parameters.hidpi === undefined) p.settings.hidpi = s.hidpi;
      if (parameters.quality === undefined) p.settings.dynamic = s.dynamic;
      if (parameters.redraw === undefined) p.settings.fullRedraw = s.fullRedraw;
      // (18 October: the frame rate limit sets the interpolation: Player.capInterp)
      if (parameters.fpscap === undefined && parameters.interp === undefined) p.settings.fpsCap = capOf(s);
      if (parameters.noglow === undefined) p.settings.noGlow = s.noGlow === true; // (QoL #242)
      if (parameters.uiscale === undefined) p.settings.uiScale = uiScaleOf(s); // (QoL #227)
      p.applySettings({ renderScale: s.hidpi ? 1 : s.renderScale, maxDensity: s.maxDensity });
      applyVolume();
      document.addEventListener("visibilitychange", applyVolume);
      lastFrames = p.stats.frames;
    },
  };
}

/**
 * (Inferno-only) The game's words for the page's newer lines (KEYS, once the game has its language), or the English
 * given, #v1# and the like filled in (the page shows before the game has loaded).
 */
function tr(key: string, en: string, vars?: Record<string, string | number>): string {
  try {
    const keys = (window as any).__game?.KEYS;
    const said = keys && typeof keys.Get === "function" ? String(keys.Get(key, vars ?? null)) : "";
    if (said && said !== key) return said;
  } catch { /* not loaded yet */ }
  let out = en;
  if (vars) for (const v of Object.keys(vars)) out = out.split("#" + v + "#").join(String(vars[v]));
  return out;
}

/** A time (ms or ISO) the game's way: "5 minutes ago" (`ago`), or "15 Oct 2026, 14:32"; the browser's, before the game loads. */
function when(ms: number | string, ago: boolean): string {
  try {
    const f = (window as any).__game?.IoFormat;
    // (the server's time: ms, or an ISO date)
    const sec = Math.floor(new Date(ms).getTime() / 1000);
    const said = f && sec > 0 ? String(ago ? f.ago(sec) : f.dateTime(sec)) : "";
    if (said) return said;
  } catch { /* not loaded yet */ }
  return new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function el(tag: string, cls: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
}
