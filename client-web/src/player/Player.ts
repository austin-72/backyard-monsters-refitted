/**
 * The browser "Flash Player": creates the stage, constructs the document class,
 * runs the frame loop at the SWF frame rate, renders the display list to a
 * canvas and turns browser input into Flash input events.
 */
import { ByteArray } from "flash/utils";
import { Event, MouseEvent, KeyboardEvent, FocusEvent, UncaughtErrorEvent, FullScreenEvent, TouchEvent, TransformGestureEvent } from "flash/events";
import {
  Stage, LoaderInfo, DisplayObject, DisplayObjectContainer, InteractiveObject, MovieClip, Sprite, SimpleButton,
  player, stageHooks, broadcastLists, renderObject, pick, dragState, activeClips, redrawRegions, setCullRects, rearmDrawOcc, occludedRect, findPrefix, drawPrefix, endPrefix, interp, type M6,
} from "../flash/display/core";
import { TextField, inputBridge, textCache } from "flash/text";
import { cursorState, keyState, Multitouch } from "flash/ui";
import { resumeAudio } from "flash/media";
import { runtimeHooks } from "../flash/_runtime";
import { later, cancelTimer, pageHidden } from "../flash/_clock";
import { filterSettings } from "../flash/filters";
import { cssColor, context2d } from "../flash/_internal";
import { glRememberedBlack } from "../flash/_glYard";

export interface PlayerOptions {
  container: HTMLElement;
  documentClass: any;
  width: number;
  height: number;
  frameRate: number;
  background: number;
  parameters: Record<string, string>;
  url: string;
}

/** (21 October) A real graphics card that WebGL 2 uses, and the page's "Draw with the graphics card" on: player.glDirect. */
function glDirectWanted(): boolean {
  try {
    const st = JSON.parse(localStorage.getItem("bymr-web-settings") || "{}") || {};
    if (st.gl === false) return false;
  } catch (e) { /* no settings */ }
  // (26 October: a card whose frames came out black in this browser before (Renderer, GlYard.blackFrame): not used)
  if (glRememberedBlack()) return false;
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const gl = c.getContext("webgl2") as WebGL2RenderingContext | null;
    if (!gl) return false;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const name = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    const soft = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i.test(name);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return !soft;
  } catch (e) {
    return false;
  }
}

export async function startPlayer(o: PlayerOptions): Promise<any> {
  const canvas = document.createElement("canvas");
  canvas.tabIndex = 0;
  Object.assign(canvas.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", outline: "none", touchAction: "none" });
  if (getComputedStyle(o.container).position === "static") o.container.style.position = "relative";
  o.container.style.overflow = "hidden";
  o.container.appendChild(canvas);
  inputBridge.install(o.container);
  // (21 October) The yard straight from the graphics card (player.glDirect, see display/core): decided now, as the
  // game's canvas then needs an alpha channel, which a context can't change later. Only with a real graphics card
  // (a software one draws the card's canvas more slowly than the canvas itself) and the page's setting on.
  // ?gldirect=1 / 0 for testing.
  const glDirect = o.parameters.gldirect === "1" ? true : o.parameters.gldirect === "0" ? false : glDirectWanted();
  const ctx = context2d(canvas, { alpha: glDirect });
  player.mainCtx = ctx;
  player.glDirect = glDirect;
  player.showGlLayer = (c: HTMLCanvasElement | null, on: boolean) => {
    if (!c) return;
    if (on) {
      if (c.parentNode !== o.container || c.nextSibling !== canvas) {
        Object.assign(c.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", pointerEvents: "none" });
        o.container.insertBefore(c, canvas);
      }
      if (c.style.display === "none") c.style.display = "";
      player.glLayer = c;
    } else {
      if (c.parentNode && c.style.display !== "none") c.style.display = "none";
      if (player.glLayer === c) player.glLayer = null;
    }
  };

  const stage = new Stage();
  stage.$frameRate = o.frameRate;
  stage.$color = o.background;
  player.stage = stage;

  const info = new LoaderInfo();
  info.$url = o.url;
  info.$parameters = { ...o.parameters };
  info.$bytes = new ByteArray();
  info.$width = o.width;
  info.$height = o.height;
  info.$contentType = "application/x-shockwave-flash";
  player.mainLoaderInfo = info;
  // Launcher protocol (Inferno MR2 fork): the game asks the launcher that loaded it to restart it by
  // dispatching a cancelable "io_restart" on loaderInfo.sharedEvents (Switch Account, new build).
  // In the browser the page is the launcher: accept the request and reload, without a login token
  // in the address so the game opens on its login page.
  info.$shared.addEventListener("io_restart", (e: Event) => {
    e.preventDefault();
    setTimeout(() => {
      const u = new URL(location.href);
      u.searchParams.delete("token");
      location.replace(u.toString());
    }, 0);
  });

  // ------------------------------------------------------------ errors
  let reporting = false;
  runtimeHooks.uncaught = (e: unknown) => {
    const err = toFlashError(e);
    if (reporting) { console.error(err); return; }
    reporting = true;
    try {
      const ev = new UncaughtErrorEvent(UncaughtErrorEvent.UNCAUGHT_ERROR, true, true, err);
      info.$uncaught.dispatchEvent(ev);
      console.error(err);
    } catch (inner) {
      console.error(inner);
    } finally {
      reporting = false;
    }
  };
  player.reportError = runtimeHooks.uncaught;
  const guard = (fn: () => void) => runtimeHooks.guard(fn);

  // ------------------------------------------------------------ deferred events
  let queue: (() => void)[] = [];
  runtimeHooks.defer = (fn) => { queue.push(fn); };
  player.defer = runtimeHooks.defer;

  // ------------------------------------------------------------ layout
  let dpr = 1, scale = 1, offX = 0, offY = 0;
  let fullNext = true; // the next render must draw everything (see render)
  /**
   * Adaptive resolution. Large windows can make each frame's drawing and hand-over to the browser too
   * slow for 40 fps. Every 2 seconds: if frames were late and the game code was not the cause, lower the
   * canvas resolution one step (the browser scales it up; text gets softer); if frames were on time for
   * 6 seconds, go back up one step. A resolution that proved too slow is retried only after 20 seconds,
   * then 40, 80... (slowness while loading must not stick, and a real limit must not oscillate).
   * A window resize starts again at full resolution. ?quality=full turns this off.
   */
  const adaptive = {
    scale: 1, t0: performance.now(), frames: 0, script: 0, slow: 0, fast: 0,
    failed: new Map<number, { until: number; wait: number }>(),
    judge: 0, before: 0, noLowerUntil: 0, // a reduction that did not make frames faster is undone
  };
  const STEP = 0.8, MIN_PIXELS = 900_000;
  /**
   * Display settings (the page's settings panel, src/player/Shell.ts). Dynamic resolution is off by
   * default: a lowered resolution is too visible. Query parameters still override them for testing:
   * ?hidpi=1, ?quality=auto (dynamic on), ?redraw=full.
   */
  // (22 October: ?fpscap= empty, not a number or below 0 ignored: it read as 0, no limit at all)
  const capParam: string = o.parameters.fpscap;
  const capParamOk: boolean = capParam !== undefined && String(capParam).trim() !== "" && Number.isFinite(Number(capParam)) && Number(capParam) >= 0;
  const settings = {
    renderScale: 1, // 1, 0.75, 0.5: fixed rendering resolution, scaled up by the browser
    hidpi: o.parameters.hidpi === "1", // draw at the display's full resolution on scaled displays
    maxDensity: 4, // with hidpi: at most this many canvas pixels per CSS pixel ("Sharp (2x)" uses 2)
    dynamic: o.parameters.quality === "auto", // lower the resolution automatically when frames are late
    fullRedraw: o.parameters.redraw === "full", // redraw the whole window every frame
    // frame interpolation: made-up frames shown between two of the game's (0 = off); ?interp=N for testing
    // (Inferno-only, QoL #241: -1 = Auto, one drawing at every refresh of the screen (requestAnimationFrame); ?interp=auto)
    interpolate: o.parameters.interp === "auto" ? -1 : Math.max(0, Math.min(4, Number(o.parameters.interp) | 0)),
    // (Inferno-only, 18 October, the user's: the frame rate limit: at most this many drawings a second, 0 = no limit
    // (every refresh of the screen); 60 unless chosen; ?fpscap=N for testing. The game itself still runs 40 frames a
    // second, whatever is drawn: its monsters, paths, attacks and timers count those, so nothing goes faster or
    // slower with the limit. Over 40, the frames between the game's are made up (the interpolation above, timed to
    // the screen); at 40 the game's own frames are drawn; under 40 some of them aren't drawn (the game still runs).
    // ?interp=N or auto, for testing, sets the interpolation itself instead.
    fpsCap: capParamOk ? Math.min(1000, Number(capParam) | 0) : o.parameters.interp !== undefined ? 0 : 60,
    // (Inferno-only, QoL #242: no glow filters; ?noglow=1 for testing)
    noGlow: o.parameters.noglow === "1",
    // (Inferno-only, QoL #227: the interface size, 1 (100%), 1.25 or 1.5: the whole stage drawn larger, as far as the
    // window leaves it at least 760 x 670 stage pixels; ?uiscale=1.25 for testing)
    uiScale: Math.max(1, Math.min(1.5, Number(o.parameters.uiscale) || 1)),
  };
  const applySettings = (p: Partial<typeof settings>) => {
    const wasAuto = settings.interpolate < 0;
    Object.assign(settings, p);
    capInterp();
    settings.interpolate = Math.max(-1, Math.min(4, settings.interpolate | 0));
    // (QoL #241: Auto chosen again: the screen is given a new chance at once)
    if (settings.interpolate < 0 && !wasAuto) { slowScreenUntil = 0; slowScreenWait = 10_000; }
    if (!settings.dynamic) { adaptive.scale = 1; adaptive.failed.clear(); adaptive.slow = adaptive.fast = 0; }
    // (QoL #242: the glows' switch; what was filtered before is filtered again)
    settings.noGlow = settings.noGlow === true;
    settings.uiScale = Math.max(1, Math.min(1.5, Number(settings.uiScale) || 1)); // (QoL #227)
    if (filterSettings.noGlow !== settings.noGlow) { filterSettings.noGlow = settings.noGlow; filterSettings.epoch++; }
    fullNext = true;
    layout();
    pickDriver(); // (QoL #241)
  };
  /**
   * (18 October) The frame rate limit sets the interpolation: over 40 (or none), frames made up at the screen's
   * refreshes (Auto), as many as the limit lets through; 40 or under, none. ?interp sets it itself (tests).
   */
  function capInterp(): void {
    settings.fpsCap = Math.max(0, Math.min(1000, Number(settings.fpsCap) | 0));
    if (o.parameters.interp !== undefined) return;
    settings.interpolate = settings.fpsCap === 0 || settings.fpsCap > o.frameRate ? -1 : 0;
  }
  capInterp();
  const layout = () => {
    const w = Math.max(1, o.container.clientWidth), h = Math.max(1, o.container.clientHeight);
    // Flash drew at one pixel per CSS pixel and left scaled displays to the OS; so does this player,
    // since drawing at the display's full resolution costs 2-4x per frame at 150-200% scaling.
    // Every frame redraws and hands the whole canvas to the browser, a cost that grows with its pixel
    // count: when that makes frames late, adaptive.scale lowers the resolution (see below).
    // ?hidpi=1 renders at the display's full resolution; ?maxpixels=N caps the canvas size.
    const base = (settings.hidpi ? Math.min(window.devicePixelRatio || 1, settings.maxDensity) : 1) * settings.renderScale;
    const cap = Number(o.parameters.maxpixels) ? Math.sqrt(Number(o.parameters.maxpixels) / (w * h)) : Infinity;
    dpr = Math.min(base, cap) * (settings.dynamic ? adaptive.scale : 1);
    player.dpr = dpr;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    fullNext = true;
    const oldW = stage.$width, oldH = stage.$height;
    if (stage.$scaleMode === "noScale") {
      // The game lays itself out for the stage size, but needs at least its own size (760 x 670).
      // On smaller screens (phones, small windows) the stage keeps that minimum in stage pixels, with
      // the screen's shape, and is scaled down to fit; at 760 x 670 and above nothing changes.
      // (Inferno-only, QoL #227: an interface size over 100% scales the stage up the same way, by at most that much
      // and only as far as the stage stays 760 x 670 or more: the game is drawn as vectors at the canvas's own
      // resolution, so it stays sharp; pointer positions use the same scale)
      const fit = Math.min(settings.uiScale, w / o.width, h / o.height);
      scale = fit;
      const sw = Math.round(w / fit), sh = Math.round(h / fit);
      stage.$width = sw; stage.$height = sh;
      const a = stage.$align.toUpperCase();
      offX = (a.includes("L") ? 0 : a.includes("R") ? sw - o.width : (sw - o.width) / 2) * fit;
      offY = (a.includes("T") ? 0 : a.includes("B") ? sh - o.height : (sh - o.height) / 2) * fit;
    } else {
      stage.$width = o.width; stage.$height = o.height;
      scale = stage.$scaleMode === "noBorder" ? Math.max(w / o.width, h / o.height) : Math.min(w / o.width, h / o.height);
      offX = (w - o.width * scale) / 2; offY = (h - o.height * scale) / 2;
    }
    // (Inferno-only, QoL #223: for the yard's renderer, which draws a zoomed-in yard at the screen's own resolution:
    // canvas pixels per stage pixel, the window in stage pixels, and whether drawing is to be kept light (a lowered
    // resolution: Battery saver, Balanced, Fast, or dynamic resolution stepping down))
    (stage as any).$ioView = { px: scale * dpr, x: -offX / scale, y: -offY / scale, w: w / scale, h: h / scale, saver: settings.renderScale < 1 || (settings.dynamic && adaptive.scale < 1) };
    if (stage.$scaleMode === "noScale" && (oldW !== stage.$width || oldH !== stage.$height)) {
      runtimeHooks.defer(() => stage.dispatchEvent(new Event(Event.RESIZE)));
    }
  };
  stageHooks.layout = layout;
  const resized = () => { adaptive.scale = 1; adaptive.failed.clear(); adaptive.slow = adaptive.fast = 0; layout(); };
  new ResizeObserver(resized).observe(o.container);
  window.addEventListener("resize", resized);
  layout();

  // ------------------------------------------------------------ focus and fullscreen
  const setFocus = (target: InteractiveObject | null) => {
    const old = stage.$focus;
    if (old === target) return;
    stage.$focus = target;
    if (old) guard(() => old.dispatchEvent(new FocusEvent(FocusEvent.FOCUS_OUT, true, false, target)));
    if (target) guard(() => target.dispatchEvent(new FocusEvent(FocusEvent.FOCUS_IN, true, false, old)));
    inputBridge.focus(target instanceof TextField ? target : null);
    if (!(target instanceof TextField) || target.$type !== "input") canvas.focus({ preventScroll: true });
  };
  stageHooks.setFocus = setFocus;
  // Element full screen: standard API, or the webkit-prefixed one (older iPad Safari). iPhone Safari has
  // neither: there the request is ignored (the stage stays "normal") and the page shell shows its
  // "Add to Home Screen" tip instead. Calling the missing function used to throw #1006 (bug report #15).
  const doc = document as any;
  const fullscreenElement = (): Element | null => doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
  const fullscreenRequest = (el: any): (() => any) | null => {
    const f = el.requestFullscreen ?? el.webkitRequestFullscreen;
    return typeof f === "function" ? () => f.call(el) : null;
  };
  const fullscreenFailed = () => {
    if (fullscreenElement() || stage.$displayState === "normal") return;
    stage.$displayState = "normal";
    runtimeHooks.defer(() => stage.dispatchEvent(new FullScreenEvent(FullScreenEvent.FULL_SCREEN, false, false, false, false)));
  };
  // (Inferno-only, QoL #224: the page shell's target when it gives one (the whole page, so the game's own
  // full-screen button does what the page's does, and the page's menu and settings stay on screen))
  const fullscreenTarget = (): HTMLElement => runtimeHooks.fullScreenTarget() ?? o.container;
  stage.$fullScreenAvailable = !!fullscreenRequest(fullscreenTarget());
  stageHooks.setDisplayState = (v: string) => {
    const full = v === "fullScreen" || v === "fullScreenInteractive";
    if (full) {
      if (!runtimeHooks.inUserGesture) throw Object.assign(new Error("Error #2152: Full screen mode is not allowed."), { name: "SecurityError", errorID: 2152 });
      const request = fullscreenRequest(fullscreenTarget());
      if (!request) { runtimeHooks.fullScreenUnavailable(); return; }
      if (!fullscreenElement()) {
        // The browser can still refuse (not allowed in an iframe, no user activation...): then the stage
        // goes back to "normal" instead of claiming a full screen that never happened.
        try { Promise.resolve(request()).catch(fullscreenFailed); } catch { runtimeHooks.defer(fullscreenFailed); }
      }
      stage.$displayState = v;
      return;
    }
    if (fullscreenElement()) {
      const exit = doc.exitFullscreen ?? doc.webkitExitFullscreen;
      try { Promise.resolve(exit?.call(doc)).catch(() => {}); } catch {}
    }
    stage.$displayState = "normal";
  };
  const fullscreenChanged = () => {
    const full = !!fullscreenElement();
    if (!full) stage.$displayState = "normal";
    layout();
    runtimeHooks.defer(() => stage.dispatchEvent(new FullScreenEvent(FullScreenEvent.FULL_SCREEN, false, false, full, stage.$displayState === "fullScreenInteractive")));
  };
  document.addEventListener("fullscreenchange", fullscreenChanged);
  if (!("onfullscreenchange" in doc)) doc.addEventListener("webkitfullscreenchange", fullscreenChanged);

  // ------------------------------------------------------------ construct the document class
  player.pendingRoot = { stage, loaderInfo: info };
  guard(() => new o.documentClass());
  player.pendingRoot = null;

  // ------------------------------------------------------------ mouse
  let over: InteractiveObject | null = null;
  let downTarget: InteractiveObject | null = null;
  let buttonDown = false;
  let lastClick = { t: 0, target: null as InteractiveObject | null };
  const toStage = (ev: { clientX: number; clientY: number }) => {
    const r = canvas.getBoundingClientRect();
    player.mouseX = (ev.clientX - r.left - offX) / scale;
    player.mouseY = (ev.clientY - r.top - offY) / scale;
  };
  const targetAt = (): InteractiveObject => pick(stage, player.mouseX, player.mouseY).target ?? stage;
  const mouseEvent = (type: string, target: InteractiveObject, ev: { ctrlKey: boolean; altKey: boolean; shiftKey: boolean }, related: InteractiveObject | null = null, delta = 0, bubbles = true) => {
    const local = target.globalToLocal({ x: player.mouseX, y: player.mouseY } as any);
    const e = new MouseEvent(type, bubbles, false, local.x, local.y, related, ev.ctrlKey, ev.altKey, ev.shiftKey, buttonDown, delta);
    e.$stageX = player.mouseX; e.$stageY = player.mouseY;
    guard(() => target.dispatchEvent(e));
  };
  const ancestors = (d: DisplayObject | null): DisplayObject[] => { const a: DisplayObject[] = []; for (let p = d; p; p = p.$parent) a.push(p); return a; };
  const updateOver = (ev: { ctrlKey: boolean; altKey: boolean; shiftKey: boolean }) => {
    const t = targetAt();
    if (t !== over) {
      const old = over;
      over = t;
      if (old && old.stage) mouseEvent(MouseEvent.MOUSE_OUT, old, ev, t);
      // ROLL_OUT to old's chain not containing the new target, ROLL_OVER to new chain not containing old
      const oldChain = ancestors(old), newChain = ancestors(t);
      for (const d of oldChain) if (!newChain.includes(d) && d instanceof InteractiveObject && d.stage) mouseEvent(MouseEvent.ROLL_OUT, d, ev, t, 0, false);
      mouseEvent(MouseEvent.MOUSE_OVER, t, ev, old);
      for (const d of newChain.slice().reverse()) if (!oldChain.includes(d) && d instanceof InteractiveObject) mouseEvent(MouseEvent.ROLL_OVER, d, ev, old, 0, false);
      if (t instanceof SimpleButton) t.$state = buttonDown && downTarget === t ? "down" : "over";
      if (old instanceof SimpleButton) old.$state = "up";
    }
    return t;
  };
  const updateCursor = () => {
    if (cursorState.hidden) { canvas.style.cursor = "none"; return; }
    const t = over;
    let c = "default";
    if (cursorState.cursor === "button" || cursorState.cursor === "hand") c = "pointer";
    else if (cursorState.cursor === "ibeam") c = "text";
    else if (t instanceof SimpleButton && t.$useHandCursor && t.$enabled) c = "pointer";
    else if (t instanceof Sprite && t.$buttonMode && t.$useHandCursor) c = "pointer";
    else if (t instanceof TextField && (t.$type === "input" || t.$selectable)) c = "text";
    canvas.style.cursor = c;
  };
  // (Inferno-only, QoL #549 / #550: touch slop. A finger is wider than a pointer: a tap that lands just outside a
  // small button (on the yard, on a window's background) presses the nearest button within SLOP CSS pixels, as if
  // it had landed on it, and the mouse stays on that button while the finger stays near where it went down. So
  // every small button has SLOP more pixels on each side for a finger (an 8 px one: 40). Only touches, and only
  // when the game asks for it (stage.$ioTouch, set by IoPinchZoom.Install), which also says which buttons count for
  // what was tapped (not the yard's buildings: a tap beside a building is a tap on the ground; nothing in an arcade
  // game, whose taps are moves). The mouse is unchanged.)
  const SLOP = 16;
  /** Where a finger's press looks for a button: [radius in CSS pixels, directions]. */
  const SLOP_RINGS: [number, number][] = [[5, 8], [10, 8], [16, 12]];
  let slop: { cx: number; cy: number; dx: number; dy: number } | null = null;
  const ioTouch = (): { slop?: (button: DisplayObject, tapped: DisplayObject) => boolean } | null => (stage as any).$ioTouch ?? null;
  /** The button (or button-mode sprite) d is part of, or null. */
  const buttonOf = (d: DisplayObject | null): InteractiveObject | null => {
    for (let p = d; p && p !== stage; p = p.$parent) {
      if (p instanceof SimpleButton || (p instanceof Sprite && p.$buttonMode)) return p as InteractiveObject;
    }
    return null;
  };
  /** A finger going down (player.mouseX/Y already where it is): on no button, the nearest one near it. */
  const findSlop = (ev: PointerEvent) => {
    slop = null;
    const accept = ioTouch()?.slop;
    if (typeof accept !== "function") return;
    const t = pick(stage, player.mouseX, player.mouseY).target ?? stage;
    if (buttonOf(t) || (t instanceof TextField && t.$type === "input")) return;
    const x0 = player.mouseX, y0 = player.mouseY;
    for (const [r, n] of SLOP_RINGS) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const dx = (Math.cos(a) * r) / scale, dy = (Math.sin(a) * r) / scale;
        const c = pick(stage, x0 + dx, y0 + dy).target;
        const b = c ? buttonOf(c) : null;
        if (!b || (b instanceof SimpleButton && !b.$enabled)) continue;
        let ok = false;
        try { ok = accept(b, t) !== false; } catch { ok = false; }
        if (!ok) continue;
        slop = { cx: ev.clientX, cy: ev.clientY, dx, dy };
        player.mouseX = x0 + dx; player.mouseY = y0 + dy;
        return;
      }
    }
  };
  /** The finger of a press slop moved: the mouse stays as far off it while it stays near where it went down. */
  const applySlop = (ev: PointerEvent) => {
    if (!slop || ev.pointerType !== "touch") return;
    if (Math.hypot(ev.clientX - slop.cx, ev.clientY - slop.cy) > SLOP) { slop = null; return; }
    player.mouseX += slop.dx; player.mouseY += slop.dy;
  };
  // (Inferno-only, QoL #220: a tap's hover ends with it. A finger has no hover: what it pressed gets its
  // MOUSE_OUT / ROLL_OUT once the press is over, so tips and highlights shown on MOUSE_OVER don't stay up. The
  // mouse's position is kept: a building being placed still follows where the finger was.)
  const clearOver = (ev: { ctrlKey: boolean; altKey: boolean; shiftKey: boolean }) => {
    const old = over;
    if (!old || !ioTouch()) return;
    over = null;
    if (old.stage) mouseEvent(MouseEvent.MOUSE_OUT, old, ev, null);
    for (const d of ancestors(old)) if (d instanceof InteractiveObject && d.stage) mouseEvent(MouseEvent.ROLL_OUT, d, ev, null, 0, false);
    if (old instanceof SimpleButton) old.$state = "up";
    updateCursor();
  };
  // Touch input follows Multitouch.inputMode, as in Flash:
  //  NONE (default): the first finger is the mouse; a second finger turns the gesture into a pinch,
  //    delivered as mouse-wheel steps at the midpoint (the game zooms the map with the wheel).
  //  TOUCH_POINT: TouchEvents for every finger (TOUCH_BEGIN/MOVE/END/TAP); the primary finger also
  //    produces mouse events. The game handles pinching itself.
  //  GESTURE: two fingers produce TransformGestureEvents (zoom, pan, rotate: changes since the last event).
  // In NONE and GESTURE modes the first finger's mouse press ends, without a click, when a second finger lands.
  const touches = new Map<number, { x: number; y: number; primary: boolean; begin: InteractiveObject | null }>();
  let pinch: { d: number; mid: { x: number; y: number }; angle: number; target: InteractiveObject } | null = null;
  const pts = () => [...touches.values()];
  const pinchDistance = () => { const [a, b] = pts(); return Math.hypot(a.x - b.x, a.y - b.y); };
  const pinchAngle = () => { const [a, b] = pts(); return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI; };
  const pinchMid = () => { const [a, b] = pts(); return { clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }; };
  const noKeys = { ctrlKey: false, altKey: false, shiftKey: false };
  const stageAt = (cx: number, cy: number) => { const r = canvas.getBoundingClientRect(); return { x: (cx - r.left - offX) / scale, y: (cy - r.top - offY) / scale }; };
  const touchEvent = (type: string, id: number, primary: boolean, cx: number, cy: number): InteractiveObject => {
    const p = stageAt(cx, cy);
    const t = pick(stage, p.x, p.y).target ?? stage;
    const local = t.globalToLocal({ x: p.x, y: p.y } as any);
    const e = new TouchEvent(type, true, false, id, primary, local.x, local.y, NaN, NaN, NaN, null);
    e.$stageX = p.x; e.$stageY = p.y;
    runtimeHooks.inUserGesture = true;
    try { guard(() => t.dispatchEvent(e)); } finally { runtimeHooks.inUserGesture = false; }
    return t;
  };
  const gestureEvent = (type: string, phase: string, g: { mid: { x: number; y: number }; target: InteractiveObject }, scaleBy = 1, rot = 0, dx = 0, dy = 0) => {
    const local = g.target.globalToLocal({ x: g.mid.x, y: g.mid.y } as any);
    const e = new TransformGestureEvent(type, true, false, phase, local.x, local.y, scaleBy, scaleBy, rot, dx, dy);
    e.$stageX = g.mid.x; e.$stageY = g.mid.y;
    guard(() => g.target.dispatchEvent(e));
  };
  const endMousePress = () => {
    if (!buttonDown) return;
    buttonDown = false;
    guard(() => mouseEvent(MouseEvent.MOUSE_UP, over ?? stage, noKeys));
    downTarget = null;
  };
  /** true: the event is fully handled here (no mouse emulation for it). */
  const touchDown = (ev: PointerEvent): boolean => {
    if (ev.pointerType !== "touch") return false;
    const mode = Multitouch.inputMode;
    touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY, primary: ev.isPrimary, begin: null });
    if (mode === "touchPoint") {
      touches.get(ev.pointerId)!.begin = touchEvent(TouchEvent.TOUCH_BEGIN, ev.pointerId, ev.isPrimary, ev.clientX, ev.clientY);
      return !ev.isPrimary;
    }
    if (touches.size === 2 && !pinch) {
      endMousePress();
      const m = pinchMid(), mid = stageAt(m.clientX, m.clientY);
      pinch = { d: pinchDistance(), mid, angle: pinchAngle(), target: pick(stage, mid.x, mid.y).target ?? stage };
      if (mode === "gesture") for (const t of [TransformGestureEvent.GESTURE_ZOOM, TransformGestureEvent.GESTURE_PAN, TransformGestureEvent.GESTURE_ROTATE]) gestureEvent(t, "begin", pinch);
      return true;
    }
    return touches.size > 1;
  };
  const touchMove = (ev: PointerEvent): boolean => {
    if (ev.pointerType !== "touch" || !touches.has(ev.pointerId)) return false;
    const tp = touches.get(ev.pointerId)!;
    tp.x = ev.clientX; tp.y = ev.clientY;
    const mode = Multitouch.inputMode;
    if (mode === "touchPoint") {
      touchEvent(TouchEvent.TOUCH_MOVE, ev.pointerId, tp.primary, ev.clientX, ev.clientY);
      return !tp.primary;
    }
    if (!pinch || touches.size < 2) return !!pinch;
    const d = pinchDistance();
    if (mode === "gesture") {
      const m = pinchMid(), mid = stageAt(m.clientX, m.clientY), angle = pinchAngle();
      const zoom = pinch.d > 0 ? d / pinch.d : 1, dx = mid.x - pinch.mid.x, dy = mid.y - pinch.mid.y;
      let rot = angle - pinch.angle; if (rot > 180) rot -= 360; if (rot < -180) rot += 360;
      pinch.d = d; pinch.mid = mid; pinch.angle = angle;
      if (Math.abs(zoom - 1) > 0.002) gestureEvent(TransformGestureEvent.GESTURE_ZOOM, "update", pinch, zoom);
      if (dx || dy) gestureEvent(TransformGestureEvent.GESTURE_PAN, "update", pinch, 1, 0, dx, dy);
      if (Math.abs(rot) > 0.1) gestureEvent(TransformGestureEvent.GESTURE_ROTATE, "update", pinch, 1, rot);
      return true;
    }
    const step = Math.log(d / pinch.d);
    if (Math.abs(step) > 0.12) {
      pinch.d = d;
      toStage(pinchMid());
      const t = updateOver(noKeys);
      mouseEvent(MouseEvent.MOUSE_WHEEL, t, noKeys, null, step > 0 ? 3 : -3);
    }
    return true;
  };
  const touchUp = (ev: PointerEvent, cancelled = false): boolean => {
    if (ev.pointerType !== "touch") return false;
    const tp = touches.get(ev.pointerId);
    touches.delete(ev.pointerId);
    if (Multitouch.inputMode === "touchPoint" && tp) {
      const t = touchEvent(TouchEvent.TOUCH_END, ev.pointerId, tp.primary, ev.clientX, ev.clientY);
      if (!cancelled && t === tp.begin) touchEvent(TouchEvent.TOUCH_TAP, ev.pointerId, tp.primary, ev.clientX, ev.clientY);
      return !tp.primary;
    }
    if (pinch) {
      if (Multitouch.inputMode === "gesture" && touches.size === 1) for (const t of [TransformGestureEvent.GESTURE_ZOOM, TransformGestureEvent.GESTURE_PAN, TransformGestureEvent.GESTURE_ROTATE]) gestureEvent(t, "end", pinch);
      if (touches.size === 0) pinch = null;
      return true;
    }
    return false;
  };
  canvas.addEventListener("pointercancel", (ev) => {
    touchUp(ev, true);
    if (!touches.size) pinch = null;
    if (ev.pointerType === "touch" && ev.isPrimary) { slop = null; clearOver(noKeys); } // (QoL #549, #220)
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (touchMove(ev)) return;
    toStage(ev);
    applySlop(ev); // (QoL #549)
    dragState.update();
    const t = updateOver(ev);
    mouseEvent(MouseEvent.MOUSE_MOVE, t, ev);
    updateCursor();
  });
  canvas.addEventListener("pointerdown", (ev) => {
    if (ev.button !== 0) return;
    ev.preventDefault();
    if (touchDown(ev)) return;
    canvas.setPointerCapture(ev.pointerId);
    resumeAudio();
    toStage(ev);
    if (ev.pointerType === "touch") findSlop(ev); // (QoL #549)
    else slop = null;
    buttonDown = true;
    const t = updateOver(ev);
    downTarget = t;
    runtimeHooks.inUserGesture = true;
    try {
      if (t instanceof TextField && (t.$type === "input" || t.$selectable)) setFocus(t);
      else if (t !== stage && (t.$tabEnabled === true || (t instanceof Sprite && t.$buttonMode) || t instanceof SimpleButton)) setFocus(t);
      else if (stage.$focus instanceof TextField && stage.$focus.$type === "input" && t !== stage.$focus) setFocus(null);
      if (t instanceof SimpleButton) t.$state = "down";
      mouseEvent(MouseEvent.MOUSE_DOWN, t, ev);
    } finally { runtimeHooks.inUserGesture = false; }
    if (t instanceof TextField && t.$type === "input") placeCaret(t);
  });
  canvas.addEventListener("pointerup", (ev) => {
    if (ev.button !== 0) return;
    resumeAudio(); // iOS starts audio from touch-end, not touch-start
    inputBridge.keepFocus(); // still inside the tap: iOS lets focus (and the keyboard) be taken back
    if (touchUp(ev)) return;
    toStage(ev);
    applySlop(ev); // (QoL #549)
    buttonDown = false;
    const t = updateOver(ev);
    runtimeHooks.inUserGesture = true;
    try {
      mouseEvent(MouseEvent.MOUSE_UP, t, ev);
      if (t instanceof SimpleButton) t.$state = "over";
      if (t === downTarget) {
        mouseEvent(MouseEvent.CLICK, t, ev);
        const now = performance.now();
        if (t.$doubleClickEnabled && lastClick.target === t && now - lastClick.t < 500) { mouseEvent(MouseEvent.DOUBLE_CLICK, t, ev); lastClick = { t: 0, target: null }; }
        else lastClick = { t: now, target: t };
      }
    } finally { runtimeHooks.inUserGesture = false; }
    downTarget = null;
    // (QoL #549, #220: a finger's press is over: no slop, and nothing stays hovered)
    if (ev.pointerType === "touch") { slop = null; clearOver(ev); }
    updateCursor();
  });
  canvas.addEventListener("pointerleave", () => { runtimeHooks.defer(() => stage.dispatchEvent(new Event(Event.MOUSE_LEAVE))); });
  canvas.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    toStage(ev);
    const t = updateOver(ev);
    const delta = ev.deltaY === 0 ? 0 : ev.deltaY < 0 ? 3 : -3;
    mouseEvent(MouseEvent.MOUSE_WHEEL, t, ev, null, delta);
  }, { passive: false });
  canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());
  // iOS: after a tap, Safari moves focus to what was tapped (the canvas), which takes it away from the
  // hidden text input and closes the keyboard that the tap just opened. Cancelling the touch events
  // stops that (pointer events, which the game input uses, are unaffected).
  for (const t of ["touchstart", "touchend"]) canvas.addEventListener(t, (ev) => { if (ev.cancelable) ev.preventDefault(); }, { passive: false });
  runtimeHooks.inputBlurred = () => {
    if (stage.$focus instanceof TextField && stage.$focus.$type === "input") setFocus(null);
  };
  const placeCaret = (tf: TextField) => {
    const local = tf.globalToLocal({ x: player.mouseX, y: player.mouseY } as any);
    let i = tf.getCharIndexAtPoint(local.x, local.y);
    if (i < 0) i = tf.$text.length;
    tf.setSelection(i, i);
  };

  // ------------------------------------------------------------ keyboard
  const keyEvent = (type: string, ev: globalThis.KeyboardEvent) => {
    keyState.capsLock = ev.getModifierState?.("CapsLock") ?? false;
    keyState.numLock = ev.getModifierState?.("NumLock") ?? false;
    const charCode = ev.key.length === 1 ? ev.key.charCodeAt(0) : ({ Enter: 13, Backspace: 8, Tab: 9, Escape: 27, Delete: 127 } as Record<string, number>)[ev.key] ?? 0;
    const target = stage.$focus?.stage ? stage.$focus : stage;
    runtimeHooks.inUserGesture = true;
    try {
      guard(() => target.dispatchEvent(new KeyboardEvent(type, true, false, charCode, ev.keyCode, ev.location, ev.ctrlKey, ev.altKey, ev.shiftKey)));
    } finally { runtimeHooks.inUserGesture = false; }
  };
  const typingInField = () => stage.$focus instanceof TextField && stage.$focus.$type === "input";
  window.addEventListener("keydown", (ev) => {
    resumeAudio();
    // Tab when no text field had the focus: the browser's own Tab is stopped even when the game moved the focus
    // into a text field on this key (a form's Tab order: the browser's Tab would take the focus straight back
    // out of the field). In a text field, the field itself stops it (flash/text).
    const wasTyping = typingInField();
    keyEvent(KeyboardEvent.KEY_DOWN, ev);
    if (ev.key === "Tab" && !wasTyping) ev.preventDefault();
    else if (!typingInField() && (ev.key === "Tab" || ev.key === "Backspace" || ev.key.startsWith("Arrow") || ev.key === " ")) ev.preventDefault();
  });
  window.addEventListener("keyup", (ev) => keyEvent(KeyboardEvent.KEY_UP, ev));
  window.addEventListener("focus", () => broadcast("activate"));
  window.addEventListener("blur", () => broadcast("deactivate"));

  // ------------------------------------------------------------ frame loop
  const broadcast = (type: string) => {
    const set = broadcastLists.get(type);
    if (!set || !set.size) return;
    for (const d of [...set]) guard(() => d.dispatchEvent(new Event(type)));
  };
  // Steps every timeline once. Runs over the whole display list each frame, so it avoids
  // allocations: empty containers are skipped and each clip's step is guarded inline.
  // Steps every playing clip once. Only playing clips on the stage can change (activeClips); the set is
  // rebuilt from the whole display list once a second as a safety net.
  let resync = 0;
  const collectPlaying = (c: DisplayObjectContainer) => {
    for (const ch of c.$children) {
      if (ch instanceof MovieClip && ch.$p && ch.$timeline && ch.$timeline.totalFrames > 1) activeClips.add(ch);
      if (ch instanceof DisplayObjectContainer && ch.$children.length) collectPlaying(ch);
    }
  };
  const advance = (root: DisplayObjectContainer) => {
    if (++resync >= 40) { resync = 0; activeClips.clear(); collectPlaying(root); }
    for (const mc of [...activeClips]) {
      if (!mc.$timeline) continue;
      try { mc.$advance(); } catch (e) { runtimeHooks.uncaught(e); }
    }
  };
  // Redraw regions (see redrawRegions in display/core.ts): only what changed is drawn again. A full
  // redraw happens on the first frame, after a resize or stage colour change, every 3 seconds as a
  // safety net, and always with ?redraw=full.
  let sinceFull = 0, lastColor = -1;
  const drawAll = (target: CanvasRenderingContext2D, base: M6) => {
    for (const c of stage.$children) {
      try { renderObject(target, c, base, 1); } catch (e) { console.error("render error", e); }
    }
  };
  const render = () => {
    renderInner();
    if (player.debug.measureFlush) { const t = performance.now(); ctx.getImageData(0, 0, 1, 1); stats.flushMs += performance.now() - t; stats.flushes++; }
  };
  const renderInner = () => {
    const base: M6 = [scale * dpr, 0, 0, scale * dpr, offX * dpr, offY * dpr];
    if (stage.$color !== lastColor) { lastColor = stage.$color; fullNext = true; }
    const full = settings.fullRedraw || fullNext || ++sinceFull >= 120;
    let rects: [number, number, number, number][] | null = null;
    try {
      rects = redrawRegions(stage, base, canvas.width, canvas.height, full);
    } catch (e) {
      console.error("redraw regions", e);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = cssColor(stage.$color);
    if (rects === null) {
      stats.drawnPx += canvas.width * canvas.height; stats.fullFrames++;
      fullNext = false; sinceFull = 0;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // (off the canvas, or outside its mask: left out, as on a partial redraw)
      setCullRects([[0, 0, canvas.width, canvas.height]]);
      try { drawAll(ctx, base); } finally { setCullRects(null); }
      return;
    }
    if (!rects.length) return;
    if (player.debug.lastRects && player.debug.lastRects.length < 2000) player.debug.lastRects.push(...rects.map((r) => r.map(Math.round)));
    for (const r of rects) stats.drawnPx += (r[2] - r[0]) * (r[3] - r[1]);
    // (19 October: the rectangles inside a window (an occluder, DisplayObject.ioOccludes) apart from the others, each
    // group through its own clip: inside a window nothing drawn before it is drawn (the yard, its monsters, the dimming
    // over it); with them together, whatever met one rectangle outside a window was drawn in all of them, under the
    // window too)
    const inside = rects.filter((r) => occludedRect(r));
    const groups = inside.length && inside.length < rects.length ? [rects.filter((r) => !occludedRect(r)), inside] : [rects];
    try {
      for (const rs of groups) drawGroup(rs, base);
    } finally {
      setCullRects(null);
    }
  };
  /** Draws again the rectangles rs, through one clip of them all. */
  const drawGroup = (rs: [number, number, number, number][], base: M6) => {
    setCullRects(rs);
    rearmDrawOcc();
    // (19 October: the yard's picture first, each rectangle's piece through a clip of that rectangle alone, when
    // nothing is under it; then the rest through the clip of them all (findPrefix in display/core))
    const pre = rs.length > 1 ? findPrefix(stage) : null;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = cssColor(stage.$color);
    if (pre) {
      for (const r of rs) ctx.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
      try { drawPrefix(ctx, pre); } catch (e) { endPrefix(); throw e; }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.save();
    ctx.beginPath();
    for (const r of rs) ctx.rect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
    ctx.clip();
    if (!pre) for (const r of rs) ctx.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
    try {
      drawAll(ctx, base);
    } finally {
      endPrefix();
      ctx.restore();
    }
  };
  /** Test hook: draws a full frame offscreen and counts pixels that differ from the screen (should be 0). */
  const verifyRedraw = (list = false) => {
    const off = document.createElement("canvas");
    off.width = canvas.width; off.height = canvas.height;
    const octx = context2d(off, { alpha: false });
    octx.fillStyle = cssColor(stage.$color);
    octx.fillRect(0, 0, off.width, off.height);
    drawAll(octx, [scale * dpr, 0, 0, scale * dpr, offX * dpr, offY * dpr]);
    const a = ctx.getImageData(0, 0, canvas.width, canvas.height).data, b = octx.getImageData(0, 0, off.width, off.height).data;
    let diff = 0, x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    const px: number[][] = [];
    for (let i = 0; i < a.length; i += 4) {
      if (Math.abs(a[i] - b[i]) > 24 || Math.abs(a[i + 1] - b[i + 1]) > 24 || Math.abs(a[i + 2] - b[i + 2]) > 24) {
        diff++;
        const p = i / 4, x = p % canvas.width, y = (p / canvas.width) | 0;
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        // (list: the pixels themselves, the screen's colour and the whole drawing's)
        if (list && px.length < 40) px.push([x, y, (a[i] << 16) | (a[i + 1] << 8) | a[i + 2], (b[i] << 16) | (b[i + 1] << 8) | b[i + 2]]);
      }
    }
    return diff ? (list ? { diff, box: [x0, y0, x1, y1], px } : { diff, box: [x0, y0, x1, y1] }) : { diff: 0 };
  };
  const stats = { frames: 0, scriptMs: 0, renderMs: 0, maxFrameMs: 0, late: 0, drawnPx: 0, fullFrames: 0,
    /** (19 October, for tests) the screen's refreshes, and why one showed no drawing: over the limit, too early after a late
     *  game frame, drawing too slow, the game's frame too long, frames caught up lately, no interpolation */
    flushMs: 0, flushes: 0,
    skips: { refreshes: 0, cap: 0, early: 0, cost: 0, frame: 0, caught: 0, noInterp: 0 } };
  // ------------------------------------------------------------ frame interpolation (see interp in display/core)
  // The game's yard renderer finds the interpolation through the stage (Renderer.ts, browser build only).
  (stage as any).$ioInterp = interp;
  /** Time a drawing has been taking lately (ms): a made-up frame is left out when it would not fit. */
  let drawCost = 4;
  // When hardly any made-up frame fits (under a tenth: a slow device, a big battle) interpolation pauses for a few seconds:
  // its real frames are drawn part of the way too, which costs drawing for nothing then.
  let pausedUntil = 0, windowStart = 0, winShown = 0, winSkipped = 0;
  const setInterp = () => {
    const now = performance.now();
    if (settings.interpolate !== 0 && !pageHidden()) {
      if (now - windowStart >= 1000) {
        const tried = winShown + winSkipped;
        if (tried >= 20 && winShown < tried * 0.1 && now >= pausedUntil) pausedUntil = now + 3000;
        windowStart = now; winShown = 0; winSkipped = 0;
      }
    }
    // (QoL #241: Auto interpolates only while the screen drives the frames; its real frame is drawn as far as it is late)
    const auto = settings.interpolate < 0;
    // (19 October: none while the game's own frames are heavy (a big battle: the yard's renderer draws every monster
    // part of the way and back each frame, so interpolating costs the game's own time): more than 70% of a frame's time
    // on average (player.debug.heavyShare; half was too soon: Hellgate Defense at 2x, 13 ms a frame, lost its 60 fps);
    // back 2 s after they are lighter)
    // (a slow average, about the last 30 frames: one long frame (a window opening, the yard loading) isn't a heavy game)
    if (heavyAvg > (1000 / stage.$frameRate) * player.debug.heavyShare) heavyUntil = now + 2000;
    const n = pageHidden() || now < pausedUntil || now < heavyUntil || (auto && driver !== "screen") ? 0 : auto ? 1 : settings.interpolate;
    interp.frames = n;
    interp.on = n > 0;
    interp.first = n > 0 ? (auto ? autoFirst : 1 / (n + 1)) : 1;
  };
  /** A made-up frame `a` of the way from the game's last frame but one to its last (1: exactly the last). */
  const invented = (a: number) => {
    const t1 = performance.now();
    // (19 October: the game's last frame wasn't drawn (over the limit): the yard's own drawing it left out, first)
    if (stage.$invalidated) { stage.$invalidated = false; broadcast("render"); }
    try { interp.hook?.(a, interp.tick); } catch (e) { console.error("interpolation", e); }
    interp.apply(a);
    try { render(); } finally { interp.restore(); }
    const t2 = performance.now();
    drawCost = drawCost * 0.8 + (t2 - t1) * 0.2;
    interp.stats.shown++;
    interp.stats.invented++;
    winShown++;
  };
  /** (19 October) How long the last game frame took, with its drawing; when frames were last caught up (behind); the
   *  game frames' time on average; until when interpolation is off for them being heavy. */
  let lastFrameMs = 0, caughtUpAt = -1e9, frameAvg = 0, heavyUntil = 0, heavyAvg = 0;
  const frame = (draw = true) => {
    const t0 = performance.now();
    setInterp();
    interp.begin();
    interp.stats.real++;
    const q = queue;
    queue = [];
    for (const fn of q) guard(fn);
    advance(stage);
    broadcast("enterFrame");
    broadcast("frameConstructed");
    broadcast("exitFrame");
    // (19 October: as in Flash, "render" (the yard's own drawing, MAP.render) only for a frame that is drawn: one left
    // out (the game catching up its 40 ticks on a slow device or in a big battle, a hidden page) leaves it for the next,
    // which draws everything that changed since. A battle drew the yard for every tick, shown or not)
    if (stage.$invalidated && ((draw && !pageHidden()) || player.debug.renderAlways)) { stage.$invalidated = false; broadcast("render"); }
    const t1 = performance.now();
    if (pageHidden()) fullNext = true;
    else if (!draw) { /* (18 October: over the frame rate limit: the game ran, the drawing waits for the next one) */ }
    else if (interp.on) {
      // the real frame, the first share of the way (the game's yard renderer drew its part so already)
      interp.apply(interp.first);
      try { render(); } finally { interp.restore(); }
      interp.stats.shown++;
    }
    else { render(); interp.stats.shown++; } // (paused: still a frame shown; 18 October: every drawing counted, for the readout)
    const t2 = performance.now();
    if (interp.on) drawCost = drawCost * 0.8 + (t2 - t1) * 0.2;
    stats.frames++;
    stats.scriptMs += t1 - t0;
    stats.renderMs += t2 - t1;
    stats.maxFrameMs = Math.max(stats.maxFrameMs, t2 - t0);
    lastFrameMs = t2 - t0;
    frameAvg = frameAvg * 0.9 + (t2 - t0) * 0.1;
    heavyAvg = heavyAvg * 0.95 + Math.min(t2 - t0, 60) * 0.05;
    if (t2 - t0 > 1000 / stage.$frameRate) stats.late++;
    adaptive.frames++;
    adaptive.script += t1 - t0;
    if (t2 - adaptive.t0 >= 2000 && settings.dynamic) adjustResolution(t2);
  };
  const started = performance.now();
  const adjustResolution = (now: number) => {
    const a = adaptive;
    if (now - started < 15_000) { a.t0 = now; a.frames = 0; a.script = 0; return; } // loading is not a steady state
    const fps = (a.frames * 1000) / (now - a.t0);
    const script = a.script / a.frames;
    a.t0 = now; a.frames = 0; a.script = 0;
    const target = stage.$frameRate;
    const level = (x: number) => Math.round(Math.log(x) / Math.log(STEP));
    if (a.judge && --a.judge === 0 && fps < a.before * 1.15 && fps < target * 0.9) {
      // lowering the resolution did not help: drawing was not the bottleneck; undo and wait a minute
      a.failed.delete(level(a.scale / STEP));
      a.scale = Math.min(1, a.scale / STEP);
      a.noLowerUntil = now + 60_000;
      a.slow = a.fast = 0;
      layout();
      return;
    }
    if (fps < target * 0.85 && script < 1000 / target * 0.7 && canvas.width * canvas.height > MIN_PIXELS && now >= a.noLowerUntil) {
      a.fast = 0;
      if (++a.slow >= 2) {
        a.slow = 0;
        const f = a.failed.get(level(a.scale));
        const wait = f ? f.wait * 2 : 20_000;
        a.failed.set(level(a.scale), { until: now + wait, wait });
        a.scale *= STEP;
        a.before = fps; a.judge = 2;
        layout();
      }
    } else if (fps >= target * 0.97 && a.scale < 1) {
      a.slow = 0;
      if (++a.fast >= 3) {
        a.fast = 0;
        const up = Math.min(1, a.scale / STEP);
        const f = a.failed.get(level(up));
        if (!f || now >= f.until) { a.scale = up; layout(); }
      }
    } else {
      a.slow = 0; a.fast = 0;
    }
  };
  // Frames are paced from a fixed schedule and never run early: the game banks
  // simulation ticks from elapsed time and truncates them to int (see bugreport.md).
  // The schedule runs on flash/_clock, so a tab in the background keeps playing at full speed.
  // With frame interpolation the made-up frames go evenly between the real ones (the k-th at k / (n + 1) of
  // the interval); one that is late is left out for the next, and none is drawn when it would not be done
  // before the next real frame is due (the game's own frames come first).
  // ---------------------------------------------------------- (Inferno-only, 18 October) the frame rate limit
  // Drawings are spaced at least 1000 / fpsCap ms apart on average: the k-th is due at a steady schedule (nextShow,
  // one limit's interval after the one before), and is drawn at the first chance (a game frame, a screen refresh)
  // from `slack` before it; a schedule fallen far behind (a long frame, a hidden page) starts again from now. No
  // limit: every chance. The game's frames run on their own schedule either way; one over the limit isn't drawn.
  let nextShow = 0;
  /** When the last drawing was made. */
  let drawnAt = 0;
  const mayShow = (now: number, slack: number) => {
    if (!(settings.fpsCap > 0)) return true;
    return now >= nextShow - slack;
  };
  const showed = (now: number) => {
    drawnAt = now;
    if (!(settings.fpsCap > 0)) return;
    const ci = 1000 / settings.fpsCap;
    nextShow += ci;
    if (nextShow < now - ci * 2 || nextShow > now + ci * 2) nextShow = now + ci;
  };
  let next = performance.now();
  let made = 0; // made-up frames shown since the last real one
  const loop = () => {
    timerId = 0;
    if (driver !== "timer") return;
    let now = performance.now();
    // (QoL #241: Auto interpolation, the page visible, and the screen not found too slow lately: the screen takes over)
    // (19 October: and the game's own frames not heavy: see screenLoop)
    if (settings.interpolate < 0 && !pageHidden() && now >= slowScreenUntil && now >= heavyUntil && typeof requestAnimationFrame === "function") { useScreen(); return; }
    const interval = 1000 / stage.$frameRate;
    if (now >= next) {
      if (interp.on && made < interp.frames && interp.stats.real > 0) { interp.stats.skipped += interp.frames - made; winSkipped += interp.frames - made; } // (no time left for them)
      // (18 October: a limit under the game's 40: some of its frames aren't drawn; and a frame run late, with
      // another already due after it (a slow device, a long drawing), isn't drawn either: the game catches up its
      // 40 a second instead of slowing down, only the drawings are fewer)
      // (behind: two frames owed, or one when the last frame itself took most of its time (the device can't keep
      // up); a timer only a frame late is ordinary, and its frame is drawn as before; and at least every 100 ms
      // something is drawn, however far behind)
      const owed = now >= next + interval * 2 || (now >= next + interval && lastFrameMs > interval * 0.8);
      const behind = owed && now - next <= 250 && now - drawnAt < 100;
      const draw = !behind && mayShow(now, 0);
      frame(draw);
      if (draw) showed(now);
      made = 0;
      next += interval;
      if (now - next > 250) next = now + interval;
    } else if (interp.on && made < interp.frames) {
      const start = next - interval, step = interval / (interp.frames + 1);
      let k = Math.min(interp.frames, Math.floor((now - start) / step)); // the latest one due
      if (k > made) {
        if (now + drawCost < next - 1 && mayShow(now, 0)) { invented(k >= interp.frames ? 1 : (k + 1) / (interp.frames + 1)); showed(now); }
        else { interp.stats.skipped += k - made; winSkipped += k - made; }
        made = k;
      }
    }
    now = performance.now();
    let wake = next;
    if (interp.on && made < interp.frames) wake = Math.min(wake, next - interval + (made + 1) * (interval / (interp.frames + 1)));
    timerId = later(loop, Math.max(0, wake - now));
  };
  // ---------------------------------------------------------- (Inferno-only, QoL #241) frames timed to the screen
  // With "Auto" interpolation the browser's screen refreshes drive the loop (requestAnimationFrame) while the page is
  // visible: a game frame still runs only when it is due on the same schedule as above (never early), at the first
  // refresh after that; every refresh in between shows a made-up frame exactly as far between the game's last two as
  // the time has come (the game shown one frame behind, smoothly at any refresh rate). A hidden page has no
  // refreshes: the timers above take over (the game keeps running in the background, as before). A screen slower
  // than the game (30 Hz, a browser saving power, drawing too slow to keep up) gives the timers back too, without
  // made-up frames, for 30 s (then 60, 120...) before the screen is tried again. So does a page whose refreshes stop
  // while it counts as visible (a window covered on some systems, an embedding frame scrolled away): a timer checks
  // twice a second that they still come. Other settings: the timers, as before.
  let driver: "timer" | "screen" = "timer";
  let timerId = 0, rafId = 0, watchId = 0, watchDue = 0, screenSince = 0;
  let realAt = 0, autoFirst = 1; // when the last game frame was due; how far its drawing was (set before frame())
  let rafLast = 0, rafAvg = 0, rafCount = 0, slowScreenUntil = 0, slowScreenWait = 10_000;
  /** (19 October) The last 30 refreshes' intervals counted, and the quarter quickest's longest (rafLow). */
  const rafRing: number[] = new Array(30).fill(0);
  let rafRingAt = 0;
  const rafLow = () => { const a = rafRing.slice().sort((x, y) => x - y); return a[Math.floor(a.length / 4)]; };
  /** (18 October) How long the last refresh's own work took: a refresh late because of it says nothing of the screen. */
  let rafWork = 0;
  // (18 October, the frame rate limit by default: tried again after 10 s, at most every 2 minutes)
  const screenTooSlow = (now: number) => {
    slowScreenUntil = now + slowScreenWait;
    slowScreenWait = Math.min(120_000, slowScreenWait * 2);
    useTimer();
  };
  const useTimer = () => {
    driver = "timer";
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    if (watchId) { cancelTimer(watchId); watchId = 0; }
    if (!timerId) timerId = later(loop, 0);
  };
  const watchScreen = () => {
    watchId = 0;
    if (driver !== "screen") return;
    const now = performance.now();
    // (only when this check itself is on time: a long frame (a yard loading) holds back everything, refreshes too)
    if (!pageHidden() && now - watchDue < 200 && now - Math.max(rafLast, screenSince) > 400) { screenTooSlow(now); return; }
    watchDue = now + 500;
    watchId = later(watchScreen, 500);
  };
  const useScreen = () => {
    driver = "screen";
    if (timerId) { cancelTimer(timerId); timerId = 0; }
    made = 0; rafLast = 0; rafAvg = 0; rafCount = 0; screenSince = performance.now();
    if (!rafId) rafId = requestAnimationFrame(screenLoop);
    if (!watchId) { watchDue = performance.now() + 500; watchId = later(watchScreen, 500); }
  };
  const pickDriver = () => {
    const screen = settings.interpolate < 0 && !pageHidden() && typeof requestAnimationFrame === "function" && performance.now() >= slowScreenUntil;
    if (screen && driver !== "screen") useScreen();
    else if (!screen && driver !== "timer") useTimer();
  };
  const screenLoop = () => {
    rafId = 0;
    if (driver !== "screen") return;
    if (settings.interpolate >= 0 || pageHidden()) { useTimer(); return; }
    rafId = requestAnimationFrame(screenLoop);
    const now = performance.now();
    const interval = 1000 / stage.$frameRate;
    // (18 October: a refresh that came late because the one before had a long game frame or drawing to do (a yard
    // loading, a big battle) isn't the screen's slowness: not counted)
    if (rafLast && now - rafLast < 250 && rafWork < interval * 0.5) {
      rafAvg = rafCount ? rafAvg * 0.9 + (now - rafLast) * 0.1 : now - rafLast; rafCount++;
      rafRing[rafRingAt] = now - rafLast; rafRingAt = (rafRingAt + 1) % rafRing.length;
    }
    rafLast = now;
    // (19 October: the screen's own rate is told by its quicker refreshes (a quarter of the last 30 were at most this
    // long), not their average: a yard loading, a window opening, the page's other work held some refreshes back, and
    // the screen was found too slow for 10 s (then 20, 40...) after every such moment)
    if (rafCount >= 30 && rafAvg > interval * 1.15 && rafLow() > interval * 1.15) { screenTooSlow(now); return; }
    try { screenStep(now, interval); } finally { rafWork = performance.now() - now; }
    // (19 October: the game's own frames heavy (a big battle: nothing is interpolated then, see setInterp): the timers
    // take over until they are lighter. Driven by the refreshes, a game that can't keep up loses ticks and drawings
    // both (its frames run back to back between refreshes, the browser's own drawing of the page in between: with 40
    // monsters, about half the ticks and drawings of the timers); the timers pace them as with a 40 limit)
    if (now < heavyUntil && driver === "screen") useTimer();
  };
  const screenStep = (now: number, interval: number) => {
    const sk0 = stats.skips;
    sk0.refreshes++;
    if (now >= next) {
      // (18 October: every game frame due runs, up to 4 a refresh, as the timers do: the game keeps its 40 a second
      // whatever the screen's rate (slower refreshes, long drawings); only the last is drawn)
      for (let ran = 0; ran < 3 && now >= next + interval; ran++) {
        next += interval;
        frame(false);
        caughtUpAt = now;
      }
      realAt = next;
      next += interval;
      if (now - next > 250) { next = now + interval; realAt = now; }
      autoFirst = Math.max(0, Math.min(1, (now - realAt) / interval));
      // (18 October: the frame rate limit: a refresh counts from half a refresh before the drawing is due)
      const draw = mayShow(now, (rafAvg || 16.7) / 2);
      frame(draw);
      if (draw) showed(now);
    } else if (interp.on && interp.stats.real > 0) {
      const a = (now - realAt) / interval;
      const sk = stats.skips;
      if (!mayShow(now, (rafAvg || 16.7) / 2)) { sk.cap++; /* (over the limit: this refresh shows the last drawing) */ }
      // (18 October: timed to the screen, a game frame due meanwhile runs at the next refresh whatever (and catches
      // up), so a made-up frame needs only to fit in a refresh, not before the game's next frame is due; 19 October:
      // and only with time to spare: the game's last frame and a made-up one in under 80% of a frame's time, and no
      // frame caught up in the last 300 ms. A busy battle (each made-up frame redraws every monster in the yard) is
      // drawn at the game's own frames then, as with a 40 limit, and the game keeps its speed)
      else if (a > autoFirst && a < 1 && drawCost < (rafAvg || 16.7) * 0.9 && lastFrameMs + drawCost < interval * 0.8 && now - caughtUpAt > 300) { invented(a); showed(now); }
      else if (a < 1) {
        interp.stats.skipped++; winSkipped++;
        // (why, for tests: __player.stats.skips)
        if (!(a > autoFirst)) sk.early++; else if (!(drawCost < (rafAvg || 16.7) * 0.9)) sk.cost++; else if (!(lastFrameMs + drawCost < interval * 0.8)) sk.frame++; else sk.caught++;
      }
    } else sk0.noInterp++;
  };
  loop();
  // Nothing is drawn while the page is hidden (the game still runs); the first frame back is drawn whole.
  document.addEventListener("visibilitychange", () => { if (!pageHidden()) fullNext = true; pickDriver(); });
  /** Where the text field being typed into is, in client (CSS) pixels, or null. */
  const focusedInputRect = (): { top: number; bottom: number } | null => {
    const f = stage.$focus;
    if (!(f instanceof TextField) || f.$type !== "input" || !f.stage) return null;
    const r = canvas.getBoundingClientRect();
    const a = f.localToGlobal({ x: 0, y: 0 } as any), b = f.localToGlobal({ x: 0, y: f.height / Math.max(1e-6, f.scaleY) } as any);
    return { top: r.top + offY + a.y * scale, bottom: r.top + offY + b.y * scale };
  };
  /** Stage coordinates -> client (CSS) pixels, e.g. for tests that tap on game objects. */
  const stageToClient = (x: number, y: number) => { const r = canvas.getBoundingClientRect(); return { x: r.left + offX + x * scale, y: r.top + offY + y * scale }; };
  // (QoL #241: which loop drives the frames now, for tests: "timer" or "screen")
  const timing = () => ({ driver, rafAvg, slowScreenUntil, frameAvg, heavyAvg, heavy: performance.now() < heavyUntil, drawCost });
  // (18 October: the screen itself, for the Watch menu's pictures of the game: game/com/monsters/replays/IoWatch.ts)
  const api = { stage, canvas, frame, render, info, stats, debug: player.debug, adaptive, verifyRedraw, broadcastLists, settings, applySettings, focusedInputRect, stageToClient, interp, textCache, timing };
  (window as any).__player = api;
  return api;
}

/** Maps JavaScript engine errors onto the Flash Player errors game code expects. */
function toFlashError(e: unknown): unknown {
  if (!(e instanceof Error) || (e as any).$flashMapped) return e;
  const m = e.message;
  let id = 0, msg = "";
  if (e instanceof TypeError && /Cannot (read|set) propert(y|ies) of (null|undefined)|null is not an object|undefined is not an object/.test(m)) {
    id = 1009; msg = "Error #1009: Cannot access a property or method of a null object reference.";
  } else if (e instanceof TypeError && /is not a function/.test(m)) {
    id = 1006; msg = "Error #1006: value is not a function.";
  } else if (e instanceof RangeError && /call stack/.test(m)) {
    id = 1023; msg = "Error #1023: Stack overflow occurred.";
  }
  if (id) {
    Object.defineProperty(e, "jsMessage", { value: m });
    e.message = msg;
    Object.defineProperty(e, "errorID", { value: id, writable: true, configurable: true });
  }
  Object.defineProperty(e, "$flashMapped", { value: true });
  return e;
}
