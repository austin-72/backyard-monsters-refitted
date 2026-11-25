/**
 * Loads what the Flash build carried inside the SWF, before any game code runs:
 * embedded fonts and [Embed(source=...)] images and sounds. (AS3 static initialisers may
 * construct embedded BitmapData classes as soon as their module is evaluated.)
 *
 * The loader page (index.html) asks for the data files as soon as it knows the build, while the game's code is
 * still on the way (window.__BYMR_PREFETCH); the art comes in one file (art.bin, tools/build.ts) when the build
 * has it. Whatever of that fails is asked for again file by file, as before. The fonts, the library and the
 * embedded files load side by side: all of it is in before the game's code runs, as before.
 */
import { registerEmbeddedFonts } from "flash/text";
import { embeddedImages } from "../flash/display/BitmapData";
import { loadLibrary, packedBlob } from "../flash/display/library";
import { embeddedSounds } from "../flash/media/index";

/** Adds the build id so assets are fetched fresh after every release (see tools/build.ts). */
export function versioned(url: string): string {
  const v = (globalThis as any).__BYMR_VERSION;
  return v ? `${url}${url.includes("?") ? "&" : "?"}v=${v}` : url;
}

/** A file the loader page already asked for (once: a response is read once), else a new request. */
function prefetched(base: string, path: string): Promise<Response> {
  const pre = (globalThis as any).__BYMR_PREFETCH as Record<string, Promise<Response>> | undefined;
  const p = pre?.[path];
  if (pre && p) delete pre[path];
  const fresh = () => fetch(versioned(`${base}${path}`));
  return p ? p.catch(fresh) : fresh();
}

/** The files of art.bin by path ("swf/bitmaps/12.png", "embed/_assets/x.png"), or null without it. */
export type ArtPack = Map<string, Uint8Array>;

const STALL_MS = 20000;

/** (Inferno-only, QoL #239) A stage's share (0 to 1) for the loading page's percentage (index.html's __ioLoad). */
function ioLoad(stage: string, share: number): void {
  try { (globalThis as any).__ioLoad?.set?.(stage, share); } catch { /* no loader page (tests) */ }
}

/** Reads a response's body, giving up (null) when nothing arrives for STALL_MS. */
async function readAll(res: Response): Promise<Uint8Array | null> {
  if (!res.body) return new Uint8Array(await res.arrayBuffer());
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stalled = new Promise<"stalled">((r) => { timer = setTimeout(() => r("stalled"), STALL_MS); });
    const next = await Promise.race([reader.read(), stalled]);
    clearTimeout(timer);
    if (next === "stalled") { reader.cancel().catch(() => {}); return null; }
    if (next.done) break;
    chunks.push(next.value);
    total += next.value.length;
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

async function loadPack(base: string, name: string): Promise<ArtPack | null> {
  for (let tries = 1; tries <= 3; tries++) {
    try {
      const res = tries === 1 ? await prefetched(base, name) : await fetch(versioned(`${base}${name}`));
      if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
      const buf = await readAll(res);
      if (!buf) continue;
      const len = new DataView(buf.buffer, buf.byteOffset, 4).getUint32(0, true);
      const index = JSON.parse(new TextDecoder().decode(buf.subarray(4, 4 + len))) as Record<string, [number, number]>;
      const data = 4 + len;
      const pack: ArtPack = new Map();
      for (const [path, [off, n]] of Object.entries(index)) pack.set(path, buf.subarray(data + off, data + off + n));
      return pack;
    } catch (e) {
      if (tries === 3) break;
    }
  }
  return null; // (file by file, as without it)
}

export async function preloadLibrary(base: string): Promise<void> {
  const packName = (globalThis as any).__BYMR_PACK as string | undefined;
  const packing = packName ? loadPack(base, packName) : Promise.resolve(null);
  const [fonts, manifest] = await Promise.all([
    prefetched(base, "swf/fonts.json").then((r) => r.json()),
    prefetched(base, "embed/manifest.json").then((r) => r.json() as Promise<string[]>),
  ]);
  registerEmbeddedFonts(fonts);
  const pack = await packing;
  // (QoL #239: with the art in one file it is in now, and what is left is unpacking it; without, each file that
  // comes in is the art's share)
  if (pack) ioLoad("art", 1);
  const files = manifest.filter((src) => /\.(png|jpe?g|gif|mp3|wav)$/i.test(src)).length + 1;
  let filesDone = 0;
  const fileDone = () => { filesDone++; ioLoad(pack ? "lib" : "art", (filesDone / files) * (pack ? 0.95 : 1)); };
  await Promise.all([
    loadLibrary(base, versioned, pack, (path) => prefetched(base, path)).then(fileDone),
    Promise.all(manifest.filter((src) => /\.(png|jpe?g|gif)$/i.test(src)).map(async (src) => {
      const packed = pack?.get(`embed${src}`);
      const blob = packed ? packedBlob(packed, src) : await (await fetch(versioned(`${base}embed${src}`))).blob();
      embeddedImages.set(src, await createImageBitmap(blob));
      fileDone();
    })),
    Promise.all(manifest.filter((src) => /\.(mp3|wav)$/i.test(src)).map(async (src) => {
      const packed = pack?.get(`embed${src}`);
      if (packed) { embeddedSounds.set(src, packed.slice().buffer); fileDone(); return; }
      const r = await fetch(versioned(`${base}embed${src}`));
      if (r.ok) embeddedSounds.set(src, await r.arrayBuffer());
      fileDone();
    })),
  ]);
  ioLoad("art", 1);
  ioLoad("lib", 1);
}
