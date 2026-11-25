/**
 * flash.media on Web Audio. Flash limits playback to 32 simultaneous channels;
 * past that, Sound.play() returns null, and so does this implementation.
 */
import { ASObject } from "as3";
import { EventDispatcher, Event, IOErrorEvent, ProgressEvent } from "../events";
import { flashClass, unimplemented } from "../_internal";
import { runtimeHooks } from "../_runtime";
import { DisplayObject, touch, redrawHooks, type M6 } from "../display/core";
/** Videos with a stream: their picture changes unmarked, so they are compared at every drawing. */
const playingVideos = new Set<DisplayObject>();
redrawHooks.push(() => { for (const v of playingVideos) touch(v); });
import { Rectangle } from "../geom";

let ac: AudioContext | null = null;
let master: GainNode | null = null;
/** Volume set on the web page (settings panel), multiplied with SoundMixer.soundTransform.volume. */
let pageVolume = 1;
export function setPageVolume(v: number): void {
  pageVolume = Math.max(0, Math.min(1, v));
  if (master) master.gain.value = mixerTransform.volume * pageVolume;
}
/**
 * The page's audio. Older Safari (before 14.1: older iPhones and iPads) has it only as webkitAudioContext,
 * and "AudioContext" there was an uncaught error on the first sound (bug report #31). A browser with no
 * Web Audio at all gets null: the game runs silent.
 */
let noAudio = false;
function audio(): AudioContext | null {
  if (!ac && !noAudio) {
    const Ctor = (globalThis as any).AudioContext ?? (globalThis as any).webkitAudioContext;
    try {
      ac = Ctor ? (new Ctor() as AudioContext) : null;
    } catch {
      ac = null;
    }
    if (!ac) {
      noAudio = true;
      return null;
    }
    master = ac.createGain();
    master.connect(ac.destination);
    master.gain.value = mixerTransform.volume * pageVolume;
  }
  return ac;
}
/** decodeAudioData, also where it only takes callbacks (older Safari returns no promise). */
function decode(data: ArrayBuffer): Promise<AudioBuffer> {
  const ctx = audio();
  if (!ctx) return Promise.reject(new Error("no Web Audio"));
  return new Promise((resolve, reject) => {
    const p = ctx.decodeAudioData(data, resolve, reject) as Promise<AudioBuffer> | undefined;
    if (p && typeof p.then === "function") p.then(resolve, reject);
  });
}
/**
 * Browsers start audio suspended until a user gesture; the player calls this on input. iOS Safari can also
 * leave it "interrupted" (a call, another app, the screen locked), which input must resume as well.
 */
export function resumeAudio(): void {
  if (ac && ac.state !== "running" && ac.state !== "closed") (ac.resume() as Promise<void> | undefined)?.catch?.(() => {});
}

/** Files of [Embed(source=...)] Sound classes (sound_click1), loaded by the player before game code runs. */
export const embeddedSounds = new Map<string, ArrayBuffer>();
function embeddedSoundFor(ctor: any): ArrayBuffer | null {
  for (let c = ctor; c && c !== Sound; c = Object.getPrototypeOf(c)) {
    if (Object.prototype.hasOwnProperty.call(c, "$embed")) {
      const src = c.$embed?.source;
      return (src && embeddedSounds.get(src)) ?? null;
    }
  }
  return null;
}

export class SoundTransform extends ASObject {
  declare volume: number; declare pan: number;
  declare leftToLeft: number; declare leftToRight: number; declare rightToLeft: number; declare rightToRight: number;
  $ctor(vol: number = 1, panning: number = 0): void {
    super.$ctor();
    this.volume = vol; this.pan = panning;
    this.leftToLeft = 1; this.leftToRight = 0; this.rightToLeft = 0; this.rightToRight = 1;
  }
}
flashClass(SoundTransform, "flash.media.SoundTransform");
const mixerTransform = { volume: 1, pan: 0 };
const channels = new Set<SoundChannel>();
/** Inferno-only (QoL #615): how many sound channels play now (32 at most), so the game can keep some for music. */
export const ioChannelsPlaying = (): number => channels.size;
/** Inferno-only (QoL #625): whether the browser lets sound play yet (it holds it back until the first click or key). */
export const ioAudioRunning = (): boolean => !!ac && ac.state === "running";

export class SoundChannel extends EventDispatcher {
  declare $src: AudioBufferSourceNode | null; declare $gain: GainNode | null; declare $pan: StereoPannerNode | null;
  declare $t0: number; declare $offset: number; declare $dur: number; declare $done: boolean; declare $transform: SoundTransform;
  /** (Inferno-only, QoL #616) the sound's own level (Sound.ioLevel), under the volume the game sets; and whose channel it is (QoL #627) */
  declare $level: number; declare $sound: Sound | null;
  $ctor(): void {
    super.$ctor();
    this.$src = null; this.$gain = null; this.$pan = null; this.$t0 = 0; this.$offset = 0; this.$dur = 0; this.$done = false;
    this.$transform = new SoundTransform();
    this.$level = 1; this.$sound = null;
  }
  get position(): number {
    const ctx = audio();
    if (!this.$src || !ctx) return this.$offset;
    const elapsed = (ctx.currentTime - this.$t0) * 1000;
    return this.$dur > 0 ? this.$offset + (elapsed % this.$dur) : this.$offset + elapsed;
  }
  get soundTransform(): SoundTransform { const t = new SoundTransform(this.$transform.volume, this.$transform.pan); return t; }
  set soundTransform(t: SoundTransform) {
    if (!t) return;
    this.$transform = new SoundTransform(t.volume, t.pan);
    if (this.$gain) this.$gain.gain.value = t.volume * this.$level;
    if (this.$pan) this.$pan.pan.value = Math.max(-1, Math.min(1, t.pan));
  }
  get leftPeak(): number { return 0; }
  get rightPeak(): number { return 0; }
  stop(): void {
    this.$done = true;
    channels.delete(this);
    try { this.$src?.stop(); } catch { /* not started */ }
    this.$src = null;
  }
}
flashClass(SoundChannel, "flash.media.SoundChannel");

export class Sound extends EventDispatcher {
  declare $buffer: AudioBuffer | null; declare $waiting: (() => void)[]; declare $url: string | null;
  declare $loaded: number; declare $total: number; declare $failed: boolean; declare $pending: SoundChannel[];
  declare $level: number;
  $ctor(stream: any = null, context: any = null): void {
    super.$ctor();
    this.$buffer = null; this.$waiting = []; this.$url = null; this.$loaded = 0; this.$total = 0; this.$failed = false; this.$pending = [];
    this.$level = 1;
    if (stream) this.load(stream, context);
    else {
      // An embedded sound: in Flash its data is in the SWF, ready at once. Here it is decoded now; a play()
      // before that finishes starts when it has.
      const bytes = embeddedSoundFor(this.constructor);
      if (bytes) {
        this.$loaded = this.$total = bytes.byteLength;
        decode(bytes.slice(0))
          .then((buf) => runtimeHooks.defer(() => this.$ready(buf)))
          .catch(() => runtimeHooks.defer(() => this.$fail()));
      }
    }
  }
  $ready(buf: AudioBuffer): void {
    this.$buffer = buf;
    this.$pending = [];
    const w = this.$waiting; this.$waiting = [];
    w.forEach((f) => f());
  }
  /**
   * The sound can't be played. Channels waiting for it are given back: before, each play() of a sound
   * that never loaded kept one of the 32 channels forever, until every sound effect was silent.
   */
  $fail(): void {
    this.$failed = true;
    for (const ch of this.$pending) { ch.$done = true; channels.delete(ch); }
    this.$pending = []; this.$waiting = [];
  }
  load(stream: any, _context: any = null): void {
    const url = String(stream.url);
    this.$url = url;
    runtimeHooks.defer(() => this.dispatchEvent(new Event(Event.OPEN)));
    fetch(url).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.arrayBuffer(); })
      .then((data) => { this.$loaded = this.$total = data.byteLength; return decode(data); })
      .then((buf) => runtimeHooks.defer(() => {
        this.$buffer = buf;
        this.dispatchEvent(new ProgressEvent(ProgressEvent.PROGRESS, false, false, this.$loaded, this.$total));
        this.dispatchEvent(new Event(Event.COMPLETE));
        this.$ready(buf);
      }))
      .catch(() => runtimeHooks.defer(() => {
        this.$fail();
        // No Web Audio in this browser: loaded as far as the game can tell, and silent (not a stream error).
        if (noAudio) this.dispatchEvent(new Event(Event.COMPLETE));
        else this.dispatchEvent(new IOErrorEvent(IOErrorEvent.IO_ERROR, false, false, `Error #2032: Stream Error. URL: ${url}`, 2032));
      }));
  }
  get length(): number { return this.$buffer ? this.$buffer.duration * 1000 : 0; }
  get url(): string | null { return this.$url; }
  get bytesLoaded(): number { return this.$loaded; }
  get bytesTotal(): number { return this.$total; }
  get isBuffering(): boolean { return !this.$buffer && !this.$failed; }
  /**
   * Inferno-only (QoL #616): the file's own level, 0 to 1 (1: as recorded). Every channel of this sound plays at the
   * volume the game gives it times this, and reads back the game's volume (the game's fades are unchanged). The
   * game's SOUNDS sets it from a table measured on the files, so loud files don't drown the music.
   */
  get ioLevel(): number { return this.$level; }
  set ioLevel(v: number) { this.$level = Math.max(0, Math.min(1, Number(v) || 0)); }
  /** Inferno-only (QoL #627): how many channels of this sound play now (or wait for its file). */
  get ioPlaying(): number {
    let n = 0;
    for (const ch of channels) if (ch.$sound === this && !ch.$done) n++;
    return n;
  }
  get id3(): any { return {}; }
  close(): void {}
  extract(): number { unimplemented("Sound.extract"); return 0; }
  play(startTime: number = 0, loops: number = 0, sndTransform: SoundTransform = null): SoundChannel | null {
    if (channels.size >= 32) return null;
    const ch = new SoundChannel();
    // Nothing to play (failed to load, or neither a file nor embedded data): a silent channel that holds no slot.
    if (this.$failed || (!this.$buffer && !this.$url && !embeddedSoundFor(this.constructor))) { ch.$done = true; return ch; }
    channels.add(ch);
    ch.$sound = this; ch.$level = this.$level;
    if (sndTransform) ch.$transform = new SoundTransform(sndTransform.volume, sndTransform.pan);
    ch.$offset = startTime;
    const start = () => {
      const ctx = audio();
      if (ch.$done || !this.$buffer || !ctx) return;
      // (QoL #625: before the page's first click or key the browser holds the sound back; every effect asked for
      // meanwhile would play at once on the first tap, using up the channels. Effects then are left out; music,
      // which loops, waits for it.)
      if (ctx.state === "suspended" && (loops | 0) <= 1) {
        ch.$done = true;
        channels.delete(ch);
        return;
      }
      const src = ctx.createBufferSource();
      src.buffer = this.$buffer;
      const gain = ctx.createGain();
      gain.gain.value = ch.$transform.volume * ch.$level;
      // Older Safari has no stereo panner: no panning there.
      const pan = typeof ctx.createStereoPanner === "function" ? ctx.createStereoPanner() : null;
      src.connect(gain);
      if (pan) {
        pan.pan.value = Math.max(-1, Math.min(1, ch.$transform.pan));
        gain.connect(pan);
        pan.connect(master!);
      } else gain.connect(master!);
      const offset = Math.max(0, startTime / 1000);
      const plays = Math.max(1, loops | 0);
      const each = Math.max(0, this.$buffer.duration - offset);
      if (plays > 1) { src.loop = true; src.loopStart = offset; src.loopEnd = this.$buffer.duration; }
      src.onended = () => {
        if (ch.$done) return;
        ch.$done = true;
        channels.delete(ch);
        runtimeHooks.defer(() => ch.dispatchEvent(new Event(Event.SOUND_COMPLETE)));
      };
      ch.$src = src; ch.$gain = gain; ch.$pan = pan; ch.$t0 = ctx.currentTime; ch.$dur = each * 1000;
      src.start(0, offset);
      if (plays > 1) src.stop(ctx.currentTime + each * plays);
    };
    if (this.$buffer) start(); else { this.$waiting.push(start); this.$pending.push(ch); }
    return ch;
  }
}
flashClass(Sound, "flash.media.Sound");

export class SoundMixer {
  static get soundTransform(): SoundTransform { return new SoundTransform(mixerTransform.volume, mixerTransform.pan); }
  static set soundTransform(t: SoundTransform) {
    mixerTransform.volume = t?.volume ?? 1; mixerTransform.pan = t?.pan ?? 0;
    if (master) master.gain.value = mixerTransform.volume * pageVolume;
  }
  static stopAll(): void { for (const c of [...channels]) c.stop(); }
  static bufferTime = 1000;
  static areSoundsInaccessible(): boolean { return false; }
  static computeSpectrum(): void { unimplemented("SoundMixer.computeSpectrum"); }
}
flashClass(SoundMixer, "flash.media.SoundMixer");

export class SoundLoaderContext extends ASObject {
  declare bufferTime: number; declare checkPolicyFile: boolean;
  $ctor(bufferTime: number = 1000, checkPolicyFile: boolean = false): void { super.$ctor(); this.bufferTime = bufferTime; this.checkPolicyFile = checkPolicyFile; }
}
flashClass(SoundLoaderContext, "flash.media.SoundLoaderContext");

/** flash.media.Video: draws the current frame of an attached NetStream. */
export class Video extends DisplayObject {
  declare $vw: number; declare $vh: number; declare smoothing: boolean; declare deblocking: number; declare $stream: any;
  $ctor(width: number = 320, height: number = 240): void {
    super.$ctor();
    this.$vw = width; this.$vh = height; this.smoothing = false; this.deblocking = 0; this.$stream = null;
  }
  get videoWidth(): number { return this.$stream?.$video?.videoWidth ?? 0; }
  get videoHeight(): number { return this.$stream?.$video?.videoHeight ?? 0; }
  attachNetStream(ns: any): void { this.$stream = ns; if (ns) playingVideos.add(this); else playingVideos.delete(this); touch(this); }
  attachCamera(_c: any): void {}
  clear(): void { this.$stream = null; playingVideos.delete(this); touch(this); }
  /** changes every frame while playing (render caches compare it) */
  get $renderVersion(): number { return Math.round((this.$stream?.$video?.currentTime ?? 0) * 1000); }
  $selfBounds(): Rectangle { return new Rectangle(0, 0, this.$vw, this.$vh); }
  $hitSelf(lx: number, ly: number): boolean { return lx >= 0 && ly >= 0 && lx < this.$vw && ly < this.$vh; }
  $drawSelf(ctx: CanvasRenderingContext2D, m: M6, alpha: number): void {
    const v: HTMLVideoElement | undefined = this.$stream?.$video;
    if (!v || v.readyState < 2) return;
    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = this.smoothing;
    ctx.drawImage(v, 0, 0, this.$vw, this.$vh);
    ctx.globalAlpha = 1;
  }
}
flashClass(Video, "flash.media.Video");
