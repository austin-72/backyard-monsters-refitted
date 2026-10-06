/** flash.net */
import { ASObject } from "as3";
import { EventDispatcher, Event, IOErrorEvent, HTTPStatusEvent, ProgressEvent, SecurityErrorEvent, NetStatusEvent } from "../events";
import { flashClass, nullParam, unimplemented } from "../_internal";
import { runtimeHooks } from "../_runtime";
import { ByteArray } from "../utils";

export class URLRequest extends ASObject {
  declare url: string;
  declare data: any;
  declare method: string;
  declare contentType: string;
  declare requestHeaders: any[];
  declare $digest: string | null;
  $ctor(url: string = null): void {
    super.$ctor();
    this.url = url;
    this.data = null;
    this.method = "GET";
    this.contentType = "application/x-www-form-urlencoded";
    this.requestHeaders = [];
    this.$digest = null;
  }
  get digest(): string | null { return this.$digest; }
  set digest(v: string | null) { this.$digest = v; }
}
flashClass(URLRequest, "flash.net.URLRequest");

export class URLRequestHeader extends ASObject {
  declare name: string;
  declare value: string;
  $ctor(name: string = "", value: string = ""): void { super.$ctor(); this.name = name; this.value = value; }
}
flashClass(URLRequestHeader, "flash.net.URLRequestHeader");

export const URLRequestMethod: any = class URLRequestMethod {};
flashClass(URLRequestMethod, "flash.net.URLRequestMethod");
export const URLLoaderDataFormat: any = class URLLoaderDataFormat {};
flashClass(URLLoaderDataFormat, "flash.net.URLLoaderDataFormat");
export const ObjectEncoding: any = class ObjectEncoding {};
flashClass(ObjectEncoding, "flash.net.ObjectEncoding");
export const SharedObjectFlushStatus: any = class SharedObjectFlushStatus {};
flashClass(SharedObjectFlushStatus, "flash.net.SharedObjectFlushStatus");

/** Dynamic name/value pairs, encoded as application/x-www-form-urlencoded. */
export class URLVariables extends ASObject {
  [key: string]: any;
  $ctor(source: string = null): void {
    super.$ctor();
    if (source != null) this.decode(source);
  }
  decode(source: string): void {
    for (const pair of String(source).split("&")) {
      if (!pair) continue;
      const i = pair.indexOf("=");
      if (i < 0) throw new Error("Error #2101: The String passed to URLVariables.decode() must be a URL-encoded query string containing name/value pairs.");
      const k = decodeURIComponent(pair.slice(0, i).replace(/\+/g, " "));
      const v = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, " "));
      const prev = this[k];
      if (prev === undefined) this[k] = v;
      else if (Array.isArray(prev)) prev.push(v);
      else this[k] = [prev, v];
    }
  }
  toString(): string {
    const out: string[] = [];
    for (const k of Object.keys(this)) {
      const v = this[k];
      const enc = (x: any) => `${escapeFlash(k)}=${escapeFlash(String(x))}`;
      if (Array.isArray(v)) v.forEach((x) => out.push(enc(x))); else out.push(enc(v));
    }
    return out.join("&");
  }
}
flashClass(URLVariables, "flash.net.URLVariables");

/** Flash's URL encoding (like escape(), but UTF-8 and leaving @-*._ and letters/digits). */
function escapeFlash(s: string): string {
  return encodeURIComponent(s).replace(/[!'()~]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

interface Prepared { url: string; init: RequestInit; }
function prepare(req: URLRequest): Prepared {
  let url = String(req.url ?? "");
  let method = String(req.method ?? "GET").toUpperCase();
  const headers = new Headers();
  for (const h of req.requestHeaders ?? []) if (h?.name) headers.set(String(h.name), String(h.value));
  let body: BodyInit | undefined;
  const data = req.data;
  let encoded: string | Uint8Array | null = null;
  if (data instanceof ByteArray) encoded = data.$toUint8Array();
  else if (data != null) encoded = String(data);
  // Flash sends a POST without a body as a GET (the server routes rely on this).
  if (method === "POST" && (encoded == null || encoded.length === 0)) method = "GET";
  if (method === "GET") {
    if (typeof encoded === "string" && encoded.length) url += (url.includes("?") ? "&" : "?") + encoded;
  } else {
    body = encoded as BodyInit;
    if (!headers.has("Content-Type")) headers.set("Content-Type", req.contentType ?? "application/x-www-form-urlencoded");
  }
  return { url, init: { method, headers, body, mode: "cors", credentials: "omit" } };
}

/**
 * URLLoader. Events arrive on later frames: open, progress, httpStatus, then
 * complete (2xx) or ioError #2032 (other status, network failure). The body
 * of an error response is still available in `data`, as in the projector.
 */
export class URLLoader extends EventDispatcher {
  declare data: any;
  declare dataFormat: string;
  declare bytesLoaded: number;
  declare bytesTotal: number;
  declare $abort: AbortController | null;
  $ctor(request: URLRequest = null): void {
    super.$ctor();
    this.data = undefined;
    this.dataFormat = "text";
    this.bytesLoaded = 0;
    this.bytesTotal = 0;
    this.$abort = null;
    if (request) this.load(request);
  }
  load(request: URLRequest): void {
    if (request == null) throw nullParam("request");
    this.close();
    const { url, init } = prepare(request);
    const abort = new AbortController();
    this.$abort = abort;
    init.signal = abort.signal;
    const live = () => this.$abort === abort;
    const fire = (e: Event) => runtimeHooks.defer(() => { if (live() || e.type !== Event.OPEN) this.dispatchEvent(e); });
    fire(new Event(Event.OPEN));
    fetch(url, init).then(async (res) => {
      const buf = new Uint8Array(await res.arrayBuffer());
      if (!live()) return;
      runtimeHooks.defer(() => {
        if (!live()) return;
        this.bytesLoaded = this.bytesTotal = buf.length;
        this.data = this.$decode(buf);
        this.dispatchEvent(new ProgressEvent(ProgressEvent.PROGRESS, false, false, buf.length, buf.length));
        const status = new HTTPStatusEvent(HTTPStatusEvent.HTTP_STATUS, false, false, res.status);
        status.responseURL = res.url;
        status.responseHeaders = [...res.headers].map(([name, value]) => new URLRequestHeader(name, value));
        this.dispatchEvent(status);
        this.$abort = null;
        if (res.ok) this.dispatchEvent(new Event(Event.COMPLETE));
        else this.dispatchEvent(new IOErrorEvent(IOErrorEvent.IO_ERROR, false, false, `Error #2032: Stream Error. URL: ${url}`, 2032));
      });
    }).catch((err) => {
      if (!live()) return;
      runtimeHooks.defer(() => {
        if (!live()) return;
        this.$abort = null;
        this.dispatchEvent(new HTTPStatusEvent(HTTPStatusEvent.HTTP_STATUS, false, false, 0));
        if (err?.name === "SecurityError") this.dispatchEvent(new SecurityErrorEvent(SecurityErrorEvent.SECURITY_ERROR, false, false, `Error #2048: Security sandbox violation: cannot load data from ${url}.`, 2048));
        else this.dispatchEvent(new IOErrorEvent(IOErrorEvent.IO_ERROR, false, false, `Error #2032: Stream Error. URL: ${url}`, 2032));
      });
    });
  }
  private $decode(buf: Uint8Array): any {
    switch (this.dataFormat) {
      case "binary": return ByteArray.$from(buf);
      case "variables": return new URLVariables(new TextDecoder().decode(buf));
      default: {
        let s = new TextDecoder().decode(buf);
        if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
        return s;
      }
    }
  }
  close(): void {
    if (this.$abort) { const a = this.$abort; this.$abort = null; a.abort(); }
  }
}
flashClass(URLLoader, "flash.net.URLLoader");

export function navigateToURL(request: URLRequest, window: string = null): void {
  if (request == null) throw nullParam("request");
  const { url } = prepare(request);
  globalThis.open(url, window ?? "_blank", "noopener");
}
export function sendToURL(request: URLRequest): void {
  const { url, init } = prepare(request);
  fetch(url, init).catch(() => {});
}

// ------------------------------------------------------------ SharedObject
const PREFIX = "bymr-so:";
const live = new Map<string, SharedObject>();

/**
 * Local shared objects persisted in localStorage as JSON. Like Flash, data is
 * also written when the page unloads, even without flush().
 */
export class SharedObject extends EventDispatcher {
  declare $key: string;
  declare $data: any;
  declare client: any;
  declare objectEncoding: number;
  $ctor(): void {
    super.$ctor();
    this.$key = "";
    this.$data = {};
    this.client = this;
    this.objectEncoding = 3;
  }
  static getLocal(name: string, localPath: string = null, _secure: boolean = false): SharedObject {
    if (/[~%&\\;:"',<>?#\s]/.test(name)) throw new Error("Error #2134: Cannot create SharedObject.");
    const key = `${PREFIX}${localPath ?? location.pathname}/${name}`;
    let so = live.get(key);
    if (!so) {
      so = new SharedObject();
      so.$key = key;
      try { const raw = localStorage.getItem(key); if (raw) so.$data = revive(JSON.parse(raw)); } catch { /* corrupt or blocked storage: start empty */ }
      live.set(key, so);
    }
    return so;
  }
  static getRemote(): SharedObject { unimplemented("SharedObject.getRemote"); return new SharedObject(); }
  static get defaultObjectEncoding(): number { return 3; }
  get data(): any { return this.$data; }
  get size(): number { try { return JSON.stringify(this.$data).length; } catch { return 0; } }
  flush(_minDiskSpace: number = 0): string {
    try {
      if (Object.keys(this.$data).length === 0) localStorage.removeItem(this.$key);
      else localStorage.setItem(this.$key, JSON.stringify(this.$data, replacer));
      return "flushed";
    } catch {
      throw new Error("Error #2130: Unable to flush SharedObject.");
    }
  }
  clear(): void { for (const k of Object.keys(this.$data)) delete this.$data[k]; try { localStorage.removeItem(this.$key); } catch { /* ignore */ } }
  close(): void {}
  setProperty(name: string, value: any = null): void { this.$data[name] = value; }
  setDirty(_name: string): void {}
  connect(): void { unimplemented("SharedObject.connect"); }
}
flashClass(SharedObject, "flash.net.SharedObject");

function replacer(this: any, _k: string, v: any): any {
  if (v instanceof Date) return { $date: v.getTime() };
  return v;
}
function revive(v: any): any {
  if (v && typeof v === "object") {
    if (typeof v.$date === "number" && Object.keys(v).length === 1) return new Date(v.$date);
    for (const k of Object.keys(v)) v[k] = revive(v[k]);
  }
  return v;
}
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => { for (const so of live.values()) { try { so.flush(); } catch { /* ignore */ } } });
}

// ------------------------------------------------------------ not yet available in the browser build
/** Raw TCP is impossible in a browser; the chat's WebSocket library is replaced separately. */
export class Socket extends EventDispatcher {
  declare timeout: number;
  declare endian: string;
  declare objectEncoding: number;
  $ctor(_host: string = null, _port: number = 0): void { super.$ctor(); this.timeout = 20000; this.endian = "bigEndian"; this.objectEncoding = 3; }
  get connected(): boolean { return false; }
  get bytesAvailable(): number { return 0; }
  connect(host: string, port: number): void {
    runtimeHooks.defer(() => this.dispatchEvent(new IOErrorEvent(IOErrorEvent.IO_ERROR, false, false, `Error #2031: Socket Error. URL: ${host}:${port}`, 2031)));
  }
  close(): void {}
  flush(): void {}
}
flashClass(Socket, "flash.net.Socket");

export class NetConnection extends EventDispatcher {
  declare client: any;
  $ctor(): void { super.$ctor(); this.client = null; }
  get connected(): boolean { return false; }
  connect(command: string, ..._args: any[]): void {
    if (command == null) runtimeHooks.defer(() => this.dispatchEvent(new NetStatusEvent(NetStatusEvent.NET_STATUS, false, false, { code: "NetConnection.Connect.Success", level: "status" })));
    else unimplemented("NetConnection.connect(server)");
  }
  close(): void {}
}
flashClass(NetConnection, "flash.net.NetConnection");

/**
 * NetStream for progressive video. Browsers cannot decode FLV, so the MP4
 * remux next to an .flv URL is played (tools/video/remux-flv.sh), with the
 * NET_STATUS codes Flash sends for progressive playback.
 */
export class NetStream extends EventDispatcher {
  declare client: any;
  declare bufferTime: number;
  declare $video: HTMLVideoElement | null;
  declare $volume: number;
  $ctor(_connection: NetConnection, _peerID: string = "connectToFMS"): void {
    super.$ctor();
    this.client = null;
    this.bufferTime = 0.1;
    this.$video = null;
    this.$volume = 1;
  }
  private $status(code: string, level = "status"): void {
    runtimeHooks.defer(() => this.dispatchEvent(new NetStatusEvent(NetStatusEvent.NET_STATUS, false, false, { code, level })));
  }
  play(...args: any[]): void {
    const url = String(args[0] ?? "");
    this.close();
    const v = document.createElement("video");
    v.crossOrigin = "anonymous";
    v.playsInline = true;
    v.preload = "auto";
    v.volume = this.$volume;
    const flv = /\.flv(\?.*)?$/i;
    const candidates = flv.test(url) ? [url.replace(flv, ".mp4$1"), url.replace(flv, ".webm$1"), url] : [url];
    let attempt = 0;
    let started = false;
    const tryNext = () => {
      if (attempt >= candidates.length) { this.$status("NetStream.Play.StreamNotFound", "error"); return; }
      v.src = candidates[attempt++];
      v.play().catch(() => { /* autoplay refusal: frames still decode; errors arrive via onerror */ });
    };
    v.onerror = () => { if (!started) tryNext(); };
    v.onloadedmetadata = () => {
      const meta = { duration: v.duration, width: v.videoWidth, height: v.videoHeight };
      runtimeHooks.defer(() => { const cb = this.client?.onMetaData; if (typeof cb === "function") cb(meta); });
    };
    v.onplaying = () => {
      if (started) return;
      started = true;
      this.$status("NetStream.Play.Start");
      this.$status("NetStream.Buffer.Full");
    };
    v.onended = () => {
      this.$status("NetStream.Buffer.Flush");
      this.$status("NetStream.Play.Stop");
      this.$status("NetStream.Buffer.Empty");
    };
    this.$video = v;
    tryNext();
  }
  pause(): void { this.$video?.pause(); this.$status("NetStream.Pause.Notify"); }
  resume(): void { this.$video?.play().catch(() => {}); this.$status("NetStream.Unpause.Notify"); }
  togglePause(): void { if (this.$video?.paused) this.resume(); else this.pause(); }
  seek(offset: number): void {
    if (this.$video) this.$video.currentTime = Math.max(0, +offset || 0);
    this.$status("NetStream.Seek.Notify");
  }
  close(): void {
    const v = this.$video;
    if (!v) return;
    v.onended = v.onplaying = v.onerror = v.onloadedmetadata = null;
    v.pause();
    v.removeAttribute("src");
    v.load();
    this.$video = null;
  }
  get time(): number { return this.$video?.currentTime ?? 0; }
  get bytesLoaded(): number { return this.$video ? 1 : 0; }
  get bytesTotal(): number { return this.$video ? 1 : 0; }
  get bufferLength(): number { const v = this.$video; return v && v.buffered.length ? v.buffered.end(v.buffered.length - 1) - v.currentTime : 0; }
  get soundTransform(): any { return { volume: this.$volume, pan: 0 }; }
  set soundTransform(t: any) { this.$volume = Math.max(0, Math.min(1, Number(t?.volume ?? 1))); if (this.$video) this.$video.volume = this.$volume; }
}
flashClass(NetStream, "flash.net.NetStream");

/**
 * FileReference: browse() opens the browser's file picker (Event.SELECT when a file is chosen, Event.CANCEL when
 * not), load() reads it into `data` (a ByteArray; Event.COMPLETE), save() downloads data (a ByteArray or text) as
 * a file. (Inferno-only use: opening a downloaded attack replay, IoReplays.as.) Browsers only open a picker in
 * answer to a click, which is when the game calls browse().
 */
export class FileReference extends EventDispatcher {
  declare data: ByteArray | null;
  declare name: string | null;
  declare size: number;
  declare $file: File | null;
  $ctor(): void { super.$ctor(); this.data = null; this.name = null; this.size = 0; this.$file = null; }
  browse(typeFilter: any[] = null): boolean {
    if (typeof document === "undefined") return false;
    const input = document.createElement("input");
    input.type = "file";
    const exts: string[] = [];
    for (const f of typeFilter ?? []) for (const e of String(f?.extension ?? "").split(";")) { const x = e.trim().replace(/^\*/, ""); if (x) exts.push(x); }
    if (exts.length) input.accept = exts.join(",");
    input.style.display = "none";
    let done = false;
    input.addEventListener("change", () => {
      done = true;
      const file = input.files && input.files[0];
      input.remove();
      if (!file) { this.dispatchEvent(new Event(Event.CANCEL)); return; }
      this.$file = file; this.name = file.name; this.size = file.size;
      this.dispatchEvent(new Event(Event.SELECT));
    });
    input.addEventListener("cancel", () => { if (!done) { input.remove(); this.dispatchEvent(new Event(Event.CANCEL)); } });
    document.body.appendChild(input);
    input.click();
    return true;
  }
  load(): void {
    const file = this.$file;
    if (!file) throw new Error("Error #2037: Functions called in incorrect sequence, or earlier call was unsuccessful.");
    file.arrayBuffer().then(
      (buf) => { this.data = ByteArray.$from(new Uint8Array(buf)); this.dispatchEvent(new Event(Event.COMPLETE)); },
      () => this.dispatchEvent(new IOErrorEvent(IOErrorEvent.IO_ERROR, false, false, "Error #2038: File I/O Error.", 2038)),
    );
  }
  save(data: any, defaultFileName: string = null): void {
    if (data == null) throw nullParam("data");
    const bytes = data instanceof ByteArray ? data.$toUint8Array() : new TextEncoder().encode(String(data));
    const url = URL.createObjectURL(new Blob([bytes]));
    const a = document.createElement("a");
    a.href = url;
    a.download = defaultFileName || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    this.dispatchEvent(new Event(Event.COMPLETE));
  }
  cancel(): void {}
}
flashClass(FileReference, "flash.net.FileReference");

/** A file picker's filter (FileReference.browse): its description and its extensions ("*.png;*.jpg"). */
export class FileFilter extends ASObject {
  declare description: string;
  declare extension: string;
  declare macType: string | null;
  $ctor(description: string = "", extension: string = "", macType: string = null): void {
    super.$ctor();
    this.description = description;
    this.extension = extension;
    this.macType = macType;
  }
}
flashClass(FileFilter, "flash.net.FileFilter");

export class LocalConnection extends EventDispatcher {
  declare client: any;
  $ctor(): void { super.$ctor(); this.client = this; }
  get domain(): string { return location.hostname || "localhost"; }
  connect(_name: string): void {}
  send(..._args: any[]): void {}
  close(): void {}
  allowDomain(..._d: string[]): void {}
  allowInsecureDomain(..._d: string[]): void {}
}
flashClass(LocalConnection, "flash.net.LocalConnection");
