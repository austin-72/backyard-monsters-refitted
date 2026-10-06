/**
 * The web page around the game: a top bar (title, FPS readout, full screen, settings) and the game
 * window, 760 x 670 by default like the Flash projector, resizable by dragging just outside any of its
 * edges or corners. Settings are kept in the browser (localStorage) and applied to the player.
 */
import { setPageVolume } from "../flash/media/index";
import { runtimeHooks } from "../flash/_runtime";

interface Settings {
  width: number; height: number;
  renderScale: number; hidpi: boolean; maxDensity: number; dynamic: boolean;
  fps: boolean; volume: number; fullRedraw: boolean;
  /** frame interpolation: made-up frames between two of the game's (0 = off) */
  interpolate: number;
}
const DEFAULTS: Settings = { width: 760, height: 670, renderScale: 1, hidpi: false, maxDensity: 4, dynamic: false, fps: false, volume: 1, fullRedraw: false, interpolate: 0 };
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
html, body { margin: 0; height: 100%; overflow: hidden; background: #111; font: 13px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; color: #ddd; }
#game { position: fixed; inset: 0; }
.bw-bar { position: absolute; left: 0; right: 0; top: 0; height: ${BAR}px; display: flex; align-items: center; gap: 8px; padding: 0 12px; box-sizing: border-box; }
.bw-title { font-weight: 600; color: #bbb; letter-spacing: .2px; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bw-fps { font: 12px ui-monospace, Consolas, monospace; color: #8c8; min-width: 56px; text-align: right; }
.bw-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #333; background: #1d1d1f; color: #ccc; cursor: pointer; display: grid; place-items: center; padding: 0; }
.bw-btn:hover { background: #2a2a2d; color: #fff; }
.bw-area { position: absolute; left: 0; right: 0; top: ${BAR}px; bottom: 0; display: grid; place-items: center; }
.bw-frame { position: relative; box-shadow: 0 0 0 1px #333, 0 8px 32px rgba(0,0,0,.6); }
.bw-win { position: absolute; inset: 0; background: #fff; }
.bw-h { position: absolute; z-index: 2; }
.bw-size { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); background: rgba(0,0,0,.75); color: #fff; padding: 6px 12px; border-radius: 6px; font: 14px ui-monospace, Consolas, monospace; pointer-events: none; z-index: 3; }
.bw-panel { position: fixed; top: ${BAR + 4}px; right: 12px; width: 300px; max-height: calc(100% - ${BAR + 20}px); overflow: auto; background: #1c1c1e; border: 1px solid #333; border-radius: 10px; box-shadow: 0 12px 40px rgba(0,0,0,.6); padding: 12px 14px; z-index: 10; }
.bw-panel h3 { margin: 12px 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: .8px; color: #888; }
.bw-panel h3:first-child { margin-top: 0; }
.bw-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 6px 0; }
.bw-hint { color: #888; font-size: 12px; margin: 2px 0 6px; }
.bw-panel select, .bw-panel input[type=range] { width: 150px; }
.bw-panel select { background: #2a2a2d; color: #ddd; border: 1px solid #444; border-radius: 6px; padding: 3px 6px; }
.bw-sizes { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0; }
.bw-sizes button, .bw-panel .bw-wide { background: #2a2a2d; color: #ddd; border: 1px solid #444; border-radius: 6px; padding: 4px 8px; cursor: pointer; font: inherit; }
.bw-sizes button:hover, .bw-panel .bw-wide:hover { background: #38383c; }
.bw-foot { margin-top: 12px; color: #666; font-size: 11px; }
.bw-panel, .bw-panel * { touch-action: manipulation; -webkit-user-select: none; user-select: none; }
.bw-panel { touch-action: pan-y; }
/* touch screens: the game fills the screen (clear of notches), a small menu button, a centred sheet */
.bw-m .bw-area { top: 0; padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); box-sizing: border-box; }
.bw-m .bw-frame { width: 100% !important; height: 100% !important; box-shadow: none; transition: transform .15s ease-out; }
.bw-fab { position: fixed; top: calc(env(safe-area-inset-top) + 4px); left: 50%; transform: translateX(-50%); z-index: 5; height: 26px; min-width: 40px; padding: 0 10px; border-radius: 13px; border: 1px solid rgba(255,255,255,.25); background: rgba(0,0,0,.45); color: #eee; display: flex; align-items: center; gap: 6px; font: 12px ui-monospace, Consolas, monospace; }
.bw-fab svg { width: 15px; height: 15px; }
.bw-m .bw-panel { top: 50%; left: 50%; right: auto; transform: translate(-50%, -50%); width: min(360px, 92vw); max-height: 86vh; font-size: 15px; padding: 14px 16px; }
.bw-m .bw-panel select { width: 170px; font-size: 15px; padding: 6px; }
.bw-m .bw-panel input[type=checkbox] { width: 22px; height: 22px; }
.bw-m .bw-panel input[type=range] { width: 170px; }
.bw-m .bw-panel .bw-wide { padding: 8px 12px; }
.bw-rotate { position: fixed; inset: 0; z-index: 20; background: rgba(10,10,10,.92); display: grid; place-items: center; text-align: center; padding: 24px; color: #eee; font-size: 17px; }
.bw-rotate button { margin-top: 18px; background: #2a2a2d; color: #eee; border: 1px solid #555; border-radius: 8px; padding: 10px 18px; font-size: 15px; }
`;

const ICON_GEAR = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
const ICON_FULL = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>`;

export interface PlayerApi {
  stats: { frames: number };
  settings: { renderScale: number; hidpi: boolean; maxDensity: number; dynamic: boolean; fullRedraw: boolean; interpolate: number };
  interp?: { stats: { shown: number } };
  focusedInputRect?(): { top: number; bottom: number } | null;
  applySettings(p: Partial<PlayerApi["settings"]>): void;
}

export function createShell(root: HTMLElement, parameters: Record<string, string>) {
  const mobile = parameters.mobile === "1" || (parameters.mobile !== "0" && TOUCH_ONLY);
  const s = load(mobile);
  let fabFps: HTMLElement | null = null; // the frame rate inside the touch-screen menu button
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);
  root.innerHTML = "";

  const bar = el("div", "bw-bar");
  const title = el("div", "bw-title");
  title.textContent = document.title;
  const fps = el("div", "bw-fps");
  const fullBtn = el("button", "bw-btn") as HTMLButtonElement;
  fullBtn.title = "Full screen";
  fullBtn.innerHTML = ICON_FULL;
  const gear = el("button", "bw-btn") as HTMLButtonElement;
  gear.title = "Settings";
  gear.innerHTML = ICON_GEAR;
  bar.append(title, fps, fullBtn, gear);

  const area = el("div", "bw-area");
  // frame: sized, holds the resize handles outside its edges; win: the player's container (it clips)
  const frame = el("div", "bw-frame");
  const win = el("div", "bw-win");
  frame.appendChild(win);
  area.appendChild(frame);
  root.append(bar, area);

  // ?shell=0: the game fills the page, without the bar (tests, embedding)
  if (parameters.shell === "0") {
    bar.style.display = "none";
    area.style.top = "0";
    Object.assign(frame.style, { width: "100%", height: "100%", boxShadow: "none" });
    return { container: win, attach(p: PlayerApi) { p.applySettings({}); } };
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
  const goFullscreen = () => {
    const target = mobile ? document.documentElement : win;
    target.requestFullscreen?.().then(() => { (screen.orientation as any)?.lock?.("landscape").catch(() => {}); }).catch(() => {});
  };
  fullBtn.addEventListener("click", goFullscreen);
  // The game's own full-screen button, in a browser without element full screen (iPhone Safari): say why
  // nothing happens, and how to get full screen there (the home-screen icon opens without browser bars).
  runtimeHooks.fullScreenUnavailable = () => {
    if (STANDALONE || root.querySelector(".bw-rotate")) return;
    const tip = el("div", "bw-rotate");
    tip.innerHTML = IOS
      ? `<div>Safari on iPhone can't show web pages in full screen.<br><br>For full screen: tap Share, then <b>Add to Home Screen</b>,<br>and start the game from the new icon.<br><button>OK</button></div>`
      : `<div>This browser can't show the game in full screen.<br><button>OK</button></div>`;
    tip.querySelector("button")!.onclick = () => tip.remove();
    root.appendChild(tip);
  };
  // in full screen the game fills the screen; the frame's size applies again afterwards
  document.addEventListener("fullscreenchange", () => {
    const on = !!document.fullscreenElement;
    bar.style.visibility = on || mobile ? "hidden" : "";
    panel.style.display = "none";
  });

  // ------------------------------------------------------------------ settings panel
  const panel = el("div", "bw-panel");
  panel.style.display = "none";
  document.body.appendChild(panel);
  gear.addEventListener("click", (e) => { e.stopPropagation(); panel.style.display = panel.style.display === "none" ? "" : "none"; });
  document.addEventListener("pointerdown", (e) => { if (panel.style.display !== "none" && !panel.contains(e.target as Node) && e.target !== gear && !gear.contains(e.target as Node)) panel.style.display = "none"; });

  let api: PlayerApi | null = null;
  const applyDisplay = () => api?.applySettings({ renderScale: s.hidpi ? 1 : s.renderScale, hidpi: s.hidpi, maxDensity: s.maxDensity, dynamic: s.dynamic, fullRedraw: s.fullRedraw, interpolate: s.interpolate | 0 });
  const hidpiAvailable = (window.devicePixelRatio || 1) > 1;

  const render = () => {
    const dpr = window.devicePixelRatio || 1;
    const resValue = s.hidpi ? (s.maxDensity <= 2 && dpr > 2 ? "2x" : "hidpi") : String(s.renderScale);
    panel.innerHTML = `
      <h3>Display</h3>
      <div class="bw-row"><label for="bw-res">Resolution</label>
        <select id="bw-res">
          <option value="1">Full (100%)</option>
          ${dpr > 2 ? `<option value="2x">Sharp (2×)</option>` : ""}
          ${hidpiAvailable ? `<option value="hidpi">Sharpest (screen resolution)</option>` : ""}
          <option value="0.75">Balanced (75%)</option>
          <option value="0.5">Performance (50%)</option>
        </select></div>
      <div class="bw-row"><label for="bw-dyn">Dynamic resolution</label><input id="bw-dyn" type="checkbox"></div>
      <div class="bw-hint">Lowers the resolution automatically while the game can't keep up, and raises it again when it can.</div>
      <div class="bw-row"><label for="bw-ip">Frame interpolation</label>
        <select id="bw-ip">
          <option value="0">Off</option>
          <option value="1">1 frame between (80 fps)</option>
          <option value="2">2 frames between (120 fps)</option>
          <option value="3">3 frames between (160 fps)</option>
          <option value="4">4 frames between (200 fps)</option>
        </select></div>
      <div class="bw-hint">The game runs at 40 frames a second. This shows made-up frames between them, so moving things look smoother (best on a 120 Hz or faster screen). Costs more drawing; shows the game a fraction of a frame later. Frames that don't fit in time are left out.</div>
      <div class="bw-row"><label for="bw-fpsc">Show frame rate</label><input id="bw-fpsc" type="checkbox"></div>
      ${mobile ? `<h3>Screen</h3>
      ${document.fullscreenEnabled ? `<div class="bw-row"><button class="bw-wide" id="bw-fs">Full screen</button></div>`
        : IOS && !STANDALONE ? `<div class="bw-hint">For full screen on iPhone: tap Share, then <b>Add to Home Screen</b>, and start the game from the new icon.</div>` : ""}
      <div class="bw-hint">Drag with one finger to scroll the map, pinch with two to zoom.</div>` : ""}
      <h3 ${mobile ? `style="display:none"` : ""}>Window</h3>
      <div class="bw-sizes" ${mobile ? `style="display:none"` : ""}>
        <button data-w="760" data-h="670">760×670 (Flash)</button>
        <button data-w="1024" data-h="768">1024×768</button>
        <button data-w="1280" data-h="800">1280×800</button>
        <button data-fit="1">Fit browser</button>
      </div>
      ${mobile ? "" : `<div class="bw-hint">Drag just outside the game's edges or corners to resize it. Double-click an edge to go back to 760×670.</div>`}
      <h3>Sound</h3>
      <div class="bw-row"><label for="bw-vol">Volume</label><input id="bw-vol" type="range" min="0" max="100"></div>
      <h3>Troubleshooting</h3>
      <div class="bw-row"><label for="bw-full">Redraw everything every frame</label><input id="bw-full" type="checkbox"></div>
      <div class="bw-hint">Slower. Only useful if something on screen is not updated properly.</div>
      <div class="bw-row"><button class="bw-wide" id="bw-reset">Reset settings</button><button class="bw-wide" id="bw-reload">Reload game</button></div>
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
    const dyn = q<HTMLInputElement>("bw-dyn");
    dyn.checked = s.dynamic;
    dyn.onchange = () => { s.dynamic = dyn.checked; save(s); applyDisplay(); };
    const ip = q<HTMLSelectElement>("bw-ip");
    ip.value = String(s.interpolate | 0);
    ip.onchange = () => { s.interpolate = Number(ip.value) | 0; save(s); applyDisplay(); };
    const fpsc = q<HTMLInputElement>("bw-fpsc");
    fpsc.checked = s.fps;
    fpsc.onchange = () => { s.fps = fpsc.checked; save(s); fps.textContent = ""; if (fabFps) fabFps.textContent = ""; };
    for (const b of panel.querySelectorAll<HTMLButtonElement>(".bw-sizes button")) {
      b.onclick = () => b.dataset.fit ? setSize(window.innerWidth - 2 * MARGIN, window.innerHeight - BAR - MARGIN) : setSize(Number(b.dataset.w), Number(b.dataset.h));
    }
    const vol = q<HTMLInputElement>("bw-vol");
    vol.value = String(Math.round(s.volume * 100));
    vol.oninput = () => { s.volume = Number(vol.value) / 100; setPageVolume(s.volume); save(s); };
    const full = q<HTMLInputElement>("bw-full");
    full.checked = s.fullRedraw;
    full.onchange = () => { s.fullRedraw = full.checked; save(s); applyDisplay(); };
    q<HTMLButtonElement>("bw-reset").onclick = () => {
      Object.assign(s, defaultsFor(mobile)); save(s); fit(); setPageVolume(1); applyDisplay(); render();
    };
    q<HTMLButtonElement>("bw-reload").onclick = () => location.reload();
    const fs = panel.querySelector<HTMLButtonElement>("#bw-fs");
    if (fs) fs.onclick = () => { panel.style.display = "none"; goFullscreen(); };
    fetch("version.json?t=" + Date.now(), { cache: "no-store" }).then((r) => r.json()).then((v) => {
      const b = q<HTMLElement>("bw-build");
      if (b) b.textContent = `Client build ${v.build ?? "?"} · ${v.id ?? ""}`;
    }).catch(() => {});
  };
  render();

  // ------------------------------------------------------------------ frame rate readout
  let lastFrames = 0, lastShown = 0, lastT = performance.now();
  setInterval(() => {
    if (!api || !s.fps) return;
    const now = performance.now(), f = api.stats.frames, shown = api.interp?.stats.shown ?? 0;
    const rate = (n: number) => Math.round((n * 1000) / (now - lastT));
    // with interpolation: the game's frames, and the frames shown
    fps.textContent = s.interpolate > 0 ? `${rate(f - lastFrames)} fps · ${rate(shown - lastShown)} shown` : `${rate(f - lastFrames)} fps`;
    if (fabFps) fabFps.textContent = `${rate(f - lastFrames)} fps`;
    lastFrames = f; lastShown = shown; lastT = now;
  }, 1000);

  /** Touch screens: full-screen layout, menu button, portrait tip, keyboard avoidance, no page gestures. */
  function setupMobile(): void {
    document.documentElement.classList.add("bw-m"); // page-wide: the settings sheet lives outside the game root
    // Tells the game (its FlashVars, read in GAME.as as GLOBAL.ioOnPhone): the menu button below sits at the top
    // centre, over the game, so the top bar's shortcuts keep clear of it (UI_TOP.ioTopBars).
    parameters.iomobile = "1";
    bar.style.display = "none";
    const fab = el("button", "bw-fab") as HTMLButtonElement;
    fab.innerHTML = ICON_GEAR;
    fab.title = "Menu";
    fabFps = el("span", "");
    fab.appendChild(fabFps);
    fab.addEventListener("click", (e) => { e.stopPropagation(); panel.style.display = panel.style.display === "none" ? "" : "none"; });
    root.appendChild(fab);
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
      if (parameters.hidpi === undefined) p.settings.hidpi = s.hidpi;
      if (parameters.quality === undefined) p.settings.dynamic = s.dynamic;
      if (parameters.redraw === undefined) p.settings.fullRedraw = s.fullRedraw;
      if (parameters.interp === undefined) p.settings.interpolate = s.interpolate | 0;
      p.applySettings({ renderScale: s.hidpi ? 1 : s.renderScale, maxDensity: s.maxDensity });
      setPageVolume(s.volume);
      lastFrames = p.stats.frames;
    },
  };
}

function el(tag: string, cls: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
}
