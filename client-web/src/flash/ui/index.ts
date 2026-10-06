/** flash.ui */
import { ASObject } from "as3";
import { flashClass } from "../_internal";
import { EventDispatcher } from "../events";
import { Vector } from "as3";

export class Keyboard {
  /** key code constants (installed from playerglobal) */
  static [key: string]: any;
  static get capsLock(): boolean { return keyState.capsLock; }
  static get numLock(): boolean { return keyState.numLock; }
  static isAccessible(): boolean { return true; }
}
flashClass(Keyboard, "flash.ui.Keyboard");
export const keyState = { capsLock: false, numLock: false };

/** Mouse cursor state; the player maps it onto the canvas' CSS cursor. */
export const cursorState = { hidden: false, cursor: "auto" };
export class Mouse {
  static hide(): void { cursorState.hidden = true; }
  static show(): void { cursorState.hidden = false; }
  static get cursor(): string { return cursorState.cursor; }
  static set cursor(v: string) { cursorState.cursor = v; }
  static get supportsCursor(): boolean { return true; }
  static get supportsNativeCursor(): boolean { return true; }
  static registerCursor(_name: string, _data: any): void {}
  static unregisterCursor(_name: string): void {}
}
flashClass(Mouse, "flash.ui.Mouse");
export const MouseCursor: any = class MouseCursor {};
flashClass(MouseCursor, "flash.ui.MouseCursor");

export class ContextMenuItem extends EventDispatcher {
  declare caption: string; declare separatorBefore: boolean; declare enabled: boolean; declare visible: boolean;
  $ctor(caption: string, separatorBefore: boolean = false, enabled: boolean = true, visible: boolean = true): void {
    super.$ctor();
    this.caption = caption; this.separatorBefore = separatorBefore; this.enabled = enabled; this.visible = visible;
  }
  clone(): ContextMenuItem { return new ContextMenuItem(this.caption, this.separatorBefore, this.enabled, this.visible); }
}
flashClass(ContextMenuItem, "flash.ui.ContextMenuItem");

export class ContextMenu extends EventDispatcher {
  declare customItems: ContextMenuItem[]; declare builtInItems: any;
  $ctor(): void { super.$ctor(); this.customItems = []; this.builtInItems = {}; }
  hideBuiltInItems(): void {}
  clone(): ContextMenu { const c = new ContextMenu(); c.customItems = this.customItems.map((i) => i.clone()); return c; }
}
flashClass(ContextMenu, "flash.ui.ContextMenu");

/**
 * Touch screens. With inputMode NONE (the default) touches reach the game as mouse events and a
 * two-finger pinch arrives as mouse-wheel steps; TOUCH_POINT and GESTURE deliver TouchEvents or
 * TransformGestureEvents as in Flash (see the player). Capabilities.touchscreenType tells the game
 * whether it runs on a touch screen.
 */
export class Multitouch {
  /** NONE: touches are mouse events. TOUCH_POINT: TouchEvents (the primary finger also as mouse). GESTURE: TransformGestureEvents. */
  static inputMode = "none";
  static get supportsTouchEvents(): boolean { return ((navigator as any).maxTouchPoints || 0) > 0; }
  static get supportsGestureEvents(): boolean { return ((navigator as any).maxTouchPoints || 0) > 1; }
  static get supportedGestures(): any {
    if (!Multitouch.supportsGestureEvents) return null;
    const v: any = new Vector<string>(0, false, String as any);
    for (const g of ["gestureZoom", "gesturePan", "gestureRotate"]) v.push(g);
    return v;
  }
  static get maxTouchPoints(): number { return (navigator as any).maxTouchPoints || 0; }
  static get mapTouchToMouse(): boolean { return true; }
  static set mapTouchToMouse(_v: boolean) {}
}
flashClass(Multitouch, "flash.ui.Multitouch");
export class MultitouchInputMode {
  static readonly GESTURE = "gesture";
  static readonly NONE = "none";
  static readonly TOUCH_POINT = "touchPoint";
}
flashClass(MultitouchInputMode, "flash.ui.MultitouchInputMode");
void ASObject;
