/**
 * Loads what the Flash build carried inside the SWF, before any game code runs:
 * embedded fonts and [Embed(source=...)] images and sounds. (AS3 static initialisers may
 * construct embedded BitmapData classes as soon as their module is evaluated.)
 */
import { registerEmbeddedFonts } from "flash/text";
import { embeddedImages } from "../flash/display/BitmapData";
import { loadLibrary } from "../flash/display/library";
import { embeddedSounds } from "../flash/media/index";

/** Adds the build id so assets are fetched fresh after every release (see tools/build.ts). */
export function versioned(url: string): string {
  const v = (globalThis as any).__BYMR_VERSION;
  return v ? `${url}${url.includes("?") ? "&" : "?"}v=${v}` : url;
}

export async function preloadLibrary(base: string): Promise<void> {
  const [fonts, manifest] = await Promise.all([
    fetch(versioned(`${base}swf/fonts.json`)).then((r) => r.json()),
    fetch(versioned(`${base}embed/manifest.json`)).then((r) => r.json() as Promise<string[]>),
  ]);
  registerEmbeddedFonts(fonts);
  await loadLibrary(base, versioned);
  await Promise.all(manifest.filter((src) => /\.(png|jpe?g|gif)$/i.test(src)).map(async (src) => {
    const blob = await (await fetch(versioned(`${base}embed${src}`))).blob();
    embeddedImages.set(src, await createImageBitmap(blob));
  }));
  await Promise.all(manifest.filter((src) => /\.(mp3|wav)$/i.test(src)).map(async (src) => {
    const r = await fetch(versioned(`${base}embed${src}`));
    if (r.ok) embeddedSounds.set(src, await r.arrayBuffer());
  }));
}
