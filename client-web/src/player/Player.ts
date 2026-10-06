/**
 * The browser "Flash Player": creates the stage, constructs the document class,
 * runs the frame loop at the SWF frame rate, renders the display list to a
 * canvas and turns browser input into Flash input events.
 */
import { ByteArray } from "flash/utils";
import { Event, MouseEvent, KeyboardEvent, FocusEvent, UncaughtErrorEvent, FullScreenEvent, TouchEvent, TransformGestureEvent } from "flash/events";
import {
  Stage, LoaderInfo, DisplayObject, DisplayObjectContainer, InteractiveObject, MovieClip, Sprite, SimpleButton,
  player, stageHooks, broadcastLists, renderObject, pick, dragState, activeClips, redrawRegions, setCullRects, interp, type M6,
} from "../flash/display/core";
import { TextField, inputBridge, textCache } from "flash/text";
import { cursorState, keyState, Multitouch } from "flash/ui";
import { resumeAudio } from "flash/media";
import { runtimeHooks } from "../flash/_runtime";
import { later, pageHidden } from "../flash/_clock";
import { cssColor, context2d } from "../flash/_internal";

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

export async function startPlayer(o: PlayerOptions): Promise<any> {
  const canvas = document.createElement("canvas");
  canvas.tabIndex = 0;
  Object.assign(canvas.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", outline: "none", touchAction: "none" });
  if (getComputedStyle(o.container).position === "static") o.container.style.position = "relative";
  o.container.style.overflow = "hidden";
  o.container.appendChild(canvas);
  inputBridge.install(o.container);
  const ctx = context2d(canvas, { alpha: false });

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
  const settings = {
    renderScale: 1, // 1, 0.75, 0.5: fixed rendering resolution, scaled up by the browser
    hidpi: o.parameters.hidpi === "1", // draw at the display's full resolution on scaled displays
    maxDensity: 4, // with hidpi: at most this many canvas pixels per CSS pixel ("Sharp (2x)" uses 2)
    dynamic: o.parameters.quality === "auto", // lower the resolution automatically when frames are late
    fullRedraw: o.parameters.redraw === "full", // redraw the whole window every frame
    // frame interpolation: made-up frames shown between two of the game's (0 = off); ?interp=N for testing
    interpolate: Math.max(0, Math.min(4, Number(o.parameters.interp) | 0)),
  };
  const applySettings = (p: Partial<typeof settings>) => {
    Object.assign(settings, p);
    settings.interpolate = Math.max(0, Math.min(4, settings.interpolate | 0));
    if (!settings.dynamic) { adaptive.scale = 1; adaptive.failed.clear(); adaptive.slow = adaptive.fast = 0; }
    fullNext = true;
    layout();
  };
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
      const fit = Math.min(1, w / o.width, h / o.height);
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
  stage.$fullScreenAvailable = !!fullscreenRequest(o.container);
  stageHooks.setDisplayState = (v: string) => {
    const full = v === "fullScreen" || v === "fullScreenInteractive";
    if (full) {
      if (!runtimeHooks.inUserGesture) throw Object.assign(new Error("Error #2152: Full screen mode is not allowed."), { name: "SecurityError", errorID: 2152 });
      const request = fullscreenRequest(o.container);
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
  canvas.addEventListener("pointercancel", (ev) => { touchUp(ev, true); if (!touches.size) pinch = null; });
  canvas.addEventListener("pointermove", (ev) => {
    if (touchMove(ev)) return;
    toStage(ev);
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
    keyEvent(KeyboardEvent.KEY_DOWN, ev);
    if (!typingInField() && (ev.key === "Tab" || ev.key === "Backspace" || ev.key.startsWith("Arrow") || ev.key === " ")) ev.preventDefault();
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
      if (ch instanceof MovieClip && ch.$p) activeClips.add(ch);
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
      drawAll(ctx, base);
      return;
    }
    if (!rects.length) return;
    for (const r of rects) stats.drawnPx += (r[2] - r[0]) * (r[3] - r[1]);
    ctx.save();
    ctx.beginPath();
    for (const r of rects) ctx.rect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
    ctx.clip();
    for (const r of rects) ctx.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
    setCullRects(rects);
    try {
      drawAll(ctx, base);
    } finally {
      setCullRects(null);
      ctx.restore();
    }
  };
  /** Test hook: draws a full frame offscreen and counts pixels that differ from the screen (should be 0). */
  const verifyRedraw = () => {
    const off = document.createElement("canvas");
    off.width = canvas.width; off.height = canvas.height;
    const octx = context2d(off, { alpha: false });
    octx.fillStyle = cssColor(stage.$color);
    octx.fillRect(0, 0, off.width, off.height);
    drawAll(octx, [scale * dpr, 0, 0, scale * dpr, offX * dpr, offY * dpr]);
    const a = ctx.getImageData(0, 0, canvas.width, canvas.height).data, b = octx.getImageData(0, 0, off.width, off.height).data;
    let diff = 0, x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    for (let i = 0; i < a.length; i += 4) {
      if (Math.abs(a[i] - b[i]) > 24 || Math.abs(a[i + 1] - b[i + 1]) > 24 || Math.abs(a[i + 2] - b[i + 2]) > 24) {
        diff++;
        const p = i / 4, x = p % canvas.width, y = (p / canvas.width) | 0;
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
    }
    return diff ? { diff, box: [x0, y0, x1, y1] } : { diff: 0 };
  };
  const stats = { frames: 0, scriptMs: 0, renderMs: 0, maxFrameMs: 0, late: 0, drawnPx: 0, fullFrames: 0 };
  // ------------------------------------------------------------ frame interpolation (see interp in display/core)
  // The game's yard renderer finds the interpolation through the stage (Renderer.as, browser build only).
  (stage as any).$ioInterp = interp;
  /** Time a drawing has been taking lately (ms): a made-up frame is left out when it would not fit. */
  let drawCost = 4;
  // When hardly any made-up frame fits (under a tenth: a slow device, a big battle) interpolation pauses for a few seconds:
  // its real frames are drawn part of the way too, which costs drawing for nothing then.
  let pausedUntil = 0, windowStart = 0, winShown = 0, winSkipped = 0;
  const setInterp = () => {
    const now = performance.now();
    if (settings.interpolate > 0 && !pageHidden()) {
      if (now - windowStart >= 1000) {
        const tried = winShown + winSkipped;
        if (tried >= 20 && winShown < tried * 0.1 && now >= pausedUntil) pausedUntil = now + 3000;
        windowStart = now; winShown = 0; winSkipped = 0;
      }
    }
    const n = pageHidden() || now < pausedUntil ? 0 : settings.interpolate;
    interp.frames = n;
    interp.on = n > 0;
    interp.first = n > 0 ? 1 / (n + 1) : 1;
  };
  /** A made-up frame `a` of the way from the game's last frame but one to its last (1: exactly the last). */
  const invented = (a: number) => {
    const t1 = performance.now();
    try { interp.hook?.(a, interp.tick); } catch (e) { console.error("interpolation", e); }
    interp.apply(a);
    try { render(); } finally { interp.restore(); }
    const t2 = performance.now();
    drawCost = drawCost * 0.8 + (t2 - t1) * 0.2;
    interp.stats.shown++;
    interp.stats.invented++;
    winShown++;
  };
  const frame = () => {
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
    if (stage.$invalidated) { stage.$invalidated = false; broadcast("render"); }
    const t1 = performance.now();
    if (pageHidden()) fullNext = true;
    else if (interp.on) {
      // the real frame, the first share of the way (the game's yard renderer drew its part so already)
      interp.apply(interp.first);
      try { render(); } finally { interp.restore(); }
      interp.stats.shown++;
    }
    else { render(); if (settings.interpolate > 0) interp.stats.shown++; } // (paused: still a frame shown)
    const t2 = performance.now();
    if (interp.on) drawCost = drawCost * 0.8 + (t2 - t1) * 0.2;
    stats.frames++;
    stats.scriptMs += t1 - t0;
    stats.renderMs += t2 - t1;
    stats.maxFrameMs = Math.max(stats.maxFrameMs, t2 - t0);
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
  let next = performance.now();
  let made = 0; // made-up frames shown since the last real one
  const loop = () => {
    let now = performance.now();
    const interval = 1000 / stage.$frameRate;
    if (now >= next) {
      if (interp.on && made < interp.frames && interp.stats.real > 0) { interp.stats.skipped += interp.frames - made; winSkipped += interp.frames - made; } // (no time left for them)
      frame();
      made = 0;
      next += interval;
      if (now - next > 250) next = now + interval;
    } else if (interp.on && made < interp.frames) {
      const start = next - interval, step = interval / (interp.frames + 1);
      let k = Math.min(interp.frames, Math.floor((now - start) / step)); // the latest one due
      if (k > made) {
        if (now + drawCost < next - 1) { invented(k >= interp.frames ? 1 : (k + 1) / (interp.frames + 1)); }
        else { interp.stats.skipped += k - made; winSkipped += k - made; }
        made = k;
      }
    }
    now = performance.now();
    let wake = next;
    if (interp.on && made < interp.frames) wake = Math.min(wake, next - interval + (made + 1) * (interval / (interp.frames + 1)));
    later(loop, Math.max(0, wake - now));
  };
  loop();
  // Nothing is drawn while the page is hidden (the game still runs); the first frame back is drawn whole.
  document.addEventListener("visibilitychange", () => { if (!pageHidden()) fullNext = true; });
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
  const api = { stage, frame, render, info, stats, debug: player.debug, adaptive, verifyRedraw, broadcastLists, settings, applySettings, focusedInputRect, stageToClient, interp, textCache };
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
