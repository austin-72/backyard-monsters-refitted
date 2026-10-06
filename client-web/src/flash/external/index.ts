/**
 * flash.external. The game runs as a standalone projector (GLOBAL._local), where
 * ExternalInterface is unavailable; calls fail exactly as they do there.
 */
import { flashClass } from "../_internal";

function unavailable(): Error {
  return new Error("Error #2067: The ExternalInterface is not available in this container. ExternalInterface requires Internet Explorer ActiveX, Firefox, Mozilla 1.7.5 and greater, or other browsers that support NPRuntime.");
}
export class ExternalInterface {
  static marshallExceptions = false;
  static get available(): boolean { return false; }
  static get objectID(): string | null { return null; }
  static call(_functionName: string, ..._args: any[]): any { throw unavailable(); }
  static addCallback(_functionName: string, _closure: Function): void { throw unavailable(); }
}
flashClass(ExternalInterface, "flash.external.ExternalInterface");
