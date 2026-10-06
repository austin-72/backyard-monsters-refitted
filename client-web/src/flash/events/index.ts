/**
 * flash.events. EventDispatcher follows Flash Player's dispatch rules:
 * capture → target → bubble along the display list path computed at dispatch
 * time; listener lists are snapshotted per node (listeners removed during
 * dispatch still fire, added ones do not); higher priority first, then
 * registration order; duplicate registrations are ignored; an event that is
 * dispatched again after being dispatched is clone()d first.
 */
import { ASObject, iface, implement } from "as3";
import { flashClass } from "../_internal";

export class Event extends ASObject {
  declare $type: string;
  declare $bubbles: boolean;
  declare $cancelable: boolean;
  declare $target: any;
  declare $currentTarget: any;
  declare $phase: number;
  declare $stop: number;
  declare $prevented: boolean;
  declare static ENTER_FRAME: string; declare static EXIT_FRAME: string; declare static FRAME_CONSTRUCTED: string;
  declare static ADDED: string; declare static ADDED_TO_STAGE: string; declare static REMOVED: string; declare static REMOVED_FROM_STAGE: string;
  declare static COMPLETE: string; declare static INIT: string; declare static OPEN: string; declare static RESIZE: string;
  declare static CHANGE: string; declare static RENDER: string; declare static ACTIVATE: string; declare static DEACTIVATE: string;
  declare static CLOSE: string; declare static CONNECT: string; declare static UNLOAD: string; declare static SOUND_COMPLETE: string;
  declare static FULLSCREEN: string; declare static MOUSE_LEAVE: string; declare static SELECT: string; declare static CANCEL: string;
  declare static TAB_CHILDREN_CHANGE: string; declare static SCROLL: string;

  $ctor(type: string, bubbles: boolean = false, cancelable: boolean = false): void {
    super.$ctor();
    this.$type = String(type);
    this.$bubbles = !!bubbles;
    this.$cancelable = !!cancelable;
    this.$target = null;
    this.$currentTarget = null;
    this.$phase = 2;
    this.$stop = 0;
    this.$prevented = false;
  }
  get type(): string { return this.$type; }
  get bubbles(): boolean { return this.$bubbles; }
  get cancelable(): boolean { return this.$cancelable; }
  get target(): any { return this.$target; }
  get currentTarget(): any { return this.$currentTarget; }
  get eventPhase(): number { return this.$phase; }
  clone(): Event { return new Event(this.$type, this.$bubbles, this.$cancelable); }
  stopPropagation(): void { this.$stop |= 1; }
  stopImmediatePropagation(): void { this.$stop |= 3; }
  preventDefault(): void { if (this.$cancelable) this.$prevented = true; }
  isDefaultPrevented(): boolean { return this.$prevented; }
  formatToString(className: string, ...args: string[]): string {
    return `[${className} ${args.map((a) => `${a}=${fmt((this as any)[a])}`).join(" ")}]`;
  }
  toString(): string { return this.formatToString("Event", "type", "bubbles", "cancelable", "eventPhase"); }
}
function fmt(v: any): string { return typeof v === "string" ? `"${v}"` : String(v); }
flashClass(Event, "flash.events.Event");

// ------------------------------------------------------------ dispatcher
interface Listener { fn: Function; capture: boolean; priority: number; }

export const IEventDispatcher = iface("flash.events::IEventDispatcher", []);
export interface IEventDispatcher {
  addEventListener(type: string, listener: Function, useCapture?: boolean, priority?: number, useWeakReference?: boolean): void;
  removeEventListener(type: string, listener: Function, useCapture?: boolean): void;
  dispatchEvent(event: Event): boolean;
  hasEventListener(type: string): boolean;
  willTrigger(type: string): boolean;
}

/** Hooks the display list installs (broadcast events, propagation path). */
export const dispatchHooks = {
  broadcastAdded: (_d: EventDispatcher, _type: string) => {},
  broadcastRemoved: (_d: EventDispatcher, _type: string) => {},
  isBroadcast: (_d: EventDispatcher, _type: string) => false,
  /** ancestors of a display object, nearest first; empty for non-display objects */
  path: (_d: EventDispatcher): EventDispatcher[] => [],
};

export class EventDispatcher extends ASObject {
  declare $listeners: Map<string, Listener[]> | null;
  declare $proxyTarget: any;

  $alloc(): void {
    super.$alloc();
    this.$listeners = null;
    this.$proxyTarget = null;
  }
  $ctor(target: any = null): void {
    super.$ctor();
    this.$proxyTarget = target;
  }

  addEventListener(type: string, listener: Function, useCapture: boolean = false, priority: number = 0, _weak: boolean = false): void {
    if (listener == null) throw new TypeError("Error #2007: Parameter listener must be non-null.");
    if (!this.$listeners) this.$listeners = new Map();
    let list = this.$listeners.get(type);
    const first = !list || !list.some((l) => !l.capture);
    if (list?.some((l) => l.fn === listener && l.capture === !!useCapture)) return;
    const entry = { fn: listener, capture: !!useCapture, priority: priority | 0 };
    list = list ? list.slice() : [];
    let i = list.length;
    while (i > 0 && list[i - 1].priority < entry.priority) i--;
    list.splice(i, 0, entry);
    this.$listeners.set(type, list);
    if (first && !useCapture && dispatchHooks.isBroadcast(this, type)) dispatchHooks.broadcastAdded(this, type);
  }

  removeEventListener(type: string, listener: Function, useCapture: boolean = false): void {
    const list = this.$listeners?.get(type);
    if (!list) return;
    const i = list.findIndex((l) => l.fn === listener && l.capture === !!useCapture);
    if (i < 0) return;
    const next = list.slice();
    next.splice(i, 1);
    if (next.length) this.$listeners!.set(type, next); else this.$listeners!.delete(type);
    if (!next.some((l) => !l.capture) && dispatchHooks.isBroadcast(this, type)) dispatchHooks.broadcastRemoved(this, type);
  }

  hasEventListener(type: string): boolean {
    return !!this.$listeners?.get(type)?.length;
  }

  willTrigger(type: string): boolean {
    if (this.hasEventListener(type)) return true;
    return dispatchHooks.path(this).some((d) => d.hasEventListener(type));
  }

  dispatchEvent(event: Event): boolean {
    if (event == null) throw new TypeError("Error #2007: Parameter event must be non-null.");
    if (event.$target != null) event = event.clone();
    const target = this.$proxyTarget ?? this;
    event.$target = target;
    event.$stop = 0;
    const path = dispatchHooks.path(this);
    // capture phase: root first
    for (let i = path.length - 1; i >= 0 && !event.$stop; i--) invoke(path[i], event, 1, true);
    if (!event.$stop) invoke(this, event, 2, false, target);
    if (event.$bubbles) for (let i = 0; i < path.length && !event.$stop; i++) invoke(path[i], event, 3, false);
    event.$currentTarget = null;
    return !event.$prevented;
  }

  toString(): string { return "[object EventDispatcher]"; }
}
flashClass(EventDispatcher, "flash.events.EventDispatcher");
implement(EventDispatcher, [IEventDispatcher]);

function invoke(node: EventDispatcher, event: Event, phase: number, capture: boolean, currentTarget: any = node): void {
  const list = node.$listeners?.get(event.$type);
  if (!list) return;
  event.$phase = phase;
  event.$currentTarget = currentTarget;
  for (const l of list) {
    if (l.capture !== capture) continue;
    l.fn.call(null, event);
    if (event.$stop & 2) return;
  }
}

// ------------------------------------------------------------ event subclasses
export class MouseEvent extends Event {
  declare $localX: number; declare $localY: number; declare $related: any;
  declare $ctrl: boolean; declare $alt: boolean; declare $shift: boolean; declare $buttonDown: boolean; declare $delta: number;
  declare $stageX: number; declare $stageY: number;
  declare static CLICK: string; declare static DOUBLE_CLICK: string; declare static MOUSE_DOWN: string; declare static MOUSE_UP: string;
  declare static MOUSE_MOVE: string; declare static MOUSE_OVER: string; declare static MOUSE_OUT: string; declare static MOUSE_WHEEL: string;
  declare static ROLL_OVER: string; declare static ROLL_OUT: string;
  $ctor(type: string, bubbles = true, cancelable = false, localX = NaN, localY = NaN, relatedObject: any = null,
    ctrlKey = false, altKey = false, shiftKey = false, buttonDown = false, delta = 0): void {
    super.$ctor(type, bubbles, cancelable);
    this.$localX = localX; this.$localY = localY; this.$related = relatedObject;
    this.$ctrl = ctrlKey; this.$alt = altKey; this.$shift = shiftKey; this.$buttonDown = buttonDown; this.$delta = delta | 0;
    this.$stageX = NaN; this.$stageY = NaN;
  }
  get localX(): number { return this.$localX; } set localX(v: number) { this.$localX = v; }
  get localY(): number { return this.$localY; } set localY(v: number) { this.$localY = v; }
  get stageX(): number {
    if (!isNaN(this.$stageX)) return this.$stageX;
    const t = this.$currentTarget ?? this.$target;
    return t?.localToGlobal ? t.localToGlobal({ x: this.$localX, y: this.$localY }).x : this.$localX;
  }
  get stageY(): number {
    if (!isNaN(this.$stageY)) return this.$stageY;
    const t = this.$currentTarget ?? this.$target;
    return t?.localToGlobal ? t.localToGlobal({ x: this.$localX, y: this.$localY }).y : this.$localY;
  }
  get relatedObject(): any { return this.$related; } set relatedObject(v: any) { this.$related = v; }
  get ctrlKey(): boolean { return this.$ctrl; } set ctrlKey(v: boolean) { this.$ctrl = v; }
  get altKey(): boolean { return this.$alt; } set altKey(v: boolean) { this.$alt = v; }
  get shiftKey(): boolean { return this.$shift; } set shiftKey(v: boolean) { this.$shift = v; }
  get buttonDown(): boolean { return this.$buttonDown; } set buttonDown(v: boolean) { this.$buttonDown = v; }
  get delta(): number { return this.$delta; } set delta(v: number) { this.$delta = v | 0; }
  updateAfterEvent(): void {}
  clone(): Event {
    const e = new MouseEvent(this.$type, this.$bubbles, this.$cancelable, this.$localX, this.$localY, this.$related, this.$ctrl, this.$alt, this.$shift, this.$buttonDown, this.$delta);
    e.$stageX = this.$stageX; e.$stageY = this.$stageY;
    return e;
  }
  toString(): string { return this.formatToString("MouseEvent", "type", "bubbles", "cancelable", "eventPhase", "localX", "localY", "stageX", "stageY", "relatedObject", "ctrlKey", "altKey", "shiftKey", "buttonDown", "delta"); }
}
flashClass(MouseEvent, "flash.events.MouseEvent");

/** Where an event's local point is on the stage (set by the player, else computed from the target). */
function stagePoint(e: any, axis: "x" | "y"): number {
  const own = axis === "x" ? e.$stageX : e.$stageY;
  if (!isNaN(own)) return own;
  const t = e.$currentTarget ?? e.$target;
  return t?.localToGlobal ? t.localToGlobal({ x: e.$localX, y: e.$localY })[axis] : axis === "x" ? e.$localX : e.$localY;
}

/**
 * Touch points (Multitouch.inputMode = TOUCH_POINT). The player dispatches TOUCH_BEGIN / TOUCH_MOVE /
 * TOUCH_END / TOUCH_TAP for every finger; the primary finger also produces mouse events, as in Flash.
 */
export class TouchEvent extends Event {
  declare $id: number; declare $primary: boolean; declare $localX: number; declare $localY: number;
  declare $sizeX: number; declare $sizeY: number; declare $pressure: number; declare $related: any;
  declare $ctrl: boolean; declare $alt: boolean; declare $shift: boolean; declare $timestamp: number;
  declare $stageX: number; declare $stageY: number;
  declare static TOUCH_BEGIN: string; declare static TOUCH_END: string; declare static TOUCH_MOVE: string; declare static TOUCH_TAP: string;
  declare static TOUCH_OVER: string; declare static TOUCH_OUT: string; declare static TOUCH_ROLL_OVER: string; declare static TOUCH_ROLL_OUT: string;
  $ctor(type: string, bubbles = true, cancelable = false, touchPointID = 0, isPrimaryTouchPoint = false, localX = NaN, localY = NaN,
    sizeX = NaN, sizeY = NaN, pressure = NaN, relatedObject: any = null, ctrlKey = false, altKey = false, shiftKey = false,
    _commandKey = false, _controlKey = false, timestamp = NaN): void {
    super.$ctor(type, bubbles, cancelable);
    this.$id = touchPointID | 0; this.$primary = !!isPrimaryTouchPoint; this.$localX = localX; this.$localY = localY;
    this.$sizeX = sizeX; this.$sizeY = sizeY; this.$pressure = pressure; this.$related = relatedObject;
    this.$ctrl = ctrlKey; this.$alt = altKey; this.$shift = shiftKey; this.$timestamp = timestamp;
    this.$stageX = NaN; this.$stageY = NaN;
  }
  get touchPointID(): number { return this.$id; } set touchPointID(v: number) { this.$id = v | 0; }
  get isPrimaryTouchPoint(): boolean { return this.$primary; } set isPrimaryTouchPoint(v: boolean) { this.$primary = v; }
  get localX(): number { return this.$localX; } set localX(v: number) { this.$localX = v; }
  get localY(): number { return this.$localY; } set localY(v: number) { this.$localY = v; }
  get stageX(): number { return stagePoint(this, "x"); }
  get stageY(): number { return stagePoint(this, "y"); }
  get sizeX(): number { return this.$sizeX; } set sizeX(v: number) { this.$sizeX = v; }
  get sizeY(): number { return this.$sizeY; } set sizeY(v: number) { this.$sizeY = v; }
  get pressure(): number { return this.$pressure; } set pressure(v: number) { this.$pressure = v; }
  get relatedObject(): any { return this.$related; } set relatedObject(v: any) { this.$related = v; }
  get ctrlKey(): boolean { return this.$ctrl; } set ctrlKey(v: boolean) { this.$ctrl = v; }
  get altKey(): boolean { return this.$alt; } set altKey(v: boolean) { this.$alt = v; }
  get shiftKey(): boolean { return this.$shift; } set shiftKey(v: boolean) { this.$shift = v; }
  get commandKey(): boolean { return false; }
  get controlKey(): boolean { return this.$ctrl; }
  get timestamp(): number { return this.$timestamp; }
  get touchIntent(): string { return "unknown"; }
  get isTouchPointCanceled(): boolean { return false; }
  get isRelatedObjectInaccessible(): boolean { return false; }
  getSamples(_buffer: any, _append = false): number { return 0; }
  isToolButtonDown(_index: number): boolean { return false; }
  updateAfterEvent(): void {}
  clone(): Event {
    const e = new TouchEvent(this.$type, this.$bubbles, this.$cancelable, this.$id, this.$primary, this.$localX, this.$localY, this.$sizeX, this.$sizeY, this.$pressure, this.$related, this.$ctrl, this.$alt, this.$shift, false, false, this.$timestamp);
    e.$stageX = this.$stageX; e.$stageY = this.$stageY;
    return e;
  }
  toString(): string { return this.formatToString("TouchEvent", "type", "bubbles", "cancelable", "eventPhase", "touchPointID", "isPrimaryTouchPoint", "localX", "localY", "stageX", "stageY", "sizeX", "sizeY", "pressure", "relatedObject", "ctrlKey", "altKey", "shiftKey"); }
}
flashClass(TouchEvent, "flash.events.TouchEvent");

/** Gestures (Multitouch.inputMode = GESTURE). */
export class GestureEvent extends Event {
  declare $gphase: string | null; declare $localX: number; declare $localY: number;
  declare $ctrl: boolean; declare $alt: boolean; declare $shift: boolean; declare $stageX: number; declare $stageY: number;
  declare static GESTURE_TWO_FINGER_TAP: string;
  $ctor(type: string, bubbles: any = true, cancelable: any = false, phase: any = null, localX: any = 0, localY: any = 0, ctrlKey: any = false, altKey: any = false, shiftKey: any = false): void {
    super.$ctor(type, bubbles, cancelable);
    this.$gphase = phase; this.$localX = localX; this.$localY = localY;
    this.$ctrl = ctrlKey; this.$alt = altKey; this.$shift = shiftKey; this.$stageX = NaN; this.$stageY = NaN;
  }
  get phase(): string | null { return this.$gphase; } set phase(v: string | null) { this.$gphase = v; }
  get localX(): number { return this.$localX; } set localX(v: number) { this.$localX = v; }
  get localY(): number { return this.$localY; } set localY(v: number) { this.$localY = v; }
  get stageX(): number { return stagePoint(this, "x"); }
  get stageY(): number { return stagePoint(this, "y"); }
  get ctrlKey(): boolean { return this.$ctrl; } set ctrlKey(v: boolean) { this.$ctrl = v; }
  get altKey(): boolean { return this.$alt; } set altKey(v: boolean) { this.$alt = v; }
  get shiftKey(): boolean { return this.$shift; } set shiftKey(v: boolean) { this.$shift = v; }
  get commandKey(): boolean { return false; }
  get controlKey(): boolean { return this.$ctrl; }
  updateAfterEvent(): void {}
  clone(): Event { const e = new GestureEvent(this.$type, this.$bubbles, this.$cancelable, this.$gphase, this.$localX, this.$localY, this.$ctrl, this.$alt, this.$shift); e.$stageX = this.$stageX; e.$stageY = this.$stageY; return e; }
  toString(): string { return this.formatToString("GestureEvent", "type", "bubbles", "cancelable", "eventPhase", "phase", "localX", "localY", "stageX", "stageY"); }
}
flashClass(GestureEvent, "flash.events.GestureEvent");

/** Two-finger zoom / pan / rotate. scaleX/scaleY, offsetX/offsetY and rotation are changes since the previous event. */
export class TransformGestureEvent extends GestureEvent {
  declare $scaleX: number; declare $scaleY: number; declare $rotation: number; declare $offsetX: number; declare $offsetY: number; declare $velocity: number;
  declare static GESTURE_ZOOM: string; declare static GESTURE_PAN: string; declare static GESTURE_ROTATE: string; declare static GESTURE_SWIPE: string;
  $ctor(type: string, bubbles: any = true, cancelable: any = false, phase: any = null, localX: any = 0, localY: any = 0, scaleX: any = 1, scaleY: any = 1,
    rotation: any = 0, offsetX: any = 0, offsetY: any = 0, ctrlKey: any = false, altKey: any = false, shiftKey: any = false, _commandKey = false, _controlKey = false, velocity = 0): void {
    super.$ctor(type, bubbles, cancelable, phase, localX, localY, ctrlKey, altKey, shiftKey);
    this.$scaleX = scaleX; this.$scaleY = scaleY; this.$rotation = rotation; this.$offsetX = offsetX; this.$offsetY = offsetY; this.$velocity = velocity;
  }
  get scaleX(): number { return this.$scaleX; } set scaleX(v: number) { this.$scaleX = v; }
  get scaleY(): number { return this.$scaleY; } set scaleY(v: number) { this.$scaleY = v; }
  get rotation(): number { return this.$rotation; } set rotation(v: number) { this.$rotation = v; }
  get offsetX(): number { return this.$offsetX; } set offsetX(v: number) { this.$offsetX = v; }
  get offsetY(): number { return this.$offsetY; } set offsetY(v: number) { this.$offsetY = v; }
  get velocity(): number { return this.$velocity; } set velocity(v: number) { this.$velocity = v; }
  clone(): Event {
    const e = new TransformGestureEvent(this.$type, this.$bubbles, this.$cancelable, this.$gphase, this.$localX, this.$localY, this.$scaleX, this.$scaleY, this.$rotation, this.$offsetX, this.$offsetY, this.$ctrl, this.$alt, this.$shift, false, false, this.$velocity);
    e.$stageX = this.$stageX; e.$stageY = this.$stageY;
    return e;
  }
  toString(): string { return this.formatToString("TransformGestureEvent", "type", "bubbles", "cancelable", "eventPhase", "phase", "localX", "localY", "stageX", "stageY", "scaleX", "scaleY", "rotation", "offsetX", "offsetY"); }
}
flashClass(TransformGestureEvent, "flash.events.TransformGestureEvent");

export class GesturePhase {
  declare static BEGIN: string; declare static UPDATE: string; declare static END: string; declare static ALL: string;
}
flashClass(GesturePhase, "flash.events.GesturePhase");

export class KeyboardEvent extends Event {
  declare $charCode: number; declare $keyCode: number; declare $keyLocation: number;
  declare $ctrl: boolean; declare $alt: boolean; declare $shift: boolean;
  declare static KEY_DOWN: string; declare static KEY_UP: string;
  $ctor(type: string, bubbles = true, cancelable = false, charCodeValue = 0, keyCodeValue = 0, keyLocationValue = 0, ctrlKeyValue = false, altKeyValue = false, shiftKeyValue = false): void {
    super.$ctor(type, bubbles, cancelable);
    this.$charCode = charCodeValue >>> 0; this.$keyCode = keyCodeValue >>> 0; this.$keyLocation = keyLocationValue >>> 0;
    this.$ctrl = ctrlKeyValue; this.$alt = altKeyValue; this.$shift = shiftKeyValue;
  }
  get charCode(): number { return this.$charCode; } set charCode(v: number) { this.$charCode = v >>> 0; }
  get keyCode(): number { return this.$keyCode; } set keyCode(v: number) { this.$keyCode = v >>> 0; }
  get keyLocation(): number { return this.$keyLocation; }
  get ctrlKey(): boolean { return this.$ctrl; } get altKey(): boolean { return this.$alt; } get shiftKey(): boolean { return this.$shift; }
  updateAfterEvent(): void {}
  clone(): Event { return new KeyboardEvent(this.$type, this.$bubbles, this.$cancelable, this.$charCode, this.$keyCode, this.$keyLocation, this.$ctrl, this.$alt, this.$shift); }
  toString(): string { return this.formatToString("KeyboardEvent", "type", "bubbles", "cancelable", "eventPhase", "charCode", "keyCode", "keyLocation", "ctrlKey", "altKey", "shiftKey"); }
}
flashClass(KeyboardEvent, "flash.events.KeyboardEvent");

export class FocusEvent extends Event {
  declare $related: any; declare $shift: boolean; declare $keyCode: number;
  declare static FOCUS_IN: string; declare static FOCUS_OUT: string; declare static KEY_FOCUS_CHANGE: string; declare static MOUSE_FOCUS_CHANGE: string;
  $ctor(type: string, bubbles = true, cancelable = false, relatedObject: any = null, shiftKey = false, keyCode = 0): void {
    super.$ctor(type, bubbles, cancelable);
    this.$related = relatedObject; this.$shift = shiftKey; this.$keyCode = keyCode;
  }
  get relatedObject(): any { return this.$related; }
  get shiftKey(): boolean { return this.$shift; }
  get keyCode(): number { return this.$keyCode; }
  clone(): Event { return new FocusEvent(this.$type, this.$bubbles, this.$cancelable, this.$related, this.$shift, this.$keyCode); }
}
flashClass(FocusEvent, "flash.events.FocusEvent");

export class TextEvent extends Event {
  declare $text: string;
  declare static LINK: string; declare static TEXT_INPUT: string;
  $ctor(type: string, bubbles = false, cancelable = false, text = ""): void { super.$ctor(type, bubbles, cancelable); this.$text = text; }
  get text(): string { return this.$text; } set text(v: string) { this.$text = v; }
  clone(): Event { return new TextEvent(this.$type, this.$bubbles, this.$cancelable, this.$text); }
}
flashClass(TextEvent, "flash.events.TextEvent");

export class ErrorEvent extends TextEvent {
  declare $errorID: number;
  declare static ERROR: string;
  $ctor(type: string, bubbles = false, cancelable = false, text = "", id = 0): void { super.$ctor(type, bubbles, cancelable, text); this.$errorID = id | 0; }
  get errorID(): number { return this.$errorID; }
  clone(): Event { return new ErrorEvent(this.$type, this.$bubbles, this.$cancelable, this.$text, this.$errorID); }
  toString(): string { return this.formatToString("ErrorEvent", "type", "bubbles", "cancelable", "eventPhase", "text"); }
}
flashClass(ErrorEvent, "flash.events.ErrorEvent");

export class IOErrorEvent extends ErrorEvent {
  declare static IO_ERROR: string;
  clone(): Event { return new IOErrorEvent(this.$type, this.$bubbles, this.$cancelable, this.$text, this.$errorID); }
  toString(): string { return this.formatToString("IOErrorEvent", "type", "bubbles", "cancelable", "eventPhase", "text"); }
}
flashClass(IOErrorEvent, "flash.events.IOErrorEvent");

export class SecurityErrorEvent extends ErrorEvent {
  declare static SECURITY_ERROR: string;
  clone(): Event { return new SecurityErrorEvent(this.$type, this.$bubbles, this.$cancelable, this.$text, this.$errorID); }
}
flashClass(SecurityErrorEvent, "flash.events.SecurityErrorEvent");

export class AsyncErrorEvent extends ErrorEvent {
  declare $error: any;
  declare static ASYNC_ERROR: string;
  $ctor(type: string, bubbles = false, cancelable = false, text = "", error: any = null): void { super.$ctor(type, bubbles, cancelable, text); this.$error = error; }
  get error(): any { return this.$error; }
  clone(): Event { return new AsyncErrorEvent(this.$type, this.$bubbles, this.$cancelable, this.$text, this.$error); }
}
flashClass(AsyncErrorEvent, "flash.events.AsyncErrorEvent");

export class UncaughtErrorEvent extends ErrorEvent {
  declare $error: any;
  declare static UNCAUGHT_ERROR: string;
  $ctor(type = "uncaughtError", bubbles = true, cancelable = true, error: any = null): void {
    super.$ctor(type, bubbles, cancelable, error instanceof Error ? error.message : String(error), (error as any)?.errorID ?? 0);
    this.$error = error;
  }
  get error(): any { return this.$error; }
  clone(): Event { return new UncaughtErrorEvent(this.$type, this.$bubbles, this.$cancelable, this.$error); }
}
flashClass(UncaughtErrorEvent, "flash.events.UncaughtErrorEvent");

export class UncaughtErrorEvents extends EventDispatcher {}
flashClass(UncaughtErrorEvents, "flash.events.UncaughtErrorEvents");

export class ProgressEvent extends Event {
  declare $loaded: number; declare $total: number;
  declare static PROGRESS: string; declare static SOCKET_DATA: string;
  $ctor(type: string, bubbles = false, cancelable = false, bytesLoaded = 0, bytesTotal = 0): void {
    super.$ctor(type, bubbles, cancelable); this.$loaded = bytesLoaded; this.$total = bytesTotal;
  }
  get bytesLoaded(): number { return this.$loaded; } set bytesLoaded(v: number) { this.$loaded = v; }
  get bytesTotal(): number { return this.$total; } set bytesTotal(v: number) { this.$total = v; }
  clone(): Event { return new ProgressEvent(this.$type, this.$bubbles, this.$cancelable, this.$loaded, this.$total); }
}
flashClass(ProgressEvent, "flash.events.ProgressEvent");

export class HTTPStatusEvent extends Event {
  declare $status: number; declare $responseURL: string; declare $headers: any[];
  declare static HTTP_STATUS: string; declare static HTTP_RESPONSE_STATUS: string;
  $ctor(type: string, bubbles = false, cancelable = false, status = 0): void {
    super.$ctor(type, bubbles, cancelable); this.$status = status | 0; this.$responseURL = null; this.$headers = [];
  }
  get status(): number { return this.$status; }
  get responseURL(): string { return this.$responseURL; } set responseURL(v: string) { this.$responseURL = v; }
  get responseHeaders(): any[] { return this.$headers; } set responseHeaders(v: any[]) { this.$headers = v; }
  clone(): Event { return new HTTPStatusEvent(this.$type, this.$bubbles, this.$cancelable, this.$status); }
}
flashClass(HTTPStatusEvent, "flash.events.HTTPStatusEvent");

export class TimerEvent extends Event {
  declare static TIMER: string; declare static TIMER_COMPLETE: string;
  updateAfterEvent(): void {}
  clone(): Event { return new TimerEvent(this.$type, this.$bubbles, this.$cancelable); }
}
flashClass(TimerEvent, "flash.events.TimerEvent");

export class FullScreenEvent extends Event {
  declare $fullScreen: boolean; declare $interactive: boolean;
  declare static FULL_SCREEN: string; declare static FULL_SCREEN_INTERACTIVE_ACCEPTED: string;
  $ctor(type: string, bubbles = false, cancelable = false, fullScreen = false, interactive = false): void {
    super.$ctor(type, bubbles, cancelable); this.$fullScreen = fullScreen; this.$interactive = interactive;
  }
  get fullScreen(): boolean { return this.$fullScreen; }
  get interactive(): boolean { return this.$interactive; }
  clone(): Event { return new FullScreenEvent(this.$type, this.$bubbles, this.$cancelable, this.$fullScreen, this.$interactive); }
}
flashClass(FullScreenEvent, "flash.events.FullScreenEvent");

export class NetStatusEvent extends Event {
  declare $info: any;
  declare static NET_STATUS: string;
  $ctor(type: string, bubbles = false, cancelable = false, info: any = null): void { super.$ctor(type, bubbles, cancelable); this.$info = info; }
  get info(): any { return this.$info; } set info(v: any) { this.$info = v; }
  clone(): Event { return new NetStatusEvent(this.$type, this.$bubbles, this.$cancelable, this.$info); }
}
flashClass(NetStatusEvent, "flash.events.NetStatusEvent");

export class ContextMenuEvent extends Event {
  declare $mouseTarget: any; declare $contextMenuOwner: any;
  declare static MENU_ITEM_SELECT: string; declare static MENU_SELECT: string;
  $ctor(type: string, bubbles = false, cancelable = false, mouseTarget: any = null, contextMenuOwner: any = null): void {
    super.$ctor(type, bubbles, cancelable); this.$mouseTarget = mouseTarget; this.$contextMenuOwner = contextMenuOwner;
  }
  get mouseTarget(): any { return this.$mouseTarget; }
  get contextMenuOwner(): any { return this.$contextMenuOwner; }
  clone(): Event { return new ContextMenuEvent(this.$type, this.$bubbles, this.$cancelable, this.$mouseTarget, this.$contextMenuOwner); }
}
flashClass(ContextMenuEvent, "flash.events.ContextMenuEvent");

export class StatusEvent extends Event {
  declare $code: string; declare $level: string;
  declare static STATUS: string;
  $ctor(type: string, bubbles = false, cancelable = false, code = "", level = ""): void { super.$ctor(type, bubbles, cancelable); this.$code = code; this.$level = level; }
  get code(): string { return this.$code; }
  get level(): string { return this.$level; }
  clone(): Event { return new StatusEvent(this.$type, this.$bubbles, this.$cancelable, this.$code, this.$level); }
}
flashClass(StatusEvent, "flash.events.StatusEvent");
