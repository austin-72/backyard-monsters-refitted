/** flash.geom value types, with Flash's semantics for empty rectangles and matrix math. */
import { ASObject } from "as3";
import { flashClass } from "../_internal";

export class Point extends ASObject {
  declare x: number;
  declare y: number;
  $ctor(x: number = 0, y: number = 0): void { super.$ctor(); this.x = +x; this.y = +y; }
  get length(): number { return Math.sqrt(this.x * this.x + this.y * this.y); }
  add(v: Point): Point { return new Point(this.x + v.x, this.y + v.y); }
  subtract(v: Point): Point { return new Point(this.x - v.x, this.y - v.y); }
  clone(): Point { return new Point(this.x, this.y); }
  equals(p: Point): boolean { return p.x === this.x && p.y === this.y; }
  normalize(thickness: number): void {
    const l = this.length;
    if (l > 0) { const f = thickness / l; this.x *= f; this.y *= f; }
  }
  offset(dx: number, dy: number): void { this.x += dx; this.y += dy; }
  copyFrom(p: Point): void { this.x = p.x; this.y = p.y; }
  setTo(x: number, y: number): void { this.x = x; this.y = y; }
  toString(): string { return `(x=${this.x}, y=${this.y})`; }
  static distance(a: Point, b: Point): number { const dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  static interpolate(a: Point, b: Point, f: number): Point { return new Point(b.x + (a.x - b.x) * f, b.y + (a.y - b.y) * f); }
  static polar(len: number, angle: number): Point { return new Point(len * Math.cos(angle), len * Math.sin(angle)); }
}
flashClass(Point, "flash.geom.Point");

export class Rectangle extends ASObject {
  declare x: number;
  declare y: number;
  declare width: number;
  declare height: number;
  $ctor(x: number = 0, y: number = 0, width: number = 0, height: number = 0): void {
    super.$ctor();
    this.x = +x; this.y = +y; this.width = +width; this.height = +height;
  }
  get left(): number { return this.x; }
  set left(v: number) { this.width += this.x - v; this.x = v; }
  get right(): number { return this.x + this.width; }
  set right(v: number) { this.width = v - this.x; }
  get top(): number { return this.y; }
  set top(v: number) { this.height += this.y - v; this.y = v; }
  get bottom(): number { return this.y + this.height; }
  set bottom(v: number) { this.height = v - this.y; }
  get topLeft(): Point { return new Point(this.x, this.y); }
  set topLeft(p: Point) { this.left = p.x; this.top = p.y; }
  get bottomRight(): Point { return new Point(this.right, this.bottom); }
  set bottomRight(p: Point) { this.right = p.x; this.bottom = p.y; }
  get size(): Point { return new Point(this.width, this.height); }
  set size(p: Point) { this.width = p.x; this.height = p.y; }
  clone(): Rectangle { return new Rectangle(this.x, this.y, this.width, this.height); }
  isEmpty(): boolean { return !(this.width > 0 && this.height > 0); }
  setEmpty(): void { this.x = this.y = this.width = this.height = 0; }
  contains(x: number, y: number): boolean { return x >= this.x && x < this.x + this.width && y >= this.y && y < this.y + this.height; }
  containsPoint(p: Point): boolean { return this.contains(p.x, p.y); }
  containsRect(r: Rectangle): boolean {
    if (r.isEmpty()) return false;
    return r.x >= this.x && r.y >= this.y && r.right <= this.right && r.bottom <= this.bottom;
  }
  equals(r: Rectangle): boolean { return r.x === this.x && r.y === this.y && r.width === this.width && r.height === this.height; }
  inflate(dx: number, dy: number): void { this.x -= dx; this.width += 2 * dx; this.y -= dy; this.height += 2 * dy; }
  inflatePoint(p: Point): void { this.inflate(p.x, p.y); }
  offset(dx: number, dy: number): void { this.x += dx; this.y += dy; }
  offsetPoint(p: Point): void { this.offset(p.x, p.y); }
  intersection(r: Rectangle): Rectangle {
    if (this.isEmpty() || r.isEmpty()) return new Rectangle();
    const x = Math.max(this.x, r.x), y = Math.max(this.y, r.y);
    const w = Math.min(this.right, r.right) - x, h = Math.min(this.bottom, r.bottom) - y;
    return w > 0 && h > 0 ? new Rectangle(x, y, w, h) : new Rectangle();
  }
  intersects(r: Rectangle): boolean { return !this.intersection(r).isEmpty(); }
  union(r: Rectangle): Rectangle {
    if (this.isEmpty()) return r.clone();
    if (r.isEmpty()) return this.clone();
    const x = Math.min(this.x, r.x), y = Math.min(this.y, r.y);
    return new Rectangle(x, y, Math.max(this.right, r.right) - x, Math.max(this.bottom, r.bottom) - y);
  }
  copyFrom(r: Rectangle): void { this.x = r.x; this.y = r.y; this.width = r.width; this.height = r.height; }
  setTo(x: number, y: number, w: number, h: number): void { this.x = x; this.y = y; this.width = w; this.height = h; }
  toString(): string { return `(x=${this.x}, y=${this.y}, w=${this.width}, h=${this.height})`; }
}
flashClass(Rectangle, "flash.geom.Rectangle");

export class Matrix extends ASObject {
  declare a: number; declare b: number; declare c: number; declare d: number; declare tx: number; declare ty: number;
  $ctor(a: number = 1, b: number = 0, c: number = 0, d: number = 1, tx: number = 0, ty: number = 0): void {
    super.$ctor();
    this.a = +a; this.b = +b; this.c = +c; this.d = +d; this.tx = +tx; this.ty = +ty;
  }
  clone(): Matrix { return new Matrix(this.a, this.b, this.c, this.d, this.tx, this.ty); }
  concat(m: Matrix): void {
    const { a, b, c, d, tx, ty } = this;
    this.a = a * m.a + b * m.c;
    this.b = a * m.b + b * m.d;
    this.c = c * m.a + d * m.c;
    this.d = c * m.b + d * m.d;
    this.tx = tx * m.a + ty * m.c + m.tx;
    this.ty = tx * m.b + ty * m.d + m.ty;
  }
  identity(): void { this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.tx = 0; this.ty = 0; }
  invert(): void {
    const { a, b, c, d, tx, ty } = this;
    const det = a * d - b * c;
    if (det === 0) { this.a = this.b = this.c = this.d = 0; this.tx = -tx; this.ty = -ty; return; }
    this.a = d / det; this.b = -b / det; this.c = -c / det; this.d = a / det;
    this.tx = (c * ty - d * tx) / det;
    this.ty = (b * tx - a * ty) / det;
  }
  rotate(angle: number): void {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const { a, b, c, d, tx, ty } = this;
    this.a = a * cos - b * sin; this.b = a * sin + b * cos;
    this.c = c * cos - d * sin; this.d = c * sin + d * cos;
    this.tx = tx * cos - ty * sin; this.ty = tx * sin + ty * cos;
  }
  scale(sx: number, sy: number): void {
    this.a *= sx; this.b *= sy; this.c *= sx; this.d *= sy; this.tx *= sx; this.ty *= sy;
  }
  translate(dx: number, dy: number): void { this.tx += dx; this.ty += dy; }
  createBox(sx: number, sy: number, rotation: number = 0, tx: number = 0, ty: number = 0): void {
    const cos = Math.cos(rotation), sin = Math.sin(rotation);
    this.a = cos * sx; this.b = sin * sy; this.c = -sin * sx; this.d = cos * sy; this.tx = tx; this.ty = ty;
  }
  createGradientBox(width: number, height: number, rotation: number = 0, tx: number = 0, ty: number = 0): void {
    this.createBox(width / 1638.4, height / 1638.4, rotation, tx + width / 2, ty + height / 2);
  }
  transformPoint(p: Point): Point { return new Point(this.a * p.x + this.c * p.y + this.tx, this.b * p.x + this.d * p.y + this.ty); }
  deltaTransformPoint(p: Point): Point { return new Point(this.a * p.x + this.c * p.y, this.b * p.x + this.d * p.y); }
  copyFrom(m: Matrix): void { this.a = m.a; this.b = m.b; this.c = m.c; this.d = m.d; this.tx = m.tx; this.ty = m.ty; }
  setTo(a: number, b: number, c: number, d: number, tx: number, ty: number): void { this.a = a; this.b = b; this.c = c; this.d = d; this.tx = tx; this.ty = ty; }
  toString(): string { return `(a=${this.a}, b=${this.b}, c=${this.c}, d=${this.d}, tx=${this.tx}, ty=${this.ty})`; }
}
flashClass(Matrix, "flash.geom.Matrix");

export class ColorTransform extends ASObject {
  declare redMultiplier: number; declare greenMultiplier: number; declare blueMultiplier: number; declare alphaMultiplier: number;
  declare redOffset: number; declare greenOffset: number; declare blueOffset: number; declare alphaOffset: number;
  $ctor(rm = 1, gm = 1, bm = 1, am = 1, ro = 0, go = 0, bo = 0, ao = 0): void {
    super.$ctor();
    this.redMultiplier = +rm; this.greenMultiplier = +gm; this.blueMultiplier = +bm; this.alphaMultiplier = +am;
    this.redOffset = +ro; this.greenOffset = +go; this.blueOffset = +bo; this.alphaOffset = +ao;
  }
  get color(): number { return ((this.redOffset << 16) | (this.greenOffset << 8) | this.blueOffset) >>> 0; }
  set color(v: number) {
    this.redMultiplier = this.greenMultiplier = this.blueMultiplier = 0;
    this.redOffset = (v >> 16) & 255; this.greenOffset = (v >> 8) & 255; this.blueOffset = v & 255;
  }
  concat(s: ColorTransform): void {
    this.redOffset += s.redOffset * this.redMultiplier;
    this.greenOffset += s.greenOffset * this.greenMultiplier;
    this.blueOffset += s.blueOffset * this.blueMultiplier;
    this.alphaOffset += s.alphaOffset * this.alphaMultiplier;
    this.redMultiplier *= s.redMultiplier; this.greenMultiplier *= s.greenMultiplier;
    this.blueMultiplier *= s.blueMultiplier; this.alphaMultiplier *= s.alphaMultiplier;
  }
  clone(): ColorTransform {
    return new ColorTransform(this.redMultiplier, this.greenMultiplier, this.blueMultiplier, this.alphaMultiplier, this.redOffset, this.greenOffset, this.blueOffset, this.alphaOffset);
  }
  /** true when only alpha is scaled (renderable with globalAlpha alone) */
  get $isAlphaOnly(): boolean {
    return this.redMultiplier === 1 && this.greenMultiplier === 1 && this.blueMultiplier === 1 && this.redOffset === 0 && this.greenOffset === 0 && this.blueOffset === 0 && this.alphaOffset === 0;
  }
  toString(): string {
    return `(redMultiplier=${this.redMultiplier}, greenMultiplier=${this.greenMultiplier}, blueMultiplier=${this.blueMultiplier}, alphaMultiplier=${this.alphaMultiplier}, redOffset=${this.redOffset}, greenOffset=${this.greenOffset}, blueOffset=${this.blueOffset}, alphaOffset=${this.alphaOffset})`;
  }
}
flashClass(ColorTransform, "flash.geom.ColorTransform");
