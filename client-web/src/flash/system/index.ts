/** flash.system: reports a standalone Flash Player projector, which is what the game supports. */
import { ASObject, classByName } from "as3";
import { flashClass } from "../_internal";

export class Capabilities {
  static get playerType(): string { return "StandAlone"; }
  static get version(): string { return "WIN 32,0,0,465"; }
  static get os(): string { return "Windows 10"; }
  static get manufacturer(): string { return "Adobe Windows"; }
  static get language(): string { return (navigator.language || "en").split("-")[0]; }
  static get isDebugger(): boolean { return false; }
  static get screenResolutionX(): number { return screen.width; }
  static get screenResolutionY(): number { return screen.height; }
  static get screenDPI(): number { return 72; }
  static get pixelAspectRatio(): number { return 1; }
  static get hasAudio(): boolean { return true; }
  static get hasMP3(): boolean { return true; }
  static get hasVideoEncoder(): boolean { return false; }
  static get avHardwareDisable(): boolean { return false; }
  static get localFileReadDisable(): boolean { return false; }
  static get cpuArchitecture(): string { return "x86"; }
  static get supports32BitProcesses(): boolean { return true; }
  static get supports64BitProcesses(): boolean { return true; }
  /** "finger" on phones and tablets (the game can adapt its layout), "none" with a mouse. */
  static get touchscreenType(): string { return typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches ? "finger" : "none"; }
  static get serverString(): string { return ""; }
  static get isEmbeddedInAcrobat(): boolean { return false; }
  static hasMultiChannelAudio(_type: string): boolean { return false; }
}
flashClass(Capabilities, "flash.system.Capabilities");

export class Security {
  static get sandboxType(): string { return "localTrusted"; }
  static get pageDomain(): string | null { return null; }
  static allowDomain(..._d: string[]): void {}
  static allowInsecureDomain(..._d: string[]): void {}
  static loadPolicyFile(_url: string): void {}
  static showSettings(_panel: string = "default"): void {}
  static get exactSettings(): boolean { return true; }
  static set exactSettings(_v: boolean) {}
}
flashClass(Security, "flash.system.Security");

export class System {
  static get totalMemory(): number { return ((performance as any).memory?.usedJSHeapSize ?? 64 * 1024 * 1024) >>> 0; }
  static get totalMemoryNumber(): number { return (performance as any).memory?.usedJSHeapSize ?? 64 * 1024 * 1024; }
  static get privateMemory(): number { return System.totalMemoryNumber; }
  static get freeMemory(): number { return 0; }
  static get vmVersion(): string { return "1.4.0"; }
  static get useCodePage(): boolean { return false; }
  static set useCodePage(_v: boolean) {}
  static gc(): void {}
  static pause(): void {}
  static resume(): void {}
  static exit(_code: number): void { window.close(); }
  static setClipboard(s: string): void { navigator.clipboard?.writeText(String(s)).catch(() => {}); }
  static pauseForGCIfCollectionImminent(_f: number = 0.75): void {}
  static disposeXML(_x: any): void {}
}
flashClass(System, "flash.system.System");

export class ApplicationDomain extends ASObject {
  static get currentDomain(): ApplicationDomain { return current; }
  get parentDomain(): ApplicationDomain | null { return null; }
  getDefinition(name: string): any {
    const i = name.lastIndexOf(".");
    const c = classByName(name.includes("::") || i < 0 ? name : `${name.slice(0, i)}::${name.slice(i + 1)}`);
    if (!c) { const e = new ReferenceError(`Error #1065: Variable ${name} is not defined.`); (e as any).errorID = 1065; throw e; }
    return c;
  }
  hasDefinition(name: string): boolean { try { this.getDefinition(name); return true; } catch { return false; } }
}
flashClass(ApplicationDomain, "flash.system.ApplicationDomain");
const current = new ApplicationDomain();

export class SecurityDomain extends ASObject {
  static get currentDomain(): SecurityDomain { return sd; }
}
flashClass(SecurityDomain, "flash.system.SecurityDomain");
const sd = new SecurityDomain();

export class LoaderContext extends ASObject {
  declare checkPolicyFile: boolean; declare applicationDomain: any; declare securityDomain: any;
  declare allowCodeImport: boolean; declare allowLoadBytesCodeExecution: boolean; declare parameters: any;
  $ctor(checkPolicyFile: boolean = false, applicationDomain: any = null, securityDomain: any = null): void {
    super.$ctor();
    this.checkPolicyFile = checkPolicyFile; this.applicationDomain = applicationDomain; this.securityDomain = securityDomain;
    this.allowCodeImport = true; this.allowLoadBytesCodeExecution = true; this.parameters = null;
  }
}
flashClass(LoaderContext, "flash.system.LoaderContext");
