/**
 * Inferno-only (21 October, the user's: 2000 monsters on screen at 60 frames a second): the yard drawn by the
 * graphics card (WebGL 2). The yard's renderer (game/com/monsters/rendering/Renderer) draws hundreds to thousands of
 * pictures a frame, one canvas call each; here each picture is a quad of a texture, and they go to the graphics card
 * many at a time (a batch holds up to 16 textures, a quad picking its own), in the same order, with the same blends.
 *
 * Pictures are the canvases of the game's bitmaps, uploaded once and again only when they change (their version);
 * a big one (the yard's ground, 4000 x 2000) in tiles, only the parts that changed sent again. Blends: normal, add,
 * multiply and screen by the card's own blending; the others (overlay: the lighting's shading of a building) read
 * what is drawn under them (copied from the frame, then blended in the shader, as the canvas's own blend does).
 *
 * All drawing goes through `GlYard`; the renderer decides what is drawn where. Lost or failed: `ok` false, and the
 * renderer draws with the canvas again.
 */

/** Blends, as the renderer's entries name them (Flash's BlendMode strings). */
export const GL_NORMAL = 0;
export const GL_ADD = 1;
export const GL_MULTIPLY = 2;
export const GL_SCREEN = 3;
/** Read what is under (a copy of the frame): overlay, hardlight, darken, lighten, difference, subtract. */
export const GL_READS = 4;
/**
 * (26 October) The darker of the two, colour by colour (the shadows' layer: layerBegin); not a BlendMode, the renderer's
 * own for its shadows.
 */
export const GL_MIN = 100;

const READ_MODES: Record<string, number> = { overlay: 1, hardlight: 2, darken: 3, lighten: 4, difference: 5, subtract: 6 };

/** The blend for a BlendMode string; -1: none the card can do (the renderer draws that frame with the canvas). */
export function glBlendOf(mode: string | null | undefined): number {
  if (!mode || mode === "normal" || mode === "layer") return GL_NORMAL;
  if (mode === "add") return GL_ADD;
  if (mode === "multiply") return GL_MULTIPLY;
  if (mode === "screen") return GL_SCREEN;
  if (READ_MODES[mode]) return GL_READS + READ_MODES[mode];
  return -1;
}

/** A picture to draw from: its canvas (or image), size, and version (a new version is uploaded again). */
export interface GlSource {
  /** What identifies it (a BitmapData, a canvas). */
  key: object;
  image: TexImageSource;
  w: number;
  h: number;
  ver: number;
  /** The rectangles changed since version v ([x0, y0, x1, y1] each), or null (all of it); big pictures only. */
  dirtySince?: (v: number) => number[][] | null;
  /** The pixels of a rectangle of it (a big picture's changed part, or a tile). */
  pixels?: (x: number, y: number, w: number, h: number) => ImageData;
  /** (kept by GlYard: its texture, found again without a lookup) */
  tex?: any;
}

const TILE = 2048;
const MAX_UNITS = 16;
/**
 * Floats a vertex: x, y, u, v, alpha, texture unit, and the part of the texture it may be read from (u0, v0, u1, v1:
 * 21 October, half a texel in from the part's edges).
 */
const VF = 10;
const MAX_QUADS = 8192;

interface Tile {
  tex: WebGLTexture;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Tex {
  tiles: Tile[];
  w: number;
  h: number;
  ver: number;
  used: number;
  bytes: number;
  gen: number;
}

const VS = `#version 300 es
in vec2 aPos; in vec2 aUv; in float aAlpha; in float aUnit; in vec4 aClamp;
uniform vec2 uSize;
out vec2 vUv; out float vAlpha; flat out int vUnit; flat out vec4 vClamp;
void main() {
  vUv = aUv; vAlpha = aAlpha; vUnit = int(aUnit + 0.5); vClamp = aClamp;
  gl_Position = vec4(aPos.x / uSize.x * 2.0 - 1.0, 1.0 - aPos.y / uSize.y * 2.0, 0.0, 1.0);
}`;

// (22 October: highp in the pictures' shaders: a phone's mediump is 16 bits, too coarse for a place in a 2048-wide sheet
// (half a pixel lost: the next frame's edge showing, a pixel's wobble zoomed in); WebGL 2 always has highp here)
function fsBatch(units: number): string {
  let pick = "";
  // (26 October: textureLod, level 0 (the textures have no smaller levels): texture() in a branch that differs from one
  // pixel to the next (each quad picks its own unit) has no defined slopes to choose a level by, and some cards' drivers
  // then read black or nothing: the yard black, monsters from other sheets in the same batch flashing in and out)
  for (let i = 0; i < units; i++) pick += `${i ? "else " : ""}if (vUnit == ${i}) c = textureLod(uTex[${i}], uv, 0.0);\n`;
  return `#version 300 es
precision highp float;
uniform sampler2D uTex[${units}];
in vec2 vUv; in float vAlpha; flat in int vUnit; flat in vec4 vClamp;
out vec4 o;
void main() { vec4 c = vec4(0.0);
  vec2 uv = clamp(vUv, vClamp.xy, vClamp.zw);
${pick}  o = c * vAlpha; }`;
}

// (one picture over a copy of what is under it, blended as the canvas blends: premultiplied in, opaque under)
const FS_READ = `#version 300 es
precision highp float;
uniform sampler2D uSrc; uniform sampler2D uDst; uniform int uMode; uniform vec4 uDstRect; uniform vec2 uSize;
in vec2 vUv; in float vAlpha; flat in int vUnit; flat in vec4 vClamp;
out vec4 o;
float ov(float b, float s) { return b <= 0.5 ? 2.0 * s * b : 1.0 - 2.0 * (1.0 - s) * (1.0 - b); }
float hl(float b, float s) { return s <= 0.5 ? 2.0 * s * b : 1.0 - 2.0 * (1.0 - s) * (1.0 - b); }
void main() {
  vec4 s = textureLod(uSrc, clamp(vUv, vClamp.xy, vClamp.zw), 0.0) * vAlpha;
  vec2 p = vec2(gl_FragCoord.x - uDstRect.x, gl_FragCoord.y - uDstRect.y) / uDstRect.zw;
  vec3 b = textureLod(uDst, p, 0.0).rgb;
  vec3 cs = s.a > 0.0 ? s.rgb / s.a : vec3(0.0);
  vec3 m;
  if (uMode == 1) m = vec3(ov(b.r, cs.r), ov(b.g, cs.g), ov(b.b, cs.b));
  else if (uMode == 2) m = vec3(hl(b.r, cs.r), hl(b.g, cs.g), hl(b.b, cs.b));
  else if (uMode == 3) m = min(b, cs);
  else if (uMode == 4) m = max(b, cs);
  else if (uMode == 5) m = abs(b - cs);
  else m = max(b - cs, 0.0);
  o = vec4(mix(b, m, s.a), 1.0);
}`;

/**
 * (26 October, the user's: "some players have an issue with the GPU rendering turned on where the screen is black") A
 * card whose frames came out black is remembered in this browser, by its name: not used again here (the canvas draws
 * the yard), and the game's canvas made without the see-through layer the card's yard needs (Player glDirectWanted).
 */
const GL_BLACK_KEY = "bymr-gl-black";

export function glRememberedBlack(renderer?: string): boolean {
  try {
    const v = JSON.parse(localStorage.getItem(GL_BLACK_KEY) || "null");
    return !!v && (renderer === undefined || v.card === renderer);
  } catch {
    return false;
  }
}

export function glRememberBlack(renderer: string): void {
  try {
    localStorage.setItem(GL_BLACK_KEY, JSON.stringify({ card: renderer, at: Date.now() }));
  } catch {
    // (no storage: the canvas this session only)
  }
}

export class GlYard {
  readonly canvas: HTMLCanvasElement;
  ok = true;
  /**
   * Drawn by the processor, not a graphics card (SwiftShader, llvmpipe, Microsoft's Basic Render Driver: a computer
   * without a working card, or one the browser won't use): slower than the canvas, so not used unless asked.
   */
  software = false;
  /** The card's name, as the browser gives it. */
  renderer = "";
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private readProg: WebGLProgram;
  private units: number;
  private vbo: WebGLBuffer;
  private ibo: WebGLBuffer;
  private vao: WebGLVertexArrayObject;
  private verts = new Float32Array(MAX_QUADS * 4 * VF);
  private nQuads = 0;
  private bound: (WebGLTexture | null)[] = [];
  private blend = -1;
  private texs = new WeakMap<object, Tex>();
  /** Counted up by dispose: textures kept on sources from before are not used. */
  private gen = 1;
  private live = new Set<Tex>();
  private frame = 0;
  private w = 0;
  private h = 0;
  private dstTex: WebGLTexture | null = null;
  private dstW = 0;
  private dstH = 0;
  private uSize: WebGLUniformLocation | null;
  private rLoc: Record<string, WebGLUniformLocation | null> = {};
  /** For tests and the frame meter: this frame's quads, draw calls, uploads and the textures' bytes. */
  readonly stats = { quads: 0, draws: 0, uploads: 0, uploadBytes: 0, bytes: 0, reads: 0, frames: 0 };

  static create(): GlYard | null {
    try {
      const c = document.createElement("canvas");
      c.width = 2;
      c.height = 2;
      const gl = c.getContext("webgl2", { alpha: false, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: true, depth: false, stencil: false }) as WebGL2RenderingContext | null;
      if (!gl) return null;
      const y = new GlYard(c, gl);
      return y.ok ? y : null;
    } catch {
      return null;
    }
  }

  private constructor(c: HTMLCanvasElement, gl: WebGL2RenderingContext) {
    this.canvas = c;
    this.gl = gl;
    c.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.ok = false;
    });
    try {
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      this.renderer = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    } catch {
      this.renderer = "";
    }
    this.software = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i.test(this.renderer);
    this.units = Math.max(1, Math.min(MAX_UNITS, gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) | 0));
    this.prog = this.program(VS, fsBatch(this.units));
    this.readProg = this.program(VS, FS_READ);
    gl.useProgram(this.prog);
    const loc = gl.getUniformLocation(this.prog, "uTex");
    gl.uniform1iv(loc, Array.from({ length: this.units }, (_, i) => i));
    this.uSize = gl.getUniformLocation(this.prog, "uSize");
    for (const n of ["uSrc", "uDst", "uMode", "uDstRect", "uSize"]) this.rLoc[n] = gl.getUniformLocation(this.readProg, n);
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    this.vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.verts.byteLength, gl.DYNAMIC_DRAW);
    // (16-bit indices reach 65,536 vertices: 16,384 quads; MAX_QUADS is half that)
    const idx = new Uint16Array(MAX_QUADS * 6);
    for (let q = 0; q < MAX_QUADS; q++) {
      const v = q * 4, i = q * 6;
      idx[i] = v; idx[i + 1] = v + 1; idx[i + 2] = v + 2; idx[i + 3] = v; idx[i + 4] = v + 2; idx[i + 5] = v + 3;
    }
    this.ibo = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    for (const p of [this.prog, this.readProg]) {
      const stride = VF * 4;
      const at = (name: string, n: number, off: number) => {
        const l = gl.getAttribLocation(p, name);
        if (l < 0) return;
        gl.enableVertexAttribArray(l);
        gl.vertexAttribPointer(l, n, gl.FLOAT, false, stride, off * 4);
      };
      at("aPos", 2, 0);
      at("aUv", 2, 2);
      at("aAlpha", 1, 4);
      at("aUnit", 1, 5);
      at("aClamp", 4, 6);
    }
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    if (gl.getError() !== gl.NO_ERROR) this.ok = false;
  }

  private program(vs: string, fs: string): WebGLProgram {
    const gl = this.gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        this.ok = false;
        throw new Error("GlYard shader: " + gl.getShaderInfoLog(s));
      }
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    // (the same attribute places in both programs: one vertex array for both)
    gl.bindAttribLocation(p, 0, "aPos");
    gl.bindAttribLocation(p, 1, "aUv");
    gl.bindAttribLocation(p, 2, "aAlpha");
    gl.bindAttribLocation(p, 3, "aUnit");
    gl.bindAttribLocation(p, 4, "aClamp");
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      this.ok = false;
      throw new Error("GlYard program: " + gl.getProgramInfoLog(p));
    }
    return p;
  }

  /** A frame of w x h pixels begins: the canvas that size, cleared to black (the yard is opaque). */
  begin(w: number, h: number): void {
    const gl = this.gl;
    w = Math.max(1, w | 0);
    h = Math.max(1, h | 0);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.w = w;
    this.h = h;
    this.frame++;
    const st = this.stats;
    st.quads = st.draws = st.uploads = st.uploadBytes = st.reads = 0;
    st.frames++;
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.prog);
    gl.uniform2f(this.uSize, w, h);
    gl.bindVertexArray(this.vao);
    this.nQuads = 0;
    this.bound.length = 0;
    this.blend = -1;
  }

  /**
   * The part sx, sy, sw, sh of a picture, its corners put by the matrix (a, b, c, d, tx, ty: picture pixels to frame
   * pixels), at alpha (0 to 1), with a blend (glBlendOf).
   */
  draw(src: GlSource, sx: number, sy: number, sw: number, sh: number, a: number, b: number, c: number, d: number, tx: number, ty: number, alpha: number, blend: number): void {
    if (sw <= 0 || sh <= 0 || alpha <= 0) return;
    const t = this.texOf(src);
    if (!t) return;
    if (blend >= GL_READS && blend < GL_MIN) {
      this.drawReading(t, sx, sy, sw, sh, a, b, c, d, tx, ty, alpha, blend - GL_READS);
      return;
    }
    if (blend !== this.blend) {
      this.flush();
      this.setBlend(blend);
    }
    if (t.tiles.length === 1) {
      this.quad(t.tiles[0], sx, sy, sw, sh, a, b, c, d, tx, ty, alpha);
      return;
    }
    // (a big picture: each tile's part of the rectangle)
    for (const tl of t.tiles) {
      const x0 = Math.max(sx, tl.x), y0 = Math.max(sy, tl.y), x1 = Math.min(sx + sw, tl.x + tl.w), y1 = Math.min(sy + sh, tl.y + tl.h);
      if (x1 <= x0 || y1 <= y0) continue;
      // (the matrix from this part's own corner)
      const ox = x0 - sx, oy = y0 - sy;
      this.quad(tl, x0, y0, x1 - x0, y1 - y0, a, b, c, d, tx + a * ox + c * oy, ty + b * ox + d * oy, alpha);
    }
  }

  /** The frame is done: everything still waiting drawn; textures unused for a while let go. */
  end(): void {
    this.flush();
    if ((this.frame & 255) === 0) this.sweep();
    let bytes = 0;
    for (const t of this.live) bytes += t.bytes;
    this.stats.bytes = bytes;
    if (this.gl.isContextLost()) this.ok = false;
  }

  /**
   * (26 October) Whether the frame just drawn is black at nine places across it: the card drew nothing of what it was
   * given (the yard's ground is never black). Read back from the card: only for a few first frames.
   */
  blackFrame(): boolean {
    const gl = this.gl;
    const px = new Uint8Array(4);
    try {
      for (const fx of [0.2, 0.5, 0.8]) {
        for (const fy of [0.2, 0.5, 0.8]) {
          gl.readPixels(Math.min(this.w - 1, Math.floor(this.w * fx)), Math.min(this.h - 1, Math.floor(this.h * fy)), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          if (px[0] | px[1] | px[2]) return false;
        }
      }
    } catch {
      return false;
    }
    return true;
  }

  // (26 October) The shadows' layer: the frame's size, white; drawn into with GL_MIN, then laid over the frame ("multiply")
  private layerFbo: WebGLFramebuffer | null = null;
  private layerTex: WebGLTexture | null = null;
  private layerW = 0;
  private layerH = 0;
  private inLayer = false;

  /** What is drawn from now until layerEnd goes into the layer (white to begin with), not the frame. */
  layerBegin(): void {
    const gl = this.gl;
    this.flush();
    if (!this.layerFbo || !this.layerTex || this.layerW !== this.w || this.layerH !== this.h) {
      if (this.layerTex) gl.deleteTexture(this.layerTex);
      if (!this.layerFbo) this.layerFbo = gl.createFramebuffer();
      this.layerTex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.layerTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.w, this.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      this.params();
      // (not left bound where a picture is read while the layer is drawn into)
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.layerFbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.layerTex, 0);
      this.layerW = this.w;
      this.layerH = this.h;
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.layerFbo);
    }
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.inLayer = true;
  }

  /** The layer laid over the frame, multiplying it; drawing goes to the frame again. */
  layerEnd(): void {
    if (!this.inLayer) return;
    const gl = this.gl;
    this.flush();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.inLayer = false;
    if (!this.layerTex) return;
    this.setBlend(GL_MULTIPLY);
    // (its rows go up from the bottom: drawn upside down, so the right way up)
    this.quad({ tex: this.layerTex, x: 0, y: 0, w: this.layerW, h: this.layerH }, 0, 0, this.w, this.h, 1, 0, 0, -1, 0, this.h, 1);
    this.flush();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /** Everything let go (the yard gone). */
  dispose(): void {
    const gl = this.gl;
    if (this.inLayer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      this.inLayer = false;
    }
    if (this.layerTex) gl.deleteTexture(this.layerTex);
    if (this.layerFbo) gl.deleteFramebuffer(this.layerFbo);
    this.layerTex = null;
    this.layerFbo = null;
    this.layerW = this.layerH = 0;
    for (const t of this.live) for (const tl of t.tiles) gl.deleteTexture(tl.tex);
    this.live.clear();
    this.texs = new WeakMap();
    this.gen++;
    if (this.dstTex) gl.deleteTexture(this.dstTex);
    this.dstTex = null;
  }

  // ---- inside

  private setBlend(blend: number): void {
    const gl = this.gl;
    this.blend = blend;
    if (blend === GL_MIN) {
      gl.blendEquation(gl.MIN);
      return;
    }
    gl.blendEquation(gl.FUNC_ADD);
    if (blend === GL_ADD) gl.blendFunc(gl.ONE, gl.ONE);
    else if (blend === GL_MULTIPLY) gl.blendFunc(gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA);
    else if (blend === GL_SCREEN) gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
    else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  private quad(tl: Tile, sx: number, sy: number, sw: number, sh: number, a: number, b: number, c: number, d: number, tx: number, ty: number, alpha: number): void {
    let unit = this.bound.indexOf(tl.tex);
    if (unit < 0) {
      if (this.bound.length >= this.units) this.flush();
      unit = this.bound.length;
      this.bound.push(tl.tex);
    }
    if (this.nQuads >= MAX_QUADS) {
      this.flush();
      unit = 0;
      this.bound.push(tl.tex);
    }
    const u0 = (sx - tl.x) / tl.w, v0 = (sy - tl.y) / tl.h, u1 = (sx - tl.x + sw) / tl.w, v1 = (sy - tl.y + sh) / tl.h;
    // (21 October, the user's: "sometimes there is a stray pixel or stray line of pixels" round animations: a monster's
    // frame is drawn straight from its sprite sheet, and the card's smoothing, at any size but the picture's own, read
    // a little of the next frame over at the edges. Read only inside the part, half a texel in, as the canvas does)
    const hu = 0.5 / tl.w, hv = 0.5 / tl.h;
    const cu0 = sw > 1 ? u0 + hu : (u0 + u1) / 2, cu1 = sw > 1 ? u1 - hu : (u0 + u1) / 2;
    const cv0 = sh > 1 ? v0 + hv : (v0 + v1) / 2, cv1 = sh > 1 ? v1 - hv : (v0 + v1) / 2;
    const V = this.verts;
    let o = this.nQuads * 4 * VF;
    // (the corners: (0,0) (sw,0) (sw,sh) (0,sh) of the part, through the matrix)
    V[o++] = tx; V[o++] = ty; V[o++] = u0; V[o++] = v0; V[o++] = alpha; V[o++] = unit; V[o++] = cu0; V[o++] = cv0; V[o++] = cu1; V[o++] = cv1;
    V[o++] = tx + a * sw; V[o++] = ty + b * sw; V[o++] = u1; V[o++] = v0; V[o++] = alpha; V[o++] = unit; V[o++] = cu0; V[o++] = cv0; V[o++] = cu1; V[o++] = cv1;
    V[o++] = tx + a * sw + c * sh; V[o++] = ty + b * sw + d * sh; V[o++] = u1; V[o++] = v1; V[o++] = alpha; V[o++] = unit; V[o++] = cu0; V[o++] = cv0; V[o++] = cu1; V[o++] = cv1;
    V[o++] = tx + c * sh; V[o++] = ty + d * sh; V[o++] = u0; V[o++] = v1; V[o++] = alpha; V[o++] = unit; V[o++] = cu0; V[o++] = cv0; V[o++] = cu1; V[o++] = cv1;
    this.nQuads++;
    this.stats.quads++;
  }

  private flush(): void {
    if (!this.nQuads) {
      this.bound.length = 0;
      return;
    }
    const gl = this.gl;
    for (let i = 0; i < this.bound.length; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, this.bound[i]);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.verts, 0, this.nQuads * 4 * VF);
    gl.drawElements(gl.TRIANGLES, this.nQuads * 6, gl.UNSIGNED_SHORT, 0);
    this.stats.draws++;
    this.nQuads = 0;
    this.bound.length = 0;
  }

  /** One picture blended with what is under it: that part of the frame copied, then drawn over in the shader. */
  private drawReading(t: Tex, sx: number, sy: number, sw: number, sh: number, a: number, b: number, c: number, d: number, tx: number, ty: number, alpha: number, mode: number): void {
    if (t.tiles.length !== 1) return;
    const gl = this.gl;
    this.flush();
    // (its box in frame pixels; the frame's rows go up from the bottom)
    const xs = [tx, tx + a * sw, tx + a * sw + c * sh, tx + c * sh], ys = [ty, ty + b * sw, ty + b * sw + d * sh, ty + d * sh];
    const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(this.w, Math.ceil(Math.max(...xs)));
    const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(this.h, Math.ceil(Math.max(...ys)));
    if (x1 <= x0 || y1 <= y0) return;
    const bw = x1 - x0, bh = y1 - y0, by = this.h - y1;
    if (!this.dstTex || this.dstW < bw || this.dstH < bh) {
      if (this.dstTex) gl.deleteTexture(this.dstTex);
      this.dstW = Math.max(this.dstW, bw, 256);
      this.dstH = Math.max(this.dstH, bh, 256);
      this.dstTex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + 1);
      gl.bindTexture(gl.TEXTURE_2D, this.dstTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.dstW, this.dstH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      this.params();
    }
    gl.activeTexture(gl.TEXTURE0 + 1);
    gl.bindTexture(gl.TEXTURE_2D, this.dstTex);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, x0, by, bw, bh);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, t.tiles[0].tex);
    gl.useProgram(this.readProg);
    gl.uniform1i(this.rLoc.uSrc, 0);
    gl.uniform1i(this.rLoc.uDst, 1);
    gl.uniform1i(this.rLoc.uMode, mode);
    // (where the copy's corner is in frame pixels, and the copy texture's size: a frame pixel to its texel)
    gl.uniform4f(this.rLoc.uDstRect, x0, by, this.dstW, this.dstH);
    gl.uniform2f(this.rLoc.uSize, this.w, this.h);
    gl.disable(gl.BLEND);
    this.bound.length = 0;
    this.bound.push(t.tiles[0].tex);
    this.quad(t.tiles[0], sx, sy, sw, sh, a, b, c, d, tx, ty, alpha);
    const n = this.nQuads;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.verts, 0, n * 4 * VF);
    gl.drawElements(gl.TRIANGLES, n * 6, gl.UNSIGNED_SHORT, 0);
    this.nQuads = 0;
    this.bound.length = 0;
    this.stats.draws++;
    this.stats.reads++;
    gl.enable(gl.BLEND);
    gl.useProgram(this.prog);
    this.blend = -1;
  }

  private params(): void {
    const gl = this.gl;
    // (21 October, the user's: "Zooming in adds a blur currently (smoothing) - remove the blur": drawn larger than its
    // pixels, a picture's pixels are kept sharp, as the yard's canvas shows them zoomed in; drawn smaller, smoothed)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  /** The picture's texture, uploaded (again, or only its changed parts) if it changed. */
  private texOf(src: GlSource): Tex | null {
    const gl = this.gl;
    // (its texture kept on it (made by this card, since the last dispose), else looked up)
    let t: Tex | undefined = src.tex;
    if (!t || t.gen !== this.gen) t = this.texs.get(src.key);
    if (t && (t.w !== src.w || t.h !== src.h)) {
      for (const tl of t.tiles) gl.deleteTexture(tl.tex);
      this.live.delete(t);
      t = undefined;
    }
    if (!t) {
      t = { tiles: [], w: src.w, h: src.h, ver: NaN, used: 0, bytes: src.w * src.h * 4, gen: this.gen };
      for (let y = 0; y < src.h; y += TILE) {
        for (let x = 0; x < src.w; x += TILE) {
          const tex = gl.createTexture();
          if (!tex) return null;
          t.tiles.push({ tex, x, y, w: Math.min(TILE, src.w - x), h: Math.min(TILE, src.h - y) });
        }
      }
      this.texs.set(src.key, t);
      this.live.add(t);
    }
    src.tex = t;
    t.used = this.frame;
    if (t.ver !== src.ver) {
      this.flush();
      this.upload(t, src);
      t.ver = src.ver;
    }
    return t;
  }

  private upload(t: Tex, src: GlSource): void {
    const gl = this.gl;
    const st = this.stats;
    gl.activeTexture(gl.TEXTURE0);
    if (t.tiles.length === 1 && t.tiles[0].w === src.w && t.tiles[0].h === src.h) {
      const tl = t.tiles[0];
      gl.bindTexture(gl.TEXTURE_2D, tl.tex);
      const fresh = t.ver !== t.ver;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src.image);
      if (fresh) this.params();
      st.uploads++;
      st.uploadBytes += src.w * src.h * 4;
      return;
    }
    // (a big picture: what changed since, else every tile)
    const fresh = t.ver !== t.ver;
    const rects = !fresh && src.dirtySince ? src.dirtySince(t.ver) : null;
    for (const tl of t.tiles) {
      gl.bindTexture(gl.TEXTURE_2D, tl.tex);
      if (fresh || !rects) {
        const px = src.pixels ? src.pixels(tl.x, tl.y, tl.w, tl.h) : null;
        if (!px) continue;
        if (fresh) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, px);
          this.params();
        } else {
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
        }
        st.uploads++;
        st.uploadBytes += tl.w * tl.h * 4;
        continue;
      }
      for (const r of rects) {
        const x0 = Math.max(tl.x, r[0] | 0), y0 = Math.max(tl.y, r[1] | 0), x1 = Math.min(tl.x + tl.w, Math.ceil(r[2])), y1 = Math.min(tl.y + tl.h, Math.ceil(r[3]));
        if (x1 <= x0 || y1 <= y0 || !src.pixels) continue;
        const px = src.pixels(x0, y0, x1 - x0, y1 - y0);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, x0 - tl.x, y0 - tl.y, gl.RGBA, gl.UNSIGNED_BYTE, px);
        st.uploads++;
        st.uploadBytes += (x1 - x0) * (y1 - y0) * 4;
      }
    }
  }

  /** Textures not drawn for a while (about 10 s) let go. */
  private sweep(): void {
    const gl = this.gl;
    for (const t of [...this.live]) {
      if (this.frame - t.used > 600) {
        for (const tl of t.tiles) gl.deleteTexture(tl.tex);
        this.live.delete(t);
        t.ver = NaN;
        t.tiles = [];
        // (its entry in the WeakMap stays, emptied, its size unlike any picture's: made again if drawn again)
        t.w = -1;
      }
    }
  }
}
